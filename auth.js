"use strict";

const _SK = "mmi_auth_v1";

/* ── Cache utilisateurs (chargé au démarrage, utilisé par le panneau admin) ── */
let _usersCache = [];
async function _loadUsersCache() {
  try {
    const r = await fetch("/api/users.php", { credentials: "include" });
    if (r.ok) _usersCache = await r.json();
  } catch {}
}

/* ── Session sessionStorage ─────────────────────────────────────────────────── */
function _sess() {
  try { return JSON.parse(sessionStorage.getItem(_SK)); }
  catch { return null; }
}

/* ── SHA-256 (hachage côté client avant envoi au serveur) ───────────────────── */
function _sha256Pure(bytes) {
  function w(n) { return n >>> 0; }
  function ror(n, b) { return w((n >>> b) | (n << (32 - b))); }
  const K = new Uint32Array([
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,
    0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,
    0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,
    0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,
    0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,
    0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,
    0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,
    0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,
    0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
  ]);
  const H = new Uint32Array([
    0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,
    0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19,
  ]);
  const plen = Math.ceil((bytes.length + 9) / 64) * 64;
  const msg  = new Uint8Array(plen);
  msg.set(bytes);
  msg[bytes.length] = 0x80;
  const dv = new DataView(msg.buffer);
  dv.setUint32(plen - 4, w(bytes.length * 8));
  const W = new Uint32Array(64);
  for (let i = 0; i < plen; i += 64) {
    for (let j = 0;  j < 16; j++) W[j] = dv.getUint32(i + j * 4);
    for (let j = 16; j < 64; j++) {
      const s0 = ror(W[j-15],7)^ror(W[j-15],18)^(W[j-15]>>>3);
      const s1 = ror(W[j-2],17)^ror(W[j-2],19)^(W[j-2]>>>10);
      W[j] = w(W[j-16]+s0+W[j-7]+s1);
    }
    let a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
    for (let j = 0; j < 64; j++) {
      const S1=ror(e,6)^ror(e,11)^ror(e,25), ch=(e&f)^(~e&g);
      const t1=w(h+S1+ch+K[j]+W[j]);
      const S0=ror(a,2)^ror(a,13)^ror(a,22), mj=(a&b)^(a&c)^(b&c);
      const t2=w(S0+mj);
      h=g;g=f;f=e;e=w(d+t1);d=c;c=b;b=a;a=w(t1+t2);
    }
    H[0]=w(H[0]+a);H[1]=w(H[1]+b);H[2]=w(H[2]+c);H[3]=w(H[3]+d);
    H[4]=w(H[4]+e);H[5]=w(H[5]+f);H[6]=w(H[6]+g);H[7]=w(H[7]+h);
  }
  return [...H].map(x=>x.toString(16).padStart(8,"0")).join("");
}
async function _sha256(s) {
  const bytes = new TextEncoder().encode(s);
  if (window.crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,"0")).join("");
  }
  return _sha256Pure(bytes);
}

/* ── Injection CSS ─────────────────────────────────────────────────────────── */
(function _injectStyles() {
  if (document.getElementById("mmi-auth-styles")) return;
  const s = document.createElement("style");
  s.id = "mmi-auth-styles";
  s.textContent = `
    #auth-overlay {
      position:fixed;inset:0;z-index:9999;
      background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);
      display:flex;align-items:center;justify-content:center;
    }
    .auth-card {
      background:#fff;border-radius:16px;padding:2.5rem 2rem;
      width:100%;max-width:360px;
      box-shadow:0 20px 60px rgba(0,0,0,.35);
      display:flex;flex-direction:column;gap:.75rem;text-align:center;
    }
    .auth-logo  { width:60px;height:auto;border-radius:8px;margin:0 auto; }
    .auth-title { font-size:1.35rem;color:#1e3a5f;margin:0; }
    .auth-sub   { font-size:.82rem;color:#6b7280;margin:0; }
    .auth-input {
      width:100%;padding:.65rem .9rem;border:1.5px solid #d1d5db;
      border-radius:8px;font-size:.95rem;outline:none;box-sizing:border-box;
    }
    .auth-input:focus { border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12); }
    .auth-btn {
      background:#1e3a5f;color:#fff;border:none;padding:.75rem;
      border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;width:100%;
    }
    .auth-btn:hover:not(:disabled) { background:#2563eb; }
    .auth-btn:disabled { opacity:.6;cursor:default; }
    .auth-err { font-size:.85rem;color:#dc2626;margin:0; }

    #auth-badge {
      display:flex;align-items:center;gap:.5rem;
      margin-left:auto;font-size:.78rem;flex-shrink:0;
    }
    .auth-badge-user   { font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.05em; }
    .auth-badge-role   { background:rgba(255,255,255,.15);color:#fff;padding:2px 8px;border-radius:12px; }
    .auth-badge-logout {
      background:rgba(255,255,255,.12);color:#fff;
      border:1px solid rgba(255,255,255,.3);padding:3px 10px;
      border-radius:6px;cursor:pointer;font-size:.75rem;
    }
    .auth-badge-logout:hover { background:rgba(255,255,255,.28); }

    body.auth-readonly select { pointer-events:none;opacity:.65;cursor:default; }
    body.auth-readonly .gh-save-btn,
    body.auth-readonly #gh-config-btn   { display:none !important; }
    body.auth-readonly .add-evt-btn     { display:none !important; }
    body.auth-readonly #detailEditBtn,
    body.auth-readonly #detailDeleteBtn,
    body.auth-readonly #detailDuplicateBtn { display:none !important; }
    body.auth-readonly #dupOkBtn,
    body.auth-readonly #editOkBtn,
    body.auth-readonly #confirmOkBtn    { display:none !important; }
    body.auth-readonly .save-btn,
    body.auth-readonly .cfg-btn         { display:none !important; }
  `;
  document.head.appendChild(s);
})();

/* ── API publique ───────────────────────────────────────────────────────────── */
window.AUTH = {
  isAuth:     () => _sess() !== null,
  canWrite:   () => {
    const s = _sess();
    if (!s) return false;
    if (s.rw) return true;
    if (s.rwApps?.length) return s.rwApps.some(app => location.href.includes(app));
    return false;
  },
  /* Accès en écriture à un groupe de semestres de la maquette (répartition).
     "maquetteGroups" sert à AFFINER (restreindre) le R/W repartition existant :
     si défini et non vide, seuls les groupes cochés restent éditables ;
     si absent/vide, le R/W repartition donne accès à toute la maquette. */
  canEditMaquetteGroup: (groupKey) => {
    const s = _sess();
    if (!s) return false;
    if (s.rw) return true;
    if (s.rwApps?.includes("repartition")) {
      if (s.maquetteGroups?.length) return s.maquetteGroups.includes(groupKey);
      return true;
    }
    return (s.maquetteGroups || []).includes(groupKey);
  },
  /* Accès maquette complet et non restreint (utilisé pour décider s'il faut
     fusionner uniquement les groupes autorisés lors de l'enregistrement). */
  hasFullMaquetteAccess: () => {
    const s = _sess();
    if (!s) return false;
    if (s.rw) return true;
    if (s.rwApps?.includes("repartition")) return !(s.maquetteGroups?.length);
    return false;
  },
  canAccess:  (app) => {
    const s = _sess();
    if (!s) return false;
    if (s.denyApps?.includes(app)) return false;
    return true;
  },
  isAdmin:    () => _sess()?.login === "nicolas.maurin",
  user:       () => _sess()?.login ?? null,
  hashPwd:    (pwd) => _sha256(pwd),

  /* ── Authentification ─────────────────────────────────────────────────── */
  async login(login, pwd) {
    const key = login.trim().toLowerCase();
    const h   = await _sha256(pwd);
    const resp = await fetch("/api/login.php", {
      method:      "POST",
      headers:     { "Content-Type": "application/json" },
      credentials: "include",
      body:        JSON.stringify({ login: key, h }),
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    if (!data.success) return false;
    sessionStorage.setItem(_SK, JSON.stringify(data.user));
    return true;
  },

  logout() {
    fetch("/api/logout.php", { method: "POST", credentials: "include" }).catch(() => {});
    sessionStorage.removeItem(_SK);
    location.href = "/index.html";
  },

  /* ── Gestion des utilisateurs (admin) ───────────────────────────────────── */
  listExtraUsers:  () => Object.fromEntries(_usersCache.map(u => [u.login, u])),
  listAllLogins:   () => _usersCache.map(u => u.login).sort(),
  getUserInfo:     (login) => ({ ...(_usersCache.find(u => u.login === login) || {}) }),
  reloadExtraUsers: () => _loadUsersCache(),

  async createUser(cfg) {
    const resp = await fetch("/api/users.php", {
      method:      "POST",
      headers:     { "Content-Type": "application/json" },
      credentials: "include",
      body:        JSON.stringify(cfg),
    });
    if (!resp.ok) { const j = await resp.json().catch(()=>({})); throw new Error(j.error || `Erreur ${resp.status}`); }
    await _loadUsersCache();
  },

  async deleteUser(login) {
    const resp = await fetch(`/api/users.php?login=${encodeURIComponent(login)}`, {
      method:      "DELETE",
      credentials: "include",
    });
    if (!resp.ok) { const j = await resp.json().catch(()=>({})); throw new Error(j.error || `Erreur ${resp.status}`); }
    await _loadUsersCache();
  },

  async updateUserPassword(login, h) {
    const existing = _usersCache.find(u => u.login === login) || {};
    await this.createUser({ ...existing, login, h });
  },

  /* ── Interface utilisateur ───────────────────────────────────────────────── */
  async injectUI() {
    /* 1. Vérifier la session PHP si sessionStorage vide */
    if (!_sess()) {
      try {
        const resp = await fetch("/api/me.php", { credentials: "include" });
        if (resp.ok) {
          const data = await resp.json();
          if (data.authenticated) {
            const { authenticated, ...user } = data;
            sessionStorage.setItem(_SK, JSON.stringify(user));
          }
        }
      } catch {}
    }

    /* 2. Déjà authentifié → afficher l'app et charger le cache utilisateurs */
    if (_sess()) {
      _loadUsersCache();
      const appRoot = document.getElementById("app-root");
      if (appRoot) appRoot.style.display = "";
      window.dispatchEvent(new Event("auth-success"));
      return;
    }

    /* 4. Non authentifié → afficher le formulaire */
    const appRoot = document.getElementById("app-root");
    if (appRoot) appRoot.style.display = "none";

    const ov = document.createElement("div");
    ov.id    = "auth-overlay";
    ov.innerHTML = `
      <div class="auth-card">
        <img class="auth-logo" src="logo_mmi.jpg" alt="MMI">
        <h2 class="auth-title">Gestion MMI</h2>
        <p class="auth-sub">IUT de Béziers — Accès réservé</p>

        <form id="auth-form" autocomplete="on" onsubmit="event.preventDefault(); AUTH._doLogin();">
          <input id="auth-login" class="auth-input" type="text"     placeholder="Identifiant"  autocomplete="username" autofocus>
          <input id="auth-pwd"   class="auth-input" type="password" placeholder="Mot de passe" autocomplete="current-password">
          <button id="auth-btn"  class="auth-btn"   type="submit">Connexion</button>
        </form>
        <p id="auth-err" class="auth-err" style="display:none">Identifiant ou mot de passe incorrect.</p>

        <button onclick="AUTH._showChangePwd()" style="background:none;border:none;color:#6b7280;
          font-size:.8rem;cursor:pointer;text-decoration:underline;margin-top:.25rem;">
          Changer mon mot de passe
        </button>

        <form id="auth-chpwd-form" style="display:none;margin-top:.5rem;"
          onsubmit="event.preventDefault(); AUTH._doChangePwd();">
          <p style="font-size:.82rem;color:#1e3a5f;font-weight:600;margin:0 0 .5rem;">Nouveau mot de passe</p>
          <input id="auth-chpwd-login"   class="auth-input" type="text"     placeholder="Identifiant" autocomplete="username">
          <input id="auth-chpwd-current" class="auth-input" type="password" placeholder="Mot de passe actuel" style="margin-top:.4rem;" autocomplete="current-password">
          <input id="auth-chpwd-new"     class="auth-input" type="password" placeholder="Nouveau mot de passe" style="margin-top:.4rem;" autocomplete="new-password">
          <input id="auth-chpwd-confirm" class="auth-input" type="password" placeholder="Confirmer le nouveau mot de passe" style="margin-top:.4rem;" autocomplete="new-password">
          <button id="auth-chpwd-btn" class="auth-btn" type="submit" style="margin-top:.5rem;">Valider</button>
          <p id="auth-chpwd-err" class="auth-err" style="display:none"></p>
          <p id="auth-chpwd-ok"  style="display:none;font-size:.85rem;color:#16a34a;margin:0;"></p>
        </form>
      </div>`;
    document.body.appendChild(ov);
  },

  async _doLogin() {
    const login = document.getElementById("auth-login").value;
    const pwd   = document.getElementById("auth-pwd").value;
    const btn   = document.getElementById("auth-btn");
    const err   = document.getElementById("auth-err");
    btn.disabled    = true;
    btn.textContent = "…";
    err.style.display = "none";
    try {
      if (await AUTH.login(login, pwd)) {
        _loadUsersCache();
        if (window.PasswordCredential) {
          try {
            await navigator.credentials.store(
              new PasswordCredential({ id: login.trim().toLowerCase(), password: pwd })
            );
          } catch {}
        }
        document.getElementById("auth-overlay").remove();
        const appRoot = document.getElementById("app-root");
        if (appRoot) appRoot.style.display = "";
        window.dispatchEvent(new Event("auth-success"));
      } else {
        err.style.display = "block";
        document.getElementById("auth-pwd").value = "";
        btn.disabled    = false;
        btn.textContent = "Connexion";
        document.getElementById("auth-pwd").focus();
      }
    } catch (e) {
      err.textContent   = "Erreur (" + e.message + ").";
      err.style.display = "block";
      btn.disabled      = false;
      btn.textContent   = "Connexion";
    }
  },

  _showChangePwd() {
    const loginForm = document.getElementById("auth-form");
    const chpwdForm = document.getElementById("auth-chpwd-form");
    const err       = document.getElementById("auth-err");
    const isHidden  = chpwdForm.style.display === "none";
    err.style.display = "none";
    if (isHidden) {
      loginForm.style.display  = "none";
      chpwdForm.style.display  = "";
      document.getElementById("auth-chpwd-login").focus();
    } else {
      loginForm.style.display  = "";
      chpwdForm.style.display  = "none";
    }
  },

  async _doChangePwd() {
    const login   = document.getElementById("auth-chpwd-login").value.trim().toLowerCase();
    const current = document.getElementById("auth-chpwd-current").value;
    const newPwd  = document.getElementById("auth-chpwd-new").value;
    const confirm = document.getElementById("auth-chpwd-confirm").value;
    const btn     = document.getElementById("auth-chpwd-btn");
    const errEl   = document.getElementById("auth-chpwd-err");
    const okEl    = document.getElementById("auth-chpwd-ok");

    errEl.style.display = "none";
    okEl.style.display  = "none";

    if (!login || !current || !newPwd || !confirm) {
      errEl.textContent   = "Tous les champs sont obligatoires.";
      errEl.style.display = "block"; return;
    }
    if (newPwd.length < 6) {
      errEl.textContent   = "Le nouveau mot de passe doit contenir au moins 6 caractères.";
      errEl.style.display = "block"; return;
    }
    if (newPwd !== confirm) {
      errEl.textContent   = "Les nouveaux mots de passe ne correspondent pas.";
      errEl.style.display = "block"; return;
    }

    btn.disabled    = true;
    btn.textContent = "…";

    try {
      const currentH = await _sha256(current);
      const newH     = await _sha256(newPwd);
      const resp = await fetch("/api/change-password.php", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body:        JSON.stringify({ login, currentH, newH }),
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data.success) {
        document.getElementById("auth-chpwd-login").value   = "";
        document.getElementById("auth-chpwd-current").value = "";
        document.getElementById("auth-chpwd-new").value     = "";
        document.getElementById("auth-chpwd-confirm").value = "";
        okEl.textContent  = "Mot de passe modifié avec succès.";
        okEl.style.display = "block";
        setTimeout(() => {
          document.getElementById("auth-form").style.display        = "";
          document.getElementById("auth-chpwd-form").style.display  = "none";
          okEl.style.display = "none";
        }, 2000);
      } else {
        errEl.textContent   = data.error || "Identifiant ou mot de passe actuel incorrect.";
        errEl.style.display = "block";
      }
    } catch (e) {
      errEl.textContent   = "Erreur réseau (" + e.message + ").";
      errEl.style.display = "block";
    }
    btn.disabled    = false;
    btn.textContent = "Valider";
  },

  _showChangePwdModal() {
    if (document.getElementById("chpwd-modal")) return;
    const modal = document.createElement("div");
    modal.id = "chpwd-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2000;display:flex;align-items:center;justify-content:center;";
    modal.innerHTML = `
      <div style="background:#fff;border-radius:10px;width:min(380px,94vw);
        box-shadow:0 8px 32px rgba(0,0,0,.22);overflow:hidden;">
        <div style="background:#1e3a5f;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">
          <span style="color:#fff;font-size:15px;font-weight:700;">Changer mon mot de passe</span>
          <button onclick="document.getElementById('chpwd-modal').remove()"
            style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;line-height:1;">✕</button>
        </div>
        <div style="padding:20px 20px 16px;">
          <input id="chpwd-m-current" type="password" placeholder="Mot de passe actuel"
            class="auth-input" autocomplete="current-password" style="margin-bottom:.6rem;">
          <input id="chpwd-m-new"     type="password" placeholder="Nouveau mot de passe"
            class="auth-input" autocomplete="new-password" style="margin-bottom:.6rem;">
          <input id="chpwd-m-confirm" type="password" placeholder="Confirmer le nouveau mot de passe"
            class="auth-input" autocomplete="new-password">
          <p id="chpwd-m-err" style="color:#dc2626;font-size:12px;margin:.6rem 0 0;display:none;"></p>
          <p id="chpwd-m-ok"  style="color:#16a34a;font-size:12px;margin:.6rem 0 0;display:none;"></p>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;">
            <button onclick="document.getElementById('chpwd-modal').remove()"
              style="background:none;border:1.5px solid #d1d5db;border-radius:6px;
                padding:6px 14px;cursor:pointer;font-size:13px;color:#374151;">Annuler</button>
            <button id="chpwd-m-btn" onclick="AUTH._doChangePwdModal()"
              class="auth-btn" style="padding:6px 18px;width:auto;margin:0;">Valider</button>
          </div>
        </div>
      </div>`;
    modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
    document.getElementById("chpwd-m-current").focus();
  },

  async _doChangePwdModal() {
    const current = document.getElementById("chpwd-m-current").value;
    const newPwd  = document.getElementById("chpwd-m-new").value;
    const confirm = document.getElementById("chpwd-m-confirm").value;
    const btn     = document.getElementById("chpwd-m-btn");
    const errEl   = document.getElementById("chpwd-m-err");
    const okEl    = document.getElementById("chpwd-m-ok");
    errEl.style.display = okEl.style.display = "none";

    if (!current || !newPwd || !confirm) {
      errEl.textContent   = "Tous les champs sont obligatoires.";
      errEl.style.display = "block"; return;
    }
    if (newPwd.length < 6) {
      errEl.textContent   = "Le nouveau mot de passe doit contenir au moins 6 caractères.";
      errEl.style.display = "block"; return;
    }
    if (newPwd !== confirm) {
      errEl.textContent   = "Les nouveaux mots de passe ne correspondent pas.";
      errEl.style.display = "block"; return;
    }

    btn.disabled = true; btn.textContent = "…";
    try {
      const currentH = await _sha256(current);
      const newH     = await _sha256(newPwd);
      const resp = await fetch("/api/change-password.php", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body:        JSON.stringify({ login: _sess().login, currentH, newH }),
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data.success) {
        okEl.textContent   = "Mot de passe modifié avec succès.";
        okEl.style.display = "block";
        setTimeout(() => document.getElementById("chpwd-modal")?.remove(), 1800);
      } else {
        errEl.textContent   = data.error || "Mot de passe actuel incorrect.";
        errEl.style.display = "block";
      }
    } catch (e) {
      errEl.textContent   = "Erreur réseau (" + e.message + ").";
      errEl.style.display = "block";
    }
    btn.disabled = false; btn.textContent = "Valider";
  },

  injectBadge() {
    const s = _sess();
    if (!s || document.getElementById("auth-badge")) return;
    const badge = document.createElement("div");
    badge.id = "auth-badge";
    badge.innerHTML = `
      <span class="auth-badge-user">${s.login}</span>
      <span class="auth-badge-role">${AUTH.canWrite() ? "Lecture/Écriture" : "Lecture seule"}</span>
      <button class="auth-badge-logout" onclick="AUTH._showChangePwdModal()" title="Changer mon mot de passe">🔑</button>
      <button class="auth-badge-logout" onclick="AUTH.logout()">Déconnexion</button>`;
    const hdr = document.querySelector(".header-inner");
    if (hdr) hdr.appendChild(badge);
  },

  applyPermissions() {
    const navMods    = document.getElementById("nav-modifications");
    if (navMods)    navMods.style.display    = this.isAdmin() ? "" : "none";
    const navPilotage = document.getElementById("nav-pilotage");
    if (navPilotage) navPilotage.style.display = this.isAdmin() ? "" : "none";
    const navSae     = document.getElementById("nav-sae");
    if (navSae)     navSae.style.display     = this.isAdmin() ? "" : "none";

    if (this.canWrite()) {
      document.body.classList.remove("auth-readonly");
      return;
    }
    document.body.classList.add("auth-readonly");
    document.querySelectorAll("#app-root select").forEach(s => { s.disabled = true; });
    const writeActions = [
      "saveAffectationsGH","saveMaquetteGH","saveEnseignantsGH",
      "addEns","deleteEns","openEditEnsModal",
      "addSubrow","removeSubrow","saveEditEns",
    ];
    document.querySelectorAll("#app-root button[onclick]").forEach(btn => {
      const oc = btn.getAttribute("onclick") || "";
      if (writeActions.some(fn => oc.includes(fn))) btn.style.display = "none";
    });
  },
};
