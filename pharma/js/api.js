// ============================================================
//  TERANGA PHARMA — api.js (Frontend)
//  Client API REST — connecte le frontend au backend Node.js
//  Gestion tokens JWT, sync cloud, fallback localStorage
// ============================================================

const API = {
  BASE_URL:    localStorage.getItem('pharma_api_url') || 'http://localhost:3001/api/v1',
  accessToken: null,
  refreshToken: null,

  // ── Initialisation ─────────────────────────────────────────
  init() {
    this.accessToken  = localStorage.getItem('pharma_access_token');
    this.refreshToken = localStorage.getItem('pharma_refresh_token');
    return this;
  },

  // ── Requête HTTP générique ──────────────────────────────────
  async request(method, path, body = null, retry = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;

    try {
      const res = await fetch(this.BASE_URL + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
        signal: AbortSignal.timeout(15000) // 15s timeout
      });

      // Token expiré → refresh auto
      if (res.status === 401 && retry && this.refreshToken) {
        const refreshed = await this._refreshToken();
        if (refreshed) return this.request(method, path, body, false);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data.data;
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'TypeError') {
        // Pas de réseau → mode offline
        console.warn('[API] Hors ligne — utilisation du cache local');
        throw new Error('OFFLINE');
      }
      throw err;
    }
  },

  get:    (path) => API.request('GET', path),
  post:   (path, body) => API.request('POST', path, body),
  put:    (path, body) => API.request('PUT', path, body),
  delete: (path) => API.request('DELETE', path),

  // ── Auth ───────────────────────────────────────────────────
  async login(login, password) {
    const data = await this.request('POST', '/auth/login', { login, password }, false);
    this.accessToken  = data.accessToken;
    this.refreshToken = data.refreshToken;
    localStorage.setItem('pharma_access_token', data.accessToken);
    localStorage.setItem('pharma_refresh_token', data.refreshToken);
    return data.user;
  },

  async logout() {
    try { await this.post('/auth/logout'); } catch(e) {}
    this.accessToken = this.refreshToken = null;
    localStorage.removeItem('pharma_access_token');
    localStorage.removeItem('pharma_refresh_token');
  },

  async _refreshToken() {
    try {
      const data = await this.request('POST', '/auth/refresh', { refresh_token: this.refreshToken }, false);
      this.accessToken = data.accessToken;
      localStorage.setItem('pharma_access_token', data.accessToken);
      return true;
    } catch(e) {
      this.logout();
      return false;
    }
  },

  // ── Médicaments ───────────────────────────────────────────
  medicaments: {
    getAll:    (params='') => API.get('/medicaments' + (params?'?'+params:'')),
    create:    (data) => API.post('/medicaments', data),
    update:    (id, data) => API.put(`/medicaments/${id}`, data),
  },

  // ── Stocks ────────────────────────────────────────────────
  lots: {
    getAll:      (params='') => API.get('/lots' + (params?'?'+params:'')),
    create:      (data) => API.post('/lots', data),
    critiques:   () => API.get('/stocks/critiques'),
    peremptions: () => API.get('/stocks/peremptions'),
  },

  // ── Ventes ────────────────────────────────────────────────
  ventes: {
    getAll:  (params='') => API.get('/ventes' + (params?'?'+params:'')),
    create:  (data) => API.post('/ventes', data),
  },

  // ── Clients ───────────────────────────────────────────────
  clients: {
    getAll:      (params='') => API.get('/clients' + (params?'?'+params:'')),
    create:      (data) => API.post('/clients', data),
    historique:  (id) => API.get(`/clients/${id}/historique`),
    rembourser:  (id, montant) => API.put(`/clients/${id}/rembourser`, { montant }),
  },

  // ── Ordonnances ────────────────────────────────────────────
  ordonnances: {
    getAll: (params='') => API.get('/ordonnances' + (params?'?'+params:'')),
    create: (data) => API.post('/ordonnances', data),
  },

  // ── Rapports ──────────────────────────────────────────────
  rapports: {
    dashboard:  () => API.get('/rapports/dashboard'),
    ca:         (params='') => API.get('/rapports/ca' + (params?'?'+params:'')),
    pertes:     () => API.get('/rapports/pertes'),
  },

  // ── Alertes ────────────────────────────────────────────────
  alertes: {
    getAll: (params='') => API.get('/alertes' + (params?'?'+params:'')),
    lire:   (id) => API.put(`/alertes/${id}/lire`),
  },

  // ── Licence ────────────────────────────────────────────────
  licence: {
    status: () => API.get('/licence/status'),
  },

  // ── Sync Cloud ─────────────────────────────────────────────
  sync: {
    // Envoyer les données locales vers le cloud
    async push() {
      const tables = {};
      ['medicaments','ventes','lignes_vente','clients','lots','ordonnances',
       'commandes_fournisseurs','alertes','pertes'].forEach(t => {
        tables[t] = DB.get(t);
      });
      const result = await API.post('/sync/push', { tables });
      localStorage.setItem('pharma_last_sync', new Date().toISOString());
      return result;
    },

    // Récupérer les données du cloud
    async pull() {
      const lastSync = localStorage.getItem('pharma_last_sync') || '2020-01-01';
      const data = await API.get(`/sync/pull?since=${lastSync}`);
      // Merger les données reçues
      ['medicaments','ventes','clients','lots','alertes'].forEach(table => {
        if (data[table]?.length) {
          const local = DB.get(table);
          const ids   = new Set(local.map(i => i.id));
          const nouveaux = data[table].filter(i => !ids.has(i.id));
          if (nouveaux.length) DB.set(table, [...local, ...nouveaux]);
        }
      });
      localStorage.setItem('pharma_last_sync', data.sync_at || new Date().toISOString());
      return data;
    },

    // Auto-sync toutes les 5 minutes si connecté
    startAutoSync(intervalMs = 5 * 60 * 1000) {
      if (this._syncInterval) clearInterval(this._syncInterval);
      this._syncInterval = setInterval(async () => {
        try {
          await this.pull();
          console.log('[SYNC] Auto-sync réussie');
          // Petit toast discret
          const t = document.createElement('div');
          t.style.cssText = 'position:fixed;bottom:70px;right:20px;background:#0a7a4a;color:#fff;padding:6px 12px;border-radius:6px;font-size:11px;z-index:999;opacity:.85';
          t.textContent = '☁️ Sync cloud OK';
          document.body.appendChild(t);
          setTimeout(() => t.remove(), 2000);
        } catch(e) {
          if (e.message !== 'OFFLINE') console.warn('[SYNC] Échec auto-sync:', e.message);
        }
      }, intervalMs);
      return this._syncInterval;
    },

    stopAutoSync() {
      if (this._syncInterval) { clearInterval(this._syncInterval); this._syncInterval = null; }
    }
  },

  // ── Mode hybride : essayer API, fallback localStorage ──────
  async withFallback(apiCall, localFallback) {
    if (!this.accessToken) return localFallback();
    try {
      return await apiCall();
    } catch(e) {
      if (e.message === 'OFFLINE' || e.message.includes('fetch')) {
        console.info('[API] Offline → fallback localStorage');
        return localFallback();
      }
      throw e;
    }
  },

  // ── Status connexion ───────────────────────────────────────
  isConnected() { return !!this.accessToken; },
  isConfigured() {
    return !!(localStorage.getItem('pharma_api_url') || localStorage.getItem('pharma_access_token'));
  },

  // ── Indicateur connexion cloud ────────────────────────────
  renderStatus() {
    const el = document.getElementById('cloudStatus');
    if (!el) return;
    if (this.isConnected()) {
      el.innerHTML = '<span style="color:#16a34a;font-size:11px">☁️ Cloud connecté</span>';
    } else {
      el.innerHTML = '<span style="color:#94a3b8;font-size:11px">💾 Mode local</span>';
    }
  }
};

// Initialiser au chargement
API.init();
