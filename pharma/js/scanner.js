// ============================================================
//  TERANGA PHARMA — scanner.js
//  Scanner code-barres via caméra (API BarcodeDetector ou ZXing)
//  Fallback : saisie manuelle du code EAN/code produit
// ============================================================

const Scanner = {
  stream: null,
  interval: null,
  detector: null,
  onResult: null,

  // Vérifier support BarcodeDetector natif (Chrome 83+)
  isSupported() {
    return 'BarcodeDetector' in window;
  },

  // Ouvrir le scanner dans un modal
  open(callback) {
    this.onResult = callback;
    const modal = document.getElementById('scannerModal');
    if (!modal) {
      this._injectModal();
    }
    document.getElementById('scannerModal').classList.add('open');
    if (this.isSupported()) {
      this._startCamera();
    } else {
      document.getElementById('scannerFallback').style.display = 'block';
      document.getElementById('scannerCamera').style.display  = 'none';
      document.getElementById('scannerStatus').textContent = '⚠️ Scanner non disponible — utilisez la saisie manuelle';
    }
  },

  close() {
    this._stopCamera();
    const modal = document.getElementById('scannerModal');
    if (modal) modal.classList.remove('open');
  },

  _injectModal() {
    const div = document.createElement('div');
    div.innerHTML = `
    <div class="modal-overlay" id="scannerModal">
      <div class="modal" style="max-width:480px">
        <div class="modal-header" style="background:linear-gradient(135deg,#042a1a,#0a7a4a);color:#fff">
          <span class="modal-title" style="color:#fff">📷 Scanner un code-barres</span>
          <button class="modal-close" onclick="Scanner.close()" style="color:#fff;background:none;border:none;font-size:18px;cursor:pointer">✕</button>
        </div>
        <div class="modal-body">
          <!-- Caméra -->
          <div id="scannerCamera">
            <div style="position:relative;background:#000;border-radius:8px;overflow:hidden;margin-bottom:12px">
              <video id="scannerVideo" autoplay playsinline muted style="width:100%;height:240px;object-fit:cover;display:block"></video>
              <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:200px;height:3px;background:rgba(245,158,11,.8);border-radius:2px;animation:scanLine 1.5s ease-in-out infinite"></div>
              <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:200px;height:140px;border:2px solid rgba(245,158,11,.6);border-radius:8px;pointer-events:none"></div>
            </div>
            <div id="scannerStatus" style="text-align:center;font-size:12px;color:var(--text-muted);margin-bottom:10px">📷 Pointez la caméra vers le code-barres...</div>
          </div>
          <!-- Fallback saisie manuelle -->
          <div id="scannerFallback">
            <div class="alert alert-warning" style="font-size:12px">📷 Caméra non disponible sur ce navigateur. Saisissez le code manuellement.</div>
          </div>
          <!-- Saisie manuelle dans tous les cas -->
          <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:8px">
            <label class="form-label">Saisie manuelle du code EAN / lot</label>
            <div style="display:flex;gap:8px">
              <input class="form-control" id="scannerInput" placeholder="Ex: 3400935959649" style="font-family:monospace;letter-spacing:2px">
              <button class="btn btn-primary btn-sm" onclick="Scanner._manualSubmit()">✓ Valider</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <style>
      @keyframes scanLine { 0%,100%{transform:translate(-50%,-50%) translateY(-60px)} 50%{transform:translate(-50%,-50%) translateY(60px)} }
    </style>`;
    document.body.appendChild(div);
    document.getElementById('scannerInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') this._manualSubmit();
    });
  },

  async _startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: {ideal:1280}, height: {ideal:720} }
      });
      const video = document.getElementById('scannerVideo');
      video.srcObject = this.stream;
      await video.play();
      this.detector = new BarcodeDetector({ formats: ['ean_13','ean_8','code_128','code_39','qr_code','upc_a','upc_e'] });
      document.getElementById('scannerStatus').textContent = '📷 Caméra active — pointez vers un code-barres...';
      this._scanLoop(video);
    } catch(err) {
      document.getElementById('scannerStatus').textContent = '❌ Impossible d\'accéder à la caméra : ' + err.message;
      document.getElementById('scannerCamera').style.display = 'none';
      document.getElementById('scannerFallback').style.display = 'block';
    }
  },

  _scanLoop(video) {
    this.interval = setInterval(async () => {
      if (!this.detector || video.readyState < 2) return;
      try {
        const barcodes = await this.detector.detect(video);
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          this._onDetected(code);
        }
      } catch(e) { /* ignore */ }
    }, 400);
  },

  _stopCamera() {
    clearInterval(this.interval);
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.detector = null;
    this.interval = null;
  },

  _onDetected(code) {
    this._stopCamera();
    document.getElementById('scannerStatus').textContent = `✅ Code détecté : ${code}`;
    Toast.success(`📷 Code scanné : ${code}`);
    this._processCode(code);
    setTimeout(() => this.close(), 800);
  },

  _manualSubmit() {
    const code = document.getElementById('scannerInput').value.trim();
    if (!code) { Toast.error('Entrez un code'); return; }
    this._processCode(code);
    this.close();
  },

  _processCode(code) {
    // Chercher dans les médicaments par code EAN ou nom contenant le code
    const meds = DB.get('medicaments');
    const match = meds.find(m =>
      m.code_ean === code ||
      m.nom_commercial.includes(code) ||
      m.dci.toLowerCase().includes(code.toLowerCase())
    );
    if (match) {
      Toast.success(`💊 Médicament trouvé : ${match.nom_commercial}`);
      if (typeof this.onResult === 'function') this.onResult({ code, medicament: match });
    } else {
      Toast.warning(`⚠️ Code "${code}" non trouvé dans le catalogue`);
      if (typeof this.onResult === 'function') this.onResult({ code, medicament: null });
    }
  },

  // Associer un code EAN à un médicament
  associerCode(medicamentId, code) {
    const m = DB.find('medicaments', medicamentId);
    if (!m) { Toast.error('Médicament introuvable'); return; }
    DB.update('medicaments', medicamentId, { code_ean: code });
    Toast.success(`✅ Code ${code} associé à ${m.nom_commercial}`);
  }
};
