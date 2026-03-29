const CACHE = 'daily-os-v1';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icon.svg'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ));
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

// Scheduled notification timer IDs
let notifTimers = [];

self.addEventListener('message', e => {
    if (e.data?.type === 'SCHEDULE') {
        scheduleAll();
    }
});

function scheduleAll() {
    notifTimers.forEach(t => clearTimeout(t));
    notifTimers = [];

    const now = new Date();
    const checkTimes = [
        { hour: 7,  min: 0,  label: 'morning' },
        { hour: 16, min: 0,  label: 'afternoon' },
    ];

    checkTimes.forEach(({ hour, min, label }) => {
        let next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, min, 0);
        if (next <= now) next.setDate(next.getDate() + 1);
        const delay = next - now;

        const t = setTimeout(() => {
            showCheckinNotif(label);
            // Reschedule for tomorrow
            const rt = setTimeout(() => showCheckinNotif(label), 24 * 60 * 60 * 1000);
            notifTimers.push(rt);
        }, delay);
        notifTimers.push(t);
    });
}

function showCheckinNotif(type) {
    const opts = {
        morning: {
            title: 'Daily OS — morning check-in',
            body: 'How\'s the mood? Tap to log your morning.',
        },
        afternoon: {
            title: 'Daily OS — afternoon check-in',
            body: '4pm already. How\'s the day going?',
        }
    }[type];

    self.registration.showNotification(opts.title, {
        body: opts.body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: `checkin-${type}`,
        renotify: true,
        data: { url: '/' }
    });
}

self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            if (list.length) return list[0].focus();
            return clients.openWindow('/');
        })
    );
});
