// ============================================================
//  TERANGA PHARMA — sw.js (Service Worker)
//  PWA : Cache offline, mise à jour en arrière-plan
//  L'application fonctionne SANS connexion internet
// ============================================================

const CACHE_NAME    = 'teranga-pharma-v10';
const CACHE_STATIC  = 'teranga-static-v10';
const CACHE_DYNAMIC = 'teranga-dynamic-v10';

// Fichiers à mettre en cache immédiatement (app shell)
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/sidebar.js',
  './js/backup.js',
  './js/pdf.js',
  './js/scanner.js',
  './js/tiers-payant.js',
  './js/wolof.js',
  // Pages pharmacien
  './pages/pharmacien/dashboard.html',
  './pages/pharmacien/medicaments.html',
  './pages/pharmacien/stocks.html',
  './pages/pharmacien/ventes.html',
  './pages/pharmacien/ordonnances.html',
  './pages/pharmacien/clients.html',
  './pages/pharmacien/rapports.html',
  './pages/pharmacien/alertes.html',
  './pages/pharmacien/tiers-payant.html',
  './pages/pharmacien/parametres.html',
  // Pages assistant
  './pages/assistant/dashboard.html',
  './pages/assistant/ventes.html',
  './pages/assistant/ordonnances.html',
  './pages/assistant/medicaments.html',
  // Pages préparateur
  './pages/preparateur/dashboard.html',
  './pages/preparateur/ventes.html',
  './pages/preparateur/stocks.html',
  // Pages caissier
  './pages/caissier/dashboard.html',
  './pages/caissier/encaissement.html',
  './pages/caissier/credits.html',
  './pages/caissier/recus.html',
  // Pages responsable stock
  './pages/resp-stock/dashboard.html',
  './pages/resp-stock/stocks.html',
  './pages/resp-stock/lots.html',
  './pages/resp-stock/commandes.html',
  './pages/resp-stock/fournisseurs.html',
  './pages/resp-stock/pertes.html',
  './pages/resp-stock/alertes.html',
  // Pages communes
  './pages/tracabilite.html',
  './pages/change-password.html',
  // Google Fonts (optionnel — peut échouer offline)
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap',
];

// ── Installation ──────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installation TERANGA PHARMA PWA...');
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => {
      // Mettre en cache tous les fichiers, ignorer les erreurs réseau
      return Promise.allSettled(
        PRECACHE.map(url => cache.add(url).catch(err => {
          console.warn('[SW] Impossible de mettre en cache:', url, err.message);
        }))
      );
    }).then(() => {
      console.log('[SW] ✅ App shell mis en cache');
      self.skipWaiting(); // Activer immédiatement
    })
  );
});

// ── Activation ────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activation...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_STATIC && k !== CACHE_DYNAMIC)
            .map(k => { console.log('[SW] Suppression ancien cache:', k); return caches.delete(k); })
      );
    }).then(() => {
      console.log('[SW] ✅ Caches anciens nettoyés');
      return self.clients.claim();
    })
  );
});

// ── Stratégie de cache : Cache First pour assets, Network First pour HTML ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ne pas intercepter les requêtes Chrome extensions ni analytics
  if (!url.protocol.startsWith('http')) return;
  if (url.hostname === 'www.google-analytics.com') return;

  // Stratégie selon le type de ressource
  if (event.request.method !== 'GET') return;

  const isHTML   = event.request.headers.get('Accept')?.includes('text/html');
  const isCSSJS  = url.pathname.match(/\.(css|js)$/);
  const isFont   = url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com');

  if (isCSSJS || isFont) {
    // Cache First pour CSS/JS/polices
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_STATIC).then(c => c.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
  } else {
    // Network First pour HTML (pages) avec fallback cache
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_DYNAMIC).then(c => c.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Pas de réseau → servir depuis le cache
          return caches.match(event.request).then(cached => {
            if (cached) return cached;
            // Fallback vers index.html
            return caches.match('./index.html');
          });
        })
    );
  }
});

// ── Message de mise à jour ────────────────────────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
