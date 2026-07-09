// ============================================================
//  TERANGA PHARMA — sms.js
//  Module Notifications : Push, SMS Wave/Orange, WhatsApp
//  Phase 2 — rappels clients, alertes fournisseurs
// ============================================================

const SMS = {

  // ── Configuration API SMS ─────────────────────────────────
  // Supporte : Wave API, Orange SMS API, Infobip, Twilio
  getConfig() {
    return JSON.parse(localStorage.getItem('pharma_sms_config') || '{}');
  },

  saveConfig(cfg) {
    localStorage.setItem('pharma_sms_config', JSON.stringify(cfg));
  },

  isConfigured() {
    const cfg = this.getConfig();
    return !!(cfg.provider && cfg.api_key);
  },

  // ── Templates de messages ─────────────────────────────────
  TEMPLATES: {
    credit_rappel: {
      fr: (nom, montant, pharmacie) =>
        `Bonjour ${nom}, vous avez un crédit de ${montant} FCFA en cours à ${pharmacie}. Merci de régulariser votre situation. Pour info: +221 33 000 00 00`,
      wo: (nom, montant, pharmacie) =>
        `Bonjour ${nom}, crédit bi ngi ci ${pharmacie}: ${montant} FCFA. Dëgg na ci kanam. +221 33 000 00 00`
    },
    ordonnance_prete: {
      fr: (nom, med, pharmacie) =>
        `Bonjour ${nom}, votre médicament "${med}" est disponible à ${pharmacie}. Venez le récupérer sur présentation de votre ordonnance.`,
      wo: (nom, med, pharmacie) =>
        `Bonjour ${nom}, dawa bi "${med}" amna ci ${pharmacie}. Ñëw ak papiye bi.`
    },
    commande_livree: {
      fr: (ref, fournisseur) =>
        `TERANGA PHARMA: Commande ${ref} a été enregistrée comme livrée. Merci ${fournisseur}.`,
      wo: (ref, fournisseur) =>
        `TERANGA PHARMA: Comande ${ref} jox na. Jërejëf ${fournisseur}.`
    },
    stock_critique: {
      fr: (med, stock, seuil) =>
        `[ALERTE STOCK] ${med} — Stock: ${stock} unités (seuil: ${seuil}). Commande à passer rapidement.`,
      wo: (med, stock, seuil) =>
        `[ALERTE] ${med} — Stok: ${stock} (seuil: ${seuil}). Comande ci kaw!`
    }
  },

  // ── Envoyer un SMS via l'API configurée ──────────────────
  async send(telephone, message, options = {}) {
    const cfg = this.getConfig();

    // Simuler l'envoi si pas configuré (mode démo)
    if (!this.isConfigured() || cfg.mode === 'demo') {
      return this._simulerEnvoi(telephone, message, options);
    }

    // Normaliser le numéro sénégalais
    const tel = this._normaliserNumero(telephone);
    if (!tel) {
      Toast.error(`Numéro invalide: ${telephone}`);
      return { success: false, error: 'Numéro invalide' };
    }

    try {
      let result;
      switch(cfg.provider) {
        case 'infobip': result = await this._infobip(tel, message, cfg); break;
        case 'twilio':  result = await this._twilio(tel, message, cfg); break;
        case 'orange':  result = await this._orangeSMS(tel, message, cfg); break;
        default:        result = await this._generic(tel, message, cfg); break;
      }

      // Logger l'envoi
      DB.push('sms_logs', {
        telephone: tel,
        message:   message.substring(0, 160),
        statut:    result.success ? 'envoye' : 'echec',
        erreur:    result.error || null,
        type:      options.type || 'manuel',
        user_id:   Auth.getUser()?.id,
        created_at: new Date().toISOString()
      });

      if (result.success) Toast.success(`📱 SMS envoyé à ${tel}`);
      else Toast.error(`❌ Échec SMS: ${result.error}`);
      return result;
    } catch(err) {
      Toast.error(`❌ Erreur SMS: ${err.message}`);
      return { success: false, error: err.message };
    }
  },

  // ── Envois automatiques ──────────────────────────────────

  // Rappels crédits en retard
  async envoyerRappelsCredits() {
    const lang = localStorage.getItem('pharma_lang') || 'fr';
    const cfg  = this.getConfig();
    const nomPharmacie = localStorage.getItem('pharma_nom') || 'TERANGA PHARMA';
    const clients = DB.get('clients').filter(c => (c.solde_credit||0) > 0 && c.telephone);
    let envoyes = 0;

    for (const client of clients) {
      const msg = this.TEMPLATES.credit_rappel[lang]?.(
        `${client.prenom} ${client.nom}`,
        Fmt.currency(client.solde_credit),
        nomPharmacie
      );
      const result = await this.send(client.telephone, msg, { type: 'credit_rappel' });
      if (result.success || result.simule) envoyes++;
    }
    Toast.success(`✅ ${envoyes} rappels crédit envoyés`);
    return envoyes;
  },

  // Alerte stock critique aux responsables
  async envoyerAlertesStock() {
    const cfg = this.getConfig();
    if (!cfg.telephone_responsable) {
      Toast.warning('Configurez le téléphone du responsable stock dans les paramètres');
      return 0;
    }
    const meds = DB.get('medicaments').filter(m => getStockTotal(m.id) <= m.seuil_min);
    let envoyes = 0;
    for (const m of meds) {
      const stock = getStockTotal(m.id);
      const msg = this.TEMPLATES.stock_critique['fr']?.(m.nom_commercial, stock, m.seuil_min);
      const result = await this.send(cfg.telephone_responsable, msg, { type: 'stock_critique' });
      if (result.success || result.simule) envoyes++;
    }
    if (envoyes > 0) Toast.success(`✅ ${envoyes} alertes stock envoyées`);
    return envoyes;
  },

  // ── Providers SMS ─────────────────────────────────────────

  async _infobip(tel, message, cfg) {
    const resp = await fetch(`https://api.infobip.com/sms/2/text/single`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${cfg.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: cfg.sender_id || 'TERANGA',
        to: tel,
        text: message
      })
    });
    if (!resp.ok) return { success: false, error: `HTTP ${resp.status}` };
    const data = await resp.json();
    return { success: true, id: data.messages?.[0]?.messageId };
  },

  async _twilio(tel, message, cfg) {
    const auth = btoa(`${cfg.account_sid}:${cfg.api_key}`);
    const body = new URLSearchParams({ From: cfg.sender_id, To: tel, Body: message });
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.account_sid}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    if (!resp.ok) return { success: false, error: `HTTP ${resp.status}` };
    const data = await resp.json();
    return { success: data.status !== 'failed', id: data.sid };
  },

  async _orangeSMS(tel, message, cfg) {
    const resp = await fetch('https://api.orange.com/smsmessaging/v1/outbound/tel%3A%2B221' + cfg.sender_number + '/requests', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        outboundSMSMessageRequest: {
          address: [`tel:${tel}`],
          senderAddress: `tel:+221${cfg.sender_number}`,
          outboundSMSTextMessage: { message }
        }
      })
    });
    return { success: resp.ok, error: resp.ok ? null : `HTTP ${resp.status}` };
  },

  async _generic(tel, message, cfg) {
    // Pour toute API compatible REST
    if (!cfg.api_url) return { success: false, error: 'URL API non configurée' };
    const resp = await fetch(cfg.api_url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${cfg.api_key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: tel, message, from: cfg.sender_id || 'TERANGA' })
    });
    return { success: resp.ok };
  },

  // ── Mode démo (simulation) ────────────────────────────────
  _simulerEnvoi(telephone, message, options) {
    console.log(`[SMS SIMULÉ] → ${telephone}\n${message}`);
    DB.push('sms_logs', {
      telephone,
      message:   message.substring(0, 160),
      statut:    'simule',
      type:      options.type || 'manuel',
      user_id:   Auth.getUser()?.id,
      created_at: new Date().toISOString()
    });
    Toast.info(`📱 [Démo] SMS simulé → ${telephone}`);
    return { success: true, simule: true };
  },

  // ── Normaliser numéro sénégalais ─────────────────────────
  _normaliserNumero(tel) {
    if (!tel) return null;
    const cleaned = tel.replace(/[\s\-\(\)\.]/g, '');
    // Déjà au format international
    if (cleaned.startsWith('+221')) return cleaned;
    if (cleaned.startsWith('221')) return '+' + cleaned;
    // Numéro local à 9 chiffres
    if (cleaned.length === 9 && /^[0-9]+$/.test(cleaned)) return '+221' + cleaned;
    // Numéro à 10 chiffres commençant par 0
    if (cleaned.length === 10 && cleaned.startsWith('0')) return '+221' + cleaned.slice(1);
    return null;
  },

  // ── Stats SMS ─────────────────────────────────────────────
  getStats() {
    const logs = DB.get('sms_logs') || [];
    return {
      total:    logs.length,
      envoyes:  logs.filter(l=>l.statut==='envoye').length,
      simules:  logs.filter(l=>l.statut==='simule').length,
      echecs:   logs.filter(l=>l.statut==='echec').length,
      credits:  logs.filter(l=>l.type==='credit_rappel').length,
      stocks:   logs.filter(l=>l.type==='stock_critique').length,
    };
  }
};

// Initialiser la table sms_logs si elle n'existe pas
if (!localStorage.getItem('pharma_sms_logs')) {
  localStorage.setItem('pharma_sms_logs', '[]');
}
