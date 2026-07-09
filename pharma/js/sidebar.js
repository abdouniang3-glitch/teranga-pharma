// ============================================================
//  TERANGA PHARMA — sidebar.js
// ============================================================
const Sidebar = {
  ROLE_NAVS: {
    pharmacien: [
      { href:'dashboard.html',    icon:'🏠', label:'Tableau de bord' },
      { href:'medicaments.html',  icon:'💊', label:'Catalogue médicaments' },
      { href:'stocks.html',       icon:'📦', label:'Stocks & Lots' },
      { href:'ventes.html',       icon:'🧾', label:'Ventes' },
      { href:'ordonnances.html',  icon:'📋', label:'Ordonnances' },
      { href:'clients.html',      icon:'👥', label:'Clients' },
      { href:'rapports.html',     icon:'📊', label:'Rapports financiers' },
      { href:'alertes.html',      icon:'🔔', label:'Alertes', badge:'alertes' },
      { href:'tiers-payant.html', icon:'🏥', label:'Tiers payant' },
      { href:'parametres.html',   icon:'⚙️', label:'Paramètres' },
    ],
    assistant: [
      { href:'dashboard.html',    icon:'🏠', label:'Mon espace' },
      { href:'ventes.html',       icon:'🧾', label:'Nouvelle vente' },
      { href:'ordonnances.html',  icon:'📋', label:'Ordonnances' },
      { href:'medicaments.html',  icon:'💊', label:'Catalogue' },
      { href:'clients.html',      icon:'👥', label:'Clients' },
    ],
    preparateur: [
      { href:'dashboard.html',    icon:'🏠', label:'Mon espace' },
      { href:'ventes.html',       icon:'🧾', label:'Ventes au comptoir' },
      { href:'stocks.html',       icon:'📦', label:'Stocks' },
      { href:'medicaments.html',  icon:'💊', label:'Catalogue' },
    ],
    caissier: [
      { href:'dashboard.html',    icon:'🏠', label:'Mon espace' },
      { href:'encaissement.html', icon:'💵', label:'Encaissement' },
      { href:'credits.html',      icon:'💳', label:'Crédits clients' },
      { href:'recus.html',        icon:'🧾', label:'Reçus & Factures' },
    ],
    resp_stock: [
      { href:'dashboard.html',    icon:'🏠', label:'Mon espace' },
      { href:'stocks.html',       icon:'📦', label:'Gestion des stocks' },
      { href:'lots.html',         icon:'🗂️', label:'Lots & Péremptions' },
      { href:'commandes.html',    icon:'📦', label:'Commandes fournisseurs' },
      { href:'fournisseurs.html', icon:'🏭', label:'Fournisseurs' },
      { href:'pertes.html',       icon:'📉', label:'Pertes & Retours' },
      { href:'alertes.html',      icon:'🔔', label:'Alertes', badge:'alertes' },
    ],
    client: [
      { href:'dashboard.html',    icon:'🏠', label:'Mon compte' },
      { href:'historique.html',   icon:'📜', label:'Historique achats' },
      { href:'ordonnances.html',  icon:'📋', label:'Mes ordonnances' },
      { href:'credit.html',       icon:'💳', label:'Mon crédit' },
    ],
    fournisseur: [
      { href:'dashboard.html',    icon:'🏠', label:'Mon espace' },
      { href:'commandes.html',    icon:'📦', label:'Commandes reçues' },
      { href:'livraisons.html',   icon:'🚚', label:'Livraisons' },
      { href:'litiges.html',      icon:'⚠️', label:'Litiges' },
    ],
  },
  ROLE_COLORS: {
    pharmacien:'#0a7a4a', assistant:'#1a5c30', preparateur:'#1565c0',
    caissier:'#7a3000', resp_stock:'#5c1a90', client:'#0a6060', fournisseur:'#2a5080',
  },
  ROLE_LABELS: {
    pharmacien:'Pharmacien Titulaire', assistant:'Pharmacien Assistant',
    preparateur:'Préparateur', caissier:'Caissier',
    resp_stock:'Responsable Stock', client:'Client', fournisseur:'Fournisseur',
  },

  render(containerId) {
    const user = Auth.getUser(); if (!user) return;
    const container = document.getElementById(containerId); if (!container) return;
    const nav = this.ROLE_NAVS[user.role] || [];
    const color = this.ROLE_COLORS[user.role] || 'var(--primary)';
    const nbAlertes = DB.get('alertes').filter(a => a.dest_role === user.role && !a.lu).length;
    container.innerHTML = `
      <div class="sidebar-logo">
        <div class="logo-icon">💊</div>
        <div class="logo-text"><strong>TERANGA PHARMA</strong><span>Pharmacie de quartier</span></div>
      </div>
      <div class="sidebar-user">
        <div style="display:flex;align-items:center;gap:9px">
          <div class="s-avatar" style="background:${color}">${Fmt.initials(user.nom)}</div>
          <div><div class="s-name">${user.nom}</div><div class="s-role">${this.ROLE_LABELS[user.role]||user.role}</div></div>
        </div>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-section-title">Navigation</div>
        ${nav.map(item=>{
          const hasBadge = item.badge==='alertes' && nbAlertes>0;
          return `<a href="${item.href}"><span>${item.icon}</span> ${item.label}${hasBadge?`<span class="nav-badge">${nbAlertes}</span>`:''}`;
        }).join('</a>')}
        </a>
        <div class="nav-section-title">Général</div>
        <a href="../tracabilite.html"><span>🔍</span> Traçabilité</a>
      </nav>
      <div class="sidebar-footer">
        <a href="../change-password.html"><span>🔑</span> Changer mot de passe</a>
        <a href="#" onclick="event.preventDefault();Auth.logout()"><span>🚪</span> Déconnexion</a>
      </div>`;
    setActiveNav();
  }
};
