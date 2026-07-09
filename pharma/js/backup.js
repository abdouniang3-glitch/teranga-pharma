// ============================================================
//  TERANGA PHARMA — backup.js
//  Module sauvegarde : Export JSON, Import JSON, Auto-backup
//  Phase 1 commerciale — protection données pharmacien
// ============================================================

const Backup = {
  VERSION: '1.0',
  TABLES: ['medicaments','classes','lots','ventes','lignes_vente','ordonnances',
           'lignes_ordonnance','clients','fournisseurs','commandes_fournisseurs',
           'lignes_commande','alertes','pertes','audit_logs'],

  // ── Export complet en JSON ──────────────────────────────
  exportJSON() {
    const data = {
      version: this.VERSION,
      app: 'TERANGA PHARMA',
      date: new Date().toISOString(),
      pharmacie: localStorage.getItem('pharma_nom') || 'TERANGA PHARMA',
      tables: {}
    };
    this.TABLES.forEach(t => { data.tables[t] = DB.get(t); });
    data.accounts = JSON.parse(localStorage.getItem('pharma_accounts') || '[]')
      .map(a => ({...a, password: '***'})); // Ne pas exporter les mots de passe
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], {type: 'application/json'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href     = url;
    a.download = `teranga-pharma-backup-${date}.json`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    // Enregistrer la date du dernier backup
    localStorage.setItem('pharma_last_backup', new Date().toISOString());
    Toast.success('✅ Sauvegarde exportée avec succès !');
    DB.push('audit_logs', {user_id: Auth.getUser()?.id, action:'export_backup', entite:'system', details:`Backup exporté — ${this.TABLES.length} tables`});
  },

  // ── Import JSON ────────────────────────────────────────
  importJSON(file, onSuccess) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.tables || !data.version) {
          Toast.error('❌ Fichier invalide — pas un backup TERANGA PHARMA');
          return;
        }
        // Confirmation avant écrasement
        const nb = Object.values(data.tables).reduce((s,t) => s + t.length, 0);
        if (!confirm(`⚠️ Importer ce backup ?\n\nDate : ${new Date(data.date).toLocaleString('fr-FR')}\nPharmacie : ${data.pharmacie}\nEnregistrements : ${nb}\n\nAttention : ceci écrasera toutes les données actuelles.`)) return;

        // Restaurer toutes les tables
        Object.entries(data.tables).forEach(([table, rows]) => {
          DB.set(table, rows);
        });
        Toast.success(`✅ Backup restauré ! ${nb} enregistrements importés.`);
        DB.push('audit_logs', {user_id: Auth.getUser()?.id, action:'import_backup', entite:'system', details:`Backup restauré — ${nb} enregistrements — Source: ${data.pharmacie}`});
        if (typeof onSuccess === 'function') setTimeout(onSuccess, 1000);
        else setTimeout(() => window.location.reload(), 1500);
      } catch(err) {
        Toast.error('❌ Erreur de lecture du fichier JSON : ' + err.message);
      }
    };
    reader.readAsText(file);
  },

  // ── Export CSV ventes ──────────────────────────────────
  exportCSV(table, filename) {
    const rows = DB.get(table);
    if (!rows.length) { Toast.warning('Aucune donnée à exporter'); return; }
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(';'),
      ...rows.map(r => headers.map(h => {
        const v = r[h] ?? '';
        const s = String(v).replace(/"/g, '""');
        return s.includes(';') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
      }).join(';'))
    ].join('\n');
    const blob = new Blob(['\ufeff' + csv], {type: 'text/csv;charset=utf-8'}); // BOM pour Excel
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename || `${table}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    Toast.success(`✅ CSV exporté : ${rows.length} lignes`);
  },

  // ── Auto-backup (rappel si > 7 jours) ─────────────────
  checkBackupReminder() {
    const last = localStorage.getItem('pharma_last_backup');
    if (!last) {
      // Jamais sauvegardé
      this._showReminder('⚠️ Vous n\'avez jamais effectué de sauvegarde. Exportez vos données maintenant !', 'danger');
      return;
    }
    const days = Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
    if (days >= 7) this._showReminder(`⚠️ Dernière sauvegarde : il y a ${days} jours. Pensez à exporter vos données !`, 'warning');
  },

  _showReminder(msg, type) {
    const el = document.getElementById('backup-reminder');
    if (!el) return;
    el.innerHTML = `<div class="alert alert-${type}" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between" onclick="Backup.exportJSON()">
      <span>${msg}</span>
      <button class="btn btn-outline btn-sm">💾 Sauvegarder maintenant</button>
    </div>`;
  },

  // ── Statistiques backup ─────────────────────────────
  stats() {
    const last = localStorage.getItem('pharma_last_backup');
    const totalEntries = this.TABLES.reduce((s,t) => s + DB.get(t).length, 0);
    return {
      dernierBackup: last ? new Date(last).toLocaleString('fr-FR') : 'Jamais',
      joursDepuisBackup: last ? Math.floor((Date.now()-new Date(last).getTime())/86400000) : null,
      totalEnregistrements: totalEntries,
      tablesCouverts: this.TABLES.length
    };
  }
};
