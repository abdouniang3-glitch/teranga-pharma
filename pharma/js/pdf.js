// ============================================================
//  TERANGA PHARMA — pdf.js
//  Module PDF : Reçu de vente, Rapport financier, Ordonnance
//  Basé sur window.print() + CSS @print (zéro dépendance)
// ============================================================

const PDF = {

  // ── CSS d'impression commun ─────────────────────────────
  _printStyle: `
    <style>
      @page { size: A4; margin: 18mm 15mm; }
      * { box-sizing: border-box; font-family: Arial, sans-serif; }
      body { background: #fff; color: #000; font-size: 12px; line-height: 1.5; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0a7a4a; padding-bottom: 12px; margin-bottom: 16px; }
      .logo { font-size: 20px; font-weight: 700; color: #0a7a4a; }
      .logo-sub { font-size: 10px; color: #666; margin-top: 2px; }
      .info-box { text-align: right; font-size: 10px; color: #444; }
      .title { font-size: 15px; font-weight: 700; color: #0a7a4a; margin: 0 0 12px; text-transform: uppercase; letter-spacing: .5px; }
      .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 14px; font-size: 11px; }
      .meta-item { display: flex; gap: 5px; }
      .meta-label { font-weight: 700; color: #333; }
      table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11px; }
      th { background: #0a7a4a; color: #fff; padding: 7px 9px; text-align: left; font-weight: 700; }
      td { padding: 6px 9px; border-bottom: 1px solid #eee; }
      tr:nth-child(even) td { background: #f9fafb; }
      .total-row td { font-weight: 700; border-top: 2px solid #0a7a4a; font-size: 13px; }
      .total-row td:last-child { color: #0a7a4a; }
      .footer { border-top: 1px solid #ddd; padding-top: 10px; margin-top: 20px; font-size: 10px; color: #888; text-align: center; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; }
      .badge-success { background: #d1fae5; color: #065f46; }
      .badge-warning { background: #fef3c7; color: #92400e; }
      .badge-danger  { background: #fee2e2; color: #991b1b; }
      .section { margin-top: 18px; }
      .section-title { font-size: 12px; font-weight: 700; color: #0a7a4a; border-bottom: 1px solid #0a7a4a; padding-bottom: 4px; margin-bottom: 10px; }
      .stamp { border: 2px solid #0a7a4a; border-radius: 8px; display: inline-block; padding: 8px 14px; font-size: 14px; font-weight: 700; color: #0a7a4a; transform: rotate(-10deg); margin: 12px 0; }
      @media screen { .print-preview { padding: 20px; background: #f3f4f6; } .doc { background: #fff; max-width: 794px; margin: 0 auto; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,.12); } }
    </style>
  `,

  _open(html, title) {
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${title}</title>${this._printStyle}</head><body><div class="print-preview"><div class="doc">${html}</div></div><script>window.onload=()=>{window.print();}<\/script></body></html>`);
    win.document.close();
  },

  _header(nomPharmacie) {
    const now = new Date().toLocaleString('fr-FR');
    return `<div class="header">
      <div>
        <div class="logo">💊 ${nomPharmacie || 'TERANGA PHARMA'}</div>
        <div class="logo-sub">Pharmacie de quartier — Thiès, Sénégal</div>
        <div class="logo-sub" style="margin-top:2px">Tél: +221 33 000 00 00 | teranga-pharma@pharmacie.sn</div>
      </div>
      <div class="info-box">
        <div>Imprimé le : ${now}</div>
      </div>
    </div>`;
  },

  _footer() {
    return `<div class="footer">TERANGA PHARMA — Système de Gestion Officinale — Tous droits réservés &copy; ${new Date().getFullYear()}</div>`;
  },

  // ── REÇU DE VENTE ────────────────────────────────────────
  recu(venteId) {
    const v = DB.find('ventes', venteId);
    if (!v) { Toast.error('Vente introuvable'); return; }
    const client  = DB.find('clients', v.client_id);
    const lignes  = DB.get('lignes_vente').filter(l => l.vente_id === venteId);
    const vendeur = AccountManager.getAll().find(a => a.id === v.vendeur_id);
    const modeLabels = {especes:'💵 Espèces',wave:'📱 Wave',orange_money:'📱 Orange Money',credit:'💳 Crédit'};

    const lignesHTML = lignes.map(l => {
      const m = DB.find('medicaments', l.medicament_id);
      const lot = DB.find('lots', l.lot_id);
      return `<tr>
        <td>${m ? m.nom_commercial : '—'}</td>
        <td>${m ? m.dci : '—'}</td>
        <td style="text-align:center">${l.quantite}</td>
        <td style="text-align:right">${Fmt.currency(l.prix_unitaire)}</td>
        <td style="text-align:right;font-weight:700">${Fmt.currency(l.montant_ligne)}</td>
      </tr>`;
    }).join('');

    const html = `
      ${this._header()}
      <div class="title">🧾 Reçu de vente N° ${v.ref_vente}</div>
      <div class="meta">
        <div class="meta-item"><span class="meta-label">Date :</span> ${Fmt.dateTime(v.date_vente)}</div>
        <div class="meta-item"><span class="meta-label">Client :</span> ${client ? client.prenom+' '+client.nom : 'Passage anonyme'}</div>
        <div class="meta-item"><span class="meta-label">Mode paiement :</span> ${modeLabels[v.mode_paiement] || v.mode_paiement}</div>
        <div class="meta-item"><span class="meta-label">Vendeur :</span> ${vendeur ? vendeur.nom : '—'}</div>
        ${v.ordonnance_id ? `<div class="meta-item"><span class="meta-label">Ordonnance :</span> ${v.ordonnance_id}</div>` : ''}
        ${client && client.telephone ? `<div class="meta-item"><span class="meta-label">Tél :</span> ${client.telephone}</div>` : ''}
      </div>
      <table>
        <thead><tr><th>Médicament</th><th>DCI</th><th>Qté</th><th>Prix unit.</th><th>Montant</th></tr></thead>
        <tbody>${lignesHTML}</tbody>
        <tfoot>
          ${v.montant_remise ? `<tr><td colspan="4" style="text-align:right;font-style:italic">Remise :</td><td style="text-align:right;color:#c05000">-${Fmt.currency(v.montant_remise)}</td></tr>` : ''}
          <tr class="total-row"><td colspan="4" style="text-align:right">TOTAL À PAYER :</td><td style="text-align:right">${Fmt.currency(v.montant_total)}</td></tr>
        </tfoot>
      </table>
      ${v.mode_paiement === 'credit' ? `<div class="badge badge-warning">💳 Vente à crédit — Montant dû à rembourser</div>` : `<div class="badge badge-success">✅ Payé — ${modeLabels[v.mode_paiement]}</div>`}
      <div style="margin-top:20px;font-size:11px;color:#666;text-align:center">Merci de votre confiance ! Conservez ce reçu pour tout recours.<br>En cas de problème, présentez ce reçu à la pharmacie.</div>
      ${this._footer()}`;
    this._open(html, `Reçu ${v.ref_vente}`);
  },

  // ── ORDONNANCE ARCHIVÉE ──────────────────────────────────
  ordonnance(ordId) {
    const o = DB.find('ordonnances', ordId);
    if (!o) { Toast.error('Ordonnance introuvable'); return; }
    const client = DB.find('clients', o.client_id);
    const lignes = DB.get('lignes_ordonnance').filter(l => l.ordonnance_id === ordId);

    const lignesHTML = lignes.map(l => {
      const m = DB.find('medicaments', l.medicament_id);
      return `<tr>
        <td>${m ? m.nom_commercial : '—'}</td>
        <td>${m ? m.dci : '—'}</td>
        <td style="text-align:center">${l.quantite_prescrite}</td>
        <td>${l.posologie || '—'}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="4" style="text-align:center;color:#888">Médicaments non listés</td></tr>';

    const statutLabel = {en_attente:'⏳ En attente de délivrance',delivree:'✅ Délivrée',expiree:'⏰ Expirée',annulee:'❌ Annulée'};

    const html = `
      ${this._header()}
      <div class="title">📋 Ordonnance Médicale — ${o.ref_ordonnance}</div>
      <div class="meta">
        <div class="meta-item"><span class="meta-label">Patient :</span> ${client ? client.prenom+' '+client.nom : '—'}</div>
        <div class="meta-item"><span class="meta-label">Médecin :</span> Dr ${o.medecin_nom || '—'}</div>
        <div class="meta-item"><span class="meta-label">Spécialité :</span> ${o.medecin_specialite || '—'}</div>
        <div class="meta-item"><span class="meta-label">Date prescription :</span> ${Fmt.date(o.date_prescription)}</div>
        <div class="meta-item"><span class="meta-label">Date délivrance :</span> ${o.date_delivrance ? Fmt.date(o.date_delivrance) : 'Non encore délivrée'}</div>
        <div class="meta-item"><span class="meta-label">Renouvelable :</span> ${o.renouvelable ? `Oui (${o.nb_renouvellements_max} fois max)` : 'Non'}</div>
      </div>
      <div class="section">
        <div class="section-title">Médicaments prescrits</div>
        <table>
          <thead><tr><th>Médicament</th><th>DCI</th><th>Quantité</th><th>Posologie</th></tr></thead>
          <tbody>${lignesHTML}</tbody>
        </table>
      </div>
      ${o.notes ? `<div class="section"><div class="section-title">Notes du médecin</div><p style="font-style:italic;color:#444">${o.notes}</p></div>` : ''}
      <div style="margin-top:20px;display:flex;justify-content:space-between;align-items:center">
        <div><span class="badge ${o.statut==='delivree'?'badge-success':o.statut==='en_attente'?'badge-warning':'badge-danger'}">${statutLabel[o.statut]||o.statut}</span></div>
        ${o.statut==='delivree'?'<div class="stamp">DÉLIVRÉE</div>':''}
      </div>
      ${this._footer()}`;
    this._open(html, `Ordonnance ${o.ref_ordonnance}`);
  },

  // ── RAPPORT FINANCIER ────────────────────────────────────
  rapportFinancier(periode) {
    const ventes  = DB.get('ventes').filter(v => v.statut === 'completee');
    const pertes  = DB.get('pertes');
    const clients = DB.get('clients');
    const lignes  = DB.get('lignes_vente');
    const meds    = DB.get('medicaments');
    const now = new Date();

    // Filtre période
    let ventesFiltered = ventes;
    let labelPeriode = 'Toute période';
    if (periode === 'month') {
      const m = now.toISOString().slice(0,7);
      ventesFiltered = ventes.filter(v => v.date_vente && v.date_vente.startsWith(m));
      labelPeriode = `Mois de ${now.toLocaleString('fr-FR',{month:'long',year:'numeric'})}`;
    } else if (periode === 'week') {
      const weekAgo = new Date(now - 7*86400000).toISOString();
      ventesFiltered = ventes.filter(v => v.date_vente >= weekAgo);
      labelPeriode = '7 derniers jours';
    }

    const totalCA = ventesFiltered.reduce((s,v) => s+v.montant_total, 0);
    const totalRemises = ventesFiltered.reduce((s,v) => s+(v.montant_remise||0), 0);
    const totalPertes = pertes.reduce((s,p) => s+(p.valeur_perdue||0), 0);
    const totalCredits = clients.reduce((s,c) => s+(c.solde_credit||0), 0);

    // Marge estimée
    let margeEstimee = 0;
    ventesFiltered.forEach(v => {
      const lv = lignes.filter(l => l.vente_id === v.id);
      lv.forEach(l => {
        const m = meds.find(x => x.id === l.medicament_id);
        if(m) margeEstimee += (l.prix_unitaire - m.prix_achat) * l.quantite;
      });
    });

    // Top 5 médicaments
    const medCount = {};
    lignes.filter(l => ventesFiltered.some(v => v.id === l.vente_id)).forEach(l => {
      medCount[l.medicament_id] = (medCount[l.medicament_id]||0) + l.montant_ligne;
    });
    const top5 = Object.entries(medCount).sort((a,b)=>b[1]-a[1]).slice(0,5);

    const top5HTML = top5.map(([id, ca]) => {
      const m = meds.find(x => x.id === id);
      return `<tr><td>${m?m.nom_commercial:'—'}</td><td style="text-align:right;font-weight:700;color:#0a7a4a">${Fmt.currency(ca)}</td></tr>`;
    }).join('') || '<tr><td colspan="2" style="text-align:center;color:#888">Aucune donnée</td></tr>';

    // Ventes par mode
    const modes = {especes:'💵 Espèces',wave:'📱 Wave',orange_money:'📱 Orange Money',credit:'💳 Crédit'};
    const modesHTML = Object.entries(modes).map(([k,l]) => {
      const v = ventesFiltered.filter(v => v.mode_paiement===k).reduce((s,v)=>s+v.montant_total,0);
      const n = ventesFiltered.filter(v => v.mode_paiement===k).length;
      return `<tr><td>${l}</td><td style="text-align:center">${n}</td><td style="text-align:right;font-weight:700">${Fmt.currency(v)}</td></tr>`;
    }).join('');

    const html = `
      ${this._header()}
      <div class="title">📊 Rapport Financier — ${labelPeriode}</div>
      <div class="section">
        <div class="section-title">Indicateurs clés</div>
        <table>
          <tbody>
            <tr><td style="font-weight:700">Chiffre d'affaires</td><td style="text-align:right;font-size:15px;font-weight:700;color:#0a7a4a">${Fmt.currency(totalCA)}</td></tr>
            <tr><td>Marge brute estimée</td><td style="text-align:right;color:#1565c0;font-weight:700">${Fmt.currency(margeEstimee)}</td></tr>
            <tr><td>Total remises accordées</td><td style="text-align:right;color:#c05000">${Fmt.currency(totalRemises)}</td></tr>
            <tr><td>Pertes (périmés / casse)</td><td style="text-align:right;color:#dc2626">${Fmt.currency(totalPertes)}</td></tr>
            <tr><td>Crédits clients en cours</td><td style="text-align:right;color:#b45309">${Fmt.currency(totalCredits)}</td></tr>
            <tr class="total-row"><td>Résultat net estimé</td><td style="text-align:right">${Fmt.currency(margeEstimee - totalPertes)}</td></tr>
          </tbody>
        </table>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:16px">
        <div class="section">
          <div class="section-title">Top 5 médicaments (CA)</div>
          <table><thead><tr><th>Médicament</th><th>CA</th></tr></thead><tbody>${top5HTML}</tbody></table>
        </div>
        <div class="section">
          <div class="section-title">Ventes par mode de paiement</div>
          <table><thead><tr><th>Mode</th><th>Nbre</th><th>Montant</th></tr></thead><tbody>${modesHTML}</tbody></table>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Récapitulatif</div>
        <p style="font-size:11px;color:#555">Rapport généré le ${new Date().toLocaleString('fr-FR')} — Nombre de ventes analysées : ${ventesFiltered.length}</p>
      </div>
      ${this._footer()}`;
    this._open(html, `Rapport Financier — ${labelPeriode}`);
  },

  // ── INVENTAIRE STOCK ─────────────────────────────────────
  inventaireStock() {
    const meds = DB.get('medicaments');
    const lots  = DB.get('lots');
    const classes = DB.get('classes');
    const valeurTotale = lots.filter(l=>l.statut==='actif').reduce((s,l)=>s+l.quantite_disponible*(l.prix_achat||0),0);

    const rowsHTML = meds.map(m => {
      const stock = getStockTotal(m.id);
      const fefo  = getLotFEFO(m.id);
      const cls   = classes.find(c => c.id === m.classe_id);
      const alerte = stock <= m.seuil_min ? '⚠️' : '✅';
      const valeur = lots.filter(l=>l.medicament_id===m.id&&l.statut==='actif').reduce((s,l)=>s+l.quantite_disponible*(l.prix_achat||0),0);
      return `<tr>
        <td>${m.nom_commercial}</td>
        <td>${m.dci}</td>
        <td style="font-size:10px">${cls?cls.nom:'—'}</td>
        <td style="text-align:center;font-weight:700;color:${stock<=m.seuil_min?'#dc2626':'#065f46'}">${stock}</td>
        <td style="text-align:center">${m.seuil_min}</td>
        <td style="font-size:10px">${fefo?Fmt.date(fefo.date_peremption):'—'}</td>
        <td style="text-align:right;font-size:10px">${Fmt.currency(valeur)}</td>
        <td style="text-align:center">${alerte}</td>
      </tr>`;
    }).join('');

    const html = `
      ${this._header()}
      <div class="title">📦 Inventaire des stocks — ${new Date().toLocaleDateString('fr-FR')}</div>
      <div class="meta">
        <div class="meta-item"><span class="meta-label">Total médicaments :</span> ${meds.length}</div>
        <div class="meta-item"><span class="meta-label">Valeur stock totale :</span> ${Fmt.currency(valeurTotale)}</div>
        <div class="meta-item"><span class="meta-label">Ruptures :</span> ${meds.filter(m=>getStockTotal(m.id)===0).length}</div>
        <div class="meta-item"><span class="meta-label">Stocks critiques :</span> ${meds.filter(m=>getStockTotal(m.id)<=m.seuil_min&&getStockTotal(m.id)>0).length}</div>
      </div>
      <table>
        <thead><tr><th>Médicament</th><th>DCI</th><th>Classe</th><th>Stock</th><th>Seuil</th><th>Péremption FEFO</th><th>Valeur stock</th><th>État</th></tr></thead>
        <tbody>${rowsHTML}</tbody>
        <tfoot><tr class="total-row"><td colspan="6">TOTAL VALEUR STOCK</td><td style="text-align:right">${Fmt.currency(valeurTotale)}</td><td></td></tr></tfoot>
      </table>
      ${this._footer()}`;
    this._open(html, 'Inventaire Stock');
  }
};
