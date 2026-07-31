/* Vidlens service worker — offline shell, smart caching, update flow */
const VERSION = 'v6';
const SHELL = `vidlens-shell-${VERSION}`;
const RUNTIME = `vidlens-runtime-${VERSION}`;

// Everything needed to open the app with no network at all
const SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './about.html',
  './guide.html',
  './use-cases.html',
  './faq.html',
  './roadmap.html',
  './404.html',
  './icon-192.png',
  './icon-512.png',
  './favicon-32.png',
  './apple-touch-icon.png',
  './og-image.png',
  './site.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      // Individually, so one missing file cannot fail the whole install
      .then((cache) => Promise.allSettled(SHELL_FILES.map((f) => cache.add(f))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// The page asks us to take over immediately when the user accepts an update
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

const isShell = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.endsWith('.html') || url.pathname.endsWith('/') ||
   url.pathname.endsWith('.css') || url.pathname.endsWith('.js'));

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never cache media, model weights or API traffic — they are huge or live
  if (/\.(mp4|webm|mov|m4v|ogv|onnx|bin|zip)$/i.test(url.pathname) ||
      url.hostname.includes('huggingface') ||
      url.hostname.includes('jsdelivr') ||
      url.hostname.includes('api.github')) {
    return;
  }

  // App shell: network first so updates land, cache as the offline safety net
  if (isShell(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  // Everything else (icons, fonts): cache first, refresh in the background
  event.respondWith(
    caches.match(request).then((hit) => {
      const fresh = fetch(request)
        .then((response) => {
          if (response.ok && (url.origin === self.location.origin || request.destination === 'font')) {
            const copy = response.clone();
            caches.open(RUNTIME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => hit);
      return hit || fresh;
    })
  );
});

// ---------- release notifications ----------
// No server: the worker polls the public GitHub API itself. Chromium fires
// periodicsync for installed apps; elsewhere the page polls when it opens.
const RELEASES_API = 'https://api.github.com/repos/VideoTag/videotag/commits?per_page=1';

async function checkForNews(reason) {
  try {
    const response = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) return;

    const [latest] = await response.json();
    if (!latest) return;

    const cache = await caches.open(RUNTIME);
    const seen = await cache.match('last-commit');
    const seenSha = seen ? await seen.text() : null;

    if (seenSha === latest.sha) return;
    await cache.put('last-commit', new Response(latest.sha));

    // Do not announce the very first check — that would be noise
    if (!seenSha) return;

    const message = (latest.commit?.message || 'Something new landed').split('\n')[0];
    await self.registration.showNotification('Vidlens just got an update', {
      body: message.slice(0, 140),
      icon: './icon-192.png',
      badge: './favicon-32.png',
      tag: 'vidlens-update',
      data: { url: './', sha: latest.sha, reason },
    });
  } catch {
    // Offline or rate-limited: try again next time
  }
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'vidlens-news') event.waitUntil(checkForNews('periodic'));
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'vidlens-news') event.waitUntil(checkForNews('sync'));
});

// Works too if a real push service is added later
self.addEventListener('push', (event) => {
  let payload = { title: 'Vidlens', body: 'Something new is available.' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {}
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: './icon-192.png',
    badge: './favicon-32.png',
    data: { url: payload.url || './' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.includes(self.location.origin));
      if (open) return open.focus();
      return self.clients.openWindow(target);
    })
  );
});
