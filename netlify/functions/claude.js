const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS_LIMIT = 2000;

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

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

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
            body: JSON.stringify({ error: 'messages array is required' }),
        };
    }

    if (!body.system || typeof body.system !== 'string') {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
            body: JSON.stringify({ error: 'system prompt is required' }),
        };
    }

    // Validate each message: content must be string or array of valid blocks
    for (const msg of body.messages) {
        if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
                body: JSON.stringify({ error: 'Invalid message role' }),
            };
        }
        if (typeof msg.content !== 'string' && !Array.isArray(msg.content)) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
                body: JSON.stringify({ error: 'Message content must be string or array' }),
            };
        }
    }

    const maxTokens = Math.min(
        parseInt(body.max_tokens) || 300,
        MAX_TOKENS_LIMIT
    );

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
                max_tokens: maxTokens,
                system: body.system,
                messages: body.messages,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Anthropic API error:', response.status, errorText);
            return {
                statusCode: response.status === 429 ? 429 : 502,
                headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
                body: JSON.stringify({
                    error: response.status === 429
                        ? 'Rate limit reached — try again in a moment'
                        : 'Upstream API error',
                }),
            };
        }

        const data = await response.json();
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
            body: JSON.stringify(data),
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
