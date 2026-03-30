const MODEL = 'claude-sonnet-4-20250514';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

const ALLOWED_MEDIA_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
]);

const EXTRACTION_SYSTEM = `You are a medical data extraction assistant. Extract structured clinical information from uploaded medical documents (blood tests, pathology reports, radiology reports, psychiatric assessments, GP letters, etc.).

Return ONLY valid JSON — no preamble, no markdown fences, no explanation. The JSON must match this exact structure:

{
  "doc_type": "blood_test | psych_assessment | radiology | gp_letter | other",
  "doc_date": "YYYY-MM-DD or null",
  "doc_title": "Short descriptive title e.g. Full Blood Count Dec 2025",
  "medications": [
    { "name": "Drug name", "dose": "e.g. 40mg", "purpose": "what it's for" }
  ],
  "diagnoses": [
    "Full diagnosis string e.g. ADHD combined type (moderate)"
  ],
  "blood_results": [
    {
      "test": "Test name",
      "value": "Result value as string",
      "unit": "Unit string",
      "range": "Reference range as string",
      "flag": "normal | low | high | borderline | absent",
      "note": "Brief clinical note if flagged, else null"
    }
  ],
  "other_findings": [
    "Plain English finding string"
  ],
  "flagged_summary": [
    "Plain English summary of anything outside normal range or clinically notable"
  ]
}

Rules:
- Include ALL blood results found, not just abnormal ones
- For flag: use "low" if marked L or below range, "high" if marked H or above range, "borderline" if inconclusive, "absent" if the condition/organism was not found (e.g. no growth), "normal" otherwise
- flagged_summary should only include genuinely notable items — abnormals, borderlines, things worth watching
- If a field has no data, use an empty array []
- For doc_date, use the collection date if available, assessment date otherwise
- Strip patient identifiers from other_findings and flagged_summary (no names, addresses, DOBs)
- Be concise — this data will be stored and injected into AI prompts`;

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    if (!process.env.ANTHROPIC_API_KEY) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
            body: JSON.stringify({ error: 'Server configuration error' }),
        };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
            body: JSON.stringify({ error: 'Invalid JSON body' }),
        };
    }

    const { pdf_base64, media_type, filename } = body;

    if (!pdf_base64 || !media_type) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
            body: JSON.stringify({ error: 'pdf_base64 and media_type are required' }),
        };
    }

    // Validate media_type to prevent API errors and unexpected behaviour
    if (!ALLOWED_MEDIA_TYPES.has(media_type)) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
            body: JSON.stringify({ error: 'Unsupported file type. Please upload a PDF.' }),
        };
    }

    // Rough size check — base64 is ~1.33x raw size. 6MB raw ≈ 8MB base64.
    if (pdf_base64.length > 8_000_000) {
        return {
            statusCode: 413,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
            body: JSON.stringify({ error: 'File too large — maximum 6MB. For large assessments, try splitting into sections.' }),
        };
    }

    // Sanitise filename for use in prompt — strip everything except safe chars
    const safeFilename = filename
        ? filename.replace(/[^a-zA-Z0-9._\- ()]/g, '').slice(0, 100)
        : '';

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: MODEL,
                max_tokens: 2000,
                system: EXTRACTION_SYSTEM,
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'document',
                            source: {
                                type: 'base64',
                                media_type: media_type,
                                data: pdf_base64,
                            },
                        },
                        {
                            type: 'text',
                            text: `Extract all medical information from this document${safeFilename ? ` (${safeFilename})` : ''} and return as JSON only.`,
                        },
                    ],
                }],
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Anthropic API error:', response.status, errText);
            return {
                statusCode: response.status === 429 ? 429 : 502,
                headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
                body: JSON.stringify({
                    error: response.status === 429
                        ? 'Rate limit — try again in a moment'
                        : 'Could not process document — try again',
                }),
            };
        }

        const data = await response.json();
        const raw = data.content?.[0]?.text || '';
        const clean = raw.replace(/```json|```/g, '').trim();

        let parsed;
        try {
            parsed = JSON.parse(clean);
        } catch {
            console.error('JSON parse failed:', clean.slice(0, 200));
            return {
                statusCode: 422,
                headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
                body: JSON.stringify({ error: 'Could not parse extracted data — document may be scanned/image-based' }),
            };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
            body: JSON.stringify({ extracted: parsed, filename: safeFilename || 'document' }),
        };

    } catch (err) {
        console.error('Function error:', err);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
