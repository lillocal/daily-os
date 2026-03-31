// Bump this version on every deploy to force cache refresh
const CACHE_VERSION = 'daily-os-v9';
const STATIC_ASSETS = ['/manifest.json', '/icon.svg'];

// ── Install: pre-cache static assets only (not index.html) ──────────────
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    // Activate immediately — don't wait for old tabs to close
    self.skipWaiting();
});

// ── Activate: remove old cache versions ─────────────────────────────────
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((k) => k !== CACHE_VERSION)
                    .map((k) => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// ── Fetch: network-first for HTML, cache-first for static assets ─────────
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // Always go network-first for the app shell so updates deploy instantly
    if (url.pathname === '/' || url.pathname === '/index.html') {
        e.respondWith(
            fetch(e.request)
                .then((res) => {
                    // Update the cache with the fresh response
                    const clone = res.clone();
                    caches.open(CACHE_VERSION).then((cache) =>
                        cache.put(e.request, clone)
                    );
                    return res;
                })
                .catch(() => caches.match(e.request)) // offline fallback
        );
        return;
    }

    // Never intercept Netlify function calls — they must hit the network
    if (url.pathname.startsWith('/.netlify/')) {
        e.respondWith(fetch(e.request));
        return;
    }

    // Cache-first for everything else (fonts, CDN scripts, icons)
    e.respondWith(
        caches.match(e.request).then((cached) => cached || fetch(e.request))
    );
});

// ── Push notifications ───────────────────────────────────────────────────
let notifTimers = [];

self.addEventListener('message', (e) => {
    if (e.data?.type === 'SCHEDULE') {
        scheduleAll();
    }
    if (e.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

function scheduleAll() {
    // Clear any existing timers
    notifTimers.forEach((t) => clearTimeout(t));
    notifTimers = [];

    const checkTimes = [
        { hour: 7,  min: 0,  label: 'morning' },
        { hour: 16, min: 0,  label: 'afternoon' },
    ];

    checkTimes.forEach(({ hour, min, label }) => {
        const now = new Date();
        let next = new Date(
            now.getFullYear(), now.getMonth(), now.getDate(), hour, min, 0
        );
        if (next <= now) next.setDate(next.getDate() + 1);
        const delay = next - now;

        const schedule = (d, lbl) => {
            const t = setTimeout(() => {
                showCheckinNotif(lbl);
                // Reschedule for same time next day
                schedule(24 * 60 * 60 * 1000, lbl);
            }, d);
            notifTimers.push(t);
        };

        schedule(delay, label);
    });
}

function showCheckinNotif(type) {
    const opts = {
        morning: {
            title: 'Daily OS — morning check-in',
            body: "How's the mood? Tap to log your morning.",
        },
        afternoon: {
            title: 'Daily OS — afternoon check-in',
            body: "4pm already. How's the day going?",
        },
    }[type];

    if (!opts) return;

    self.registration.showNotification(opts.title, {
        body: opts.body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: `checkin-${type}`,
        renotify: true,
        data: { url: '/' },
    });
}

self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    e.waitUntil(
        clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((list) => {
                if (list.length) return list[0].focus();
                return clients.openWindow('/');
            })
    );
});
