/* ═══════════════════════════════════════════
   GLM Universe — Service Worker
   Incrementa CACHE_VERSION a cada deploy.
   ═══════════════════════════════════════════ */

const CACHE_VERSION = 'glm-v20250610-001'; // ← Altere a cada deploy
const CACHE_NAME = CACHE_VERSION;

// Assets que queremos pré-cachear (estáticos)
const PRECACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/js/main.js',
  '/firebase-config.js',
];

// ── Install: pré-cache dos assets essenciais ──────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()) // Ativa imediatamente sem esperar
  );
});

// ── Activate: remove caches velhos ───────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // Toma controle de todas as abas
  );
});

// ── Fetch: Network First para HTML/JS/CSS, Cache First para imagens ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignora requests externos (Firebase, Cloudinary, etc.)
  if (url.origin !== location.origin) return;

  // Para HTML, JS e CSS: sempre busca na rede primeiro
  const isAppShell = /\.(html|js|css)(\?.*)?$/.test(url.pathname) || url.pathname === '/';

  if (isAppShell) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Atualiza o cache com a versão mais nova
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request)) // Fallback para cache se offline
    );
  } else {
    // Para imagens/vídeos/outros: cache first
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});

// ── Mensagem de forçar atualização ────────────────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
