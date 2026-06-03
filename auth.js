"use strict";

/* ── Utilisateurs (hachages SHA-256) ─────────────────────────────────────────
   Clé de session partagée entre toutes les applications de la suite MMI.
   ─────────────────────────────────────────────────────────────────────────── */
const _U = {
  "nicolas.maurin": {
    h: "eeb705ce8d0aa8255bea1e65ac2633938eb36bb496b92695f8475428ef5313f1",
    rw: true,
  },
  "damien.marill": {
    h: "e9f6d4e3a860db8eec3bfc8dcf84186e7cfb24216f8c191d6f423a159250c7ec",
    rw: false,
    rwApps: ["planning-web", "repartition"],
  },
  "emmanuel.tehrond": {
    h: "cb669adb1c13b2ea8661fc47ee7b9dda17aca84edaf5a6a845a8a6c8e2c188f2",
    rw: false,
    rwApps: ["planning-web", "repartition"],
  },
  "william.bernard": {
    h: "08bd382e37e89970a9fc8dcb6cc9392b49daf28f6cc0c37c7fe8f7c3d5a331e3",
    rw: false,
  },
  "carole.pitot": {
    h: "651452ffac1d672f0bcb9fc86436fbca73f88fa3e416102b5f8b52992e5c33fd",
    rw: false,
    rwApps: ["soutenances_portfolio", "soutenances_stages"],
  },
  "luc.jaeckle": {
    h: "61fc127efcc19b85c3277ba4dd68b5265be07d9e622bd5cba87949d9a632aa78",
    rw: false,
    denyApps: ["repartition"],
  },
  "benoit.darties": {
    h: "07132555d86495570592e8a15dd7a76616d0d2282bcc2286395a4565ea1ec818",
    rw: false,
    denyApps: ["repartition"],
  },
  "sophie.de-velder": {
    h: "03c0422171b20676728d2cc2fa79db828b0299d25da09f455643e33c4af4f2c1",
    rw: false,
    denyApps: ["repartition"],
  },
  "davide.di-pierro": {
    h: "81c761bfccaf91af3d2c6d683b9bc0ca548e7eccc655ad8a925235774e15814f",
    rw: false,
    denyApps: ["repartition"],
  },
  "chrysta.pelissier": {
    h: "64d789a0e1025587c1bbdd11373cf3e9664745a75bd10d596fc655525e820617",
    rw: false,
    denyApps: ["repartition"],
  },
  "caroline.surribas": {
    h: "d2a0388d97fc0f440eb8733036214270ebdd1b0f79cf3e638774cff570ee27ee",
    rw: false,
    denyApps: ["repartition"],
  },
  "laeticia.tournie": {
    h: "a9e7254724ec1f357c650eeb680679a09c2a5ddcc457d5b671edd082ede206ab",
    rw: false,
    denyApps: ["repartition"],
  },
  "jerome.aze": {
    h: "9451a2511dd5e95d1ccc0d620b54f5047a6f41c1a7c79fab1b3d0b544e3e4c74",
    rw: false,
  },
  "sylvie.escaig": {
    h: "4b6921083b48e054bfc75ddf50953e688ac464e712bf7f6af067ab0bedc7f033",
    rw: false,
  },
};

const _SK = "mmi_auth_v1";
const _GHU = {
  owner: "nico3807",
  repo: "Applications_gestion",
  branch: "main",
  path: "users_extra.json",
  lsKey: "mmi_portal_gh",
};

let _usersExtra = {};
let _extraUsersPromise = null;

function _ghToken() {
  try {
    return (JSON.parse(localStorage.getItem(_GHU.lsKey)) || {}).token || null;
  } catch {
    return null;
  }
}

/* URL absolue de users_extra.json déduite de l'emplacement de auth.js
   (fonctionne que auth.js soit chargé depuis la racine ou un sous-dossier) */
const _USERS_JSON_URL = (() => {
  const tag = [...document.scripts].find((s) => s.src.includes("auth.js"));
  return tag ? new URL("users_extra.json", tag.src).href : "users_extra.json";
})();

async function _fetchExtraUsers() {
  /* 1. Lecture directe du fichier servi (pas besoin de token) */
  try {
    const r = await fetch(_USERS_JSON_URL + "?_t=" + Date.now(), { cache: "no-cache" });
    if (r.ok) {
      const arr = await r.json();
      _usersExtra = {};
      arr.forEach((u) => { _usersExtra[u.login] = u; });
    }
  } catch {}

  /* 2. Si le token GitHub est configuré, on prend la version GitHub en priorité */
  const token = _ghToken();
  if (!token) return;
  try {
    const url = `https://api.github.com/repos/${_GHU.owner}/${_GHU.repo}/contents/${_GHU.path}?ref=${_GHU.branch}&_t=${Date.now()}`;
    const r = await fetch(url, {
      cache: "no-cache",
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    if (!r.ok) return;
    const j = await r.json();
    const arr = JSON.parse(
      decodeURIComponent(escape(atob(j.content.replace(/\n/g, "")))),
    );
    _usersExtra = {};
    arr.forEach((u) => {
      _usersExtra[u.login] = u;
    });
  } catch {}
}

async function _saveExtraUsers() {
  const token = _ghToken();
  if (!token)
    throw new Error(
      "Token GitHub non configuré — configurez-le dans la gestion des utilisateurs.",
    );
  const arr = Object.values(_usersExtra);
  const url = `https://api.github.com/repos/${_GHU.owner}/${_GHU.repo}/contents/${_GHU.path}`;
  const content = btoa(
    unescape(encodeURIComponent(JSON.stringify(arr, null, 2))),
  );
  let sha = null;
  try {
    const r = await fetch(`${url}?ref=${_GHU.branch}&_t=${Date.now()}`, {
      cache: "no-cache",
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    if (r.ok) sha = (await r.json()).sha;
  } catch {}
  const body = {
    message: "Update users_extra.json via Web UI",
    content,
    branch: _GHU.branch,
  };
  if (sha) body.sha = sha;
  const r = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || `Erreur ${r.status}`);
  }
}

/* ── SHA-256 pur JS (fallback quand crypto.subtle est absent, ex. HTTP) ────── */
function _sha256Pure(bytes) {
  function w(n) {
    return n >>> 0;
  }
  function ror(n, b) {
    return w((n >>> b) | (n << (32 - b)));
  }
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ]);
  const plen = Math.ceil((bytes.length + 9) / 64) * 64;
  const msg = new Uint8Array(plen);
  msg.set(bytes);
  msg[bytes.length] = 0x80;
  const dv = new DataView(msg.buffer);
  dv.setUint32(plen - 4, w(bytes.length * 8));
  const W = new Uint32Array(64);
  for (let i = 0; i < plen; i += 64) {
    for (let j = 0; j < 16; j++) W[j] = dv.getUint32(i + j * 4);
    for (let j = 16; j < 64; j++) {
      const s0 = ror(W[j - 15], 7) ^ ror(W[j - 15], 18) ^ (W[j - 15] >>> 3);
      const s1 = ror(W[j - 2], 17) ^ ror(W[j - 2], 19) ^ (W[j - 2] >>> 10);
      W[j] = w(W[j - 16] + s0 + W[j - 7] + s1);
    }
    let a = H[0],
      b = H[1],
      c = H[2],
      d = H[3],
      e = H[4],
      f = H[5],
      g = H[6],
      h = H[7];
    for (let j = 0; j < 64; j++) {
      const S1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = w(h + S1 + ch + K[j] + W[j]);
      const S0 = ror(a, 2) ^ ror(a, 13) ^ ror(a, 22);
      const mj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = w(S0 + mj);
      h = g;
      g = f;
      f = e;
      e = w(d + t1);
      d = c;
      c = b;
      b = a;
      a = w(t1 + t2);
    }
    H[0] = w(H[0] + a);
    H[1] = w(H[1] + b);
    H[2] = w(H[2] + c);
    H[3] = w(H[3] + d);
    H[4] = w(H[4] + e);
    H[5] = w(H[5] + f);
    H[6] = w(H[6] + g);
    H[7] = w(H[7] + h);
  }
  return [...H].map((x) => x.toString(16).padStart(8, "0")).join("");
}

async function _sha256(s) {
  const bytes = new TextEncoder().encode(s);
  if (window.crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(buf)]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
  }
  return _sha256Pure(bytes);
}

function _sess() {
  try {
    return JSON.parse(sessionStorage.getItem(_SK));
  } catch {
    return null;
  }
}

/* ── Injection CSS (appelée immédiatement au chargement du module) ─────────── */
(function _injectStyles() {
  if (document.getElementById("mmi-auth-styles")) return;
  const s = document.createElement("style");
  s.id = "mmi-auth-styles";
  s.textContent = `
    /* Overlay de connexion */
    #auth-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
      display: flex; align-items: center; justify-content: center;
    }
    .auth-card {
      background: #fff; border-radius: 16px; padding: 2.5rem 2rem;
      width: 100%; max-width: 360px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.35);
      display: flex; flex-direction: column; gap: 0.75rem; text-align: center;
    }
    .auth-logo  { width: 60px; height: auto; border-radius: 8px; margin: 0 auto; }
    .auth-title { font-size: 1.35rem; color: #1e3a5f; margin: 0; }
    .auth-sub   { font-size: 0.82rem; color: #6b7280; margin: 0; }
    .auth-input {
      width: 100%; padding: 0.65rem 0.9rem; border: 1.5px solid #d1d5db;
      border-radius: 8px; font-size: 0.95rem; outline: none; box-sizing: border-box;
    }
    .auth-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.12); }
    .auth-btn {
      background: #1e3a5f; color: #fff; border: none; padding: 0.75rem;
      border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; width: 100%;
    }
    .auth-btn:hover:not(:disabled) { background: #2563eb; }
    .auth-btn:disabled { opacity: 0.6; cursor: default; }
    .auth-err { font-size: 0.85rem; color: #dc2626; margin: 0; }

    /* Badge utilisateur */
    #auth-badge {
      display: flex; align-items: center; gap: 0.5rem;
      margin-left: auto; font-size: 0.78rem; flex-shrink: 0;
    }
    .auth-badge-user   { font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: .05em; }
    .auth-badge-role   { background: rgba(255,255,255,.15); color: #fff; padding: 2px 8px; border-radius: 12px; }
    .auth-badge-logout {
      background: rgba(255,255,255,.12); color: #fff;
      border: 1px solid rgba(255,255,255,.3); padding: 3px 10px;
      border-radius: 6px; cursor: pointer; font-size: 0.75rem;
    }
    .auth-badge-logout:hover { background: rgba(255,255,255,.28); }

    /* Mode lecture seule */
    body.auth-readonly select { pointer-events: none; opacity: 0.65; cursor: default; }
    body.auth-readonly .gh-save-btn,
    body.auth-readonly #gh-config-btn   { display: none !important; }
    body.auth-readonly .add-evt-btn     { display: none !important; }
    body.auth-readonly #detailEditBtn,
    body.auth-readonly #detailDeleteBtn,
    body.auth-readonly #detailDuplicateBtn { display: none !important; }
    body.auth-readonly #dupOkBtn,
    body.auth-readonly #editOkBtn,
    body.auth-readonly #confirmOkBtn    { display: none !important; }
    body.auth-readonly .save-btn,
    body.auth-readonly .cfg-btn         { display: none !important; }

  `;
  document.head.appendChild(s);
})();

window.AUTH = {
  isAuth: () => _sess() !== null,
  canWrite: () => {
    const s = _sess();
    if (!s) return false;
    if (s.rw) return true;
    if (s.rwApps && s.rwApps.length > 0)
      return s.rwApps.some((app) => location.href.includes(app));
    return false;
  },
  canAccess: (app) => {
    const s = _sess();
    if (!s) return false;
    if (s.denyApps && s.denyApps.includes(app)) return false;
    return true;
  },
  isAdmin: () => _sess()?.login === "nicolas.maurin",
  user: () => _sess()?.login ?? null,

  async login(login, pwd) {
    const key = login.trim().toLowerCase();
    const u =
      _usersExtra[key] ||
      _U[
        key
      ]; /* _usersExtra en priorité (permet de changer le mdp des users hardcodés) */
    if (!u) return false;
    if ((await _sha256(pwd)) !== u.h) return false;
    sessionStorage.setItem(
      _SK,
      JSON.stringify({
        login: key,
        rw: !!u.rw,
        rwApps: u.rwApps || [],
        denyApps: u.denyApps || [],
      }),
    );
    return true;
  },

  /* Expose SHA-256 pour le panneau admin */
  hashPwd: (pwd) => _sha256(pwd),

  /* Fonctions admin — gestion des utilisateurs extra */
  listExtraUsers: () => ({ ..._usersExtra }),

  /* Retourne tous les logins connus (hardcodés + extra) */
  listAllLogins: () => {
    const all = new Set([...Object.keys(_U), ...Object.keys(_usersExtra)]);
    return [...all].sort();
  },

  async createUser(cfg) {
    _usersExtra[cfg.login] = cfg;
    await _saveExtraUsers();
  },
  async deleteUser(login) {
    delete _usersExtra[login];
    await _saveExtraUsers();
  },

  /* Change le mot de passe d'un utilisateur (hardcodé ou extra) */
  async updateUserPassword(login, h) {
    const base = _usersExtra[login] || _U[login] || {};
    _usersExtra[login] = { ...base, login, h };
    await _saveExtraUsers();
  },
  getGHToken: () => _ghToken(),
  setGHToken(token) {
    localStorage.setItem(_GHU.lsKey, JSON.stringify({ token }));
  },
  reloadExtraUsers: () => _fetchExtraUsers(),

  logout() {
    sessionStorage.removeItem(_SK);
    location.reload();
  },

  /* Affiche la modale de connexion (appelée uniquement depuis index.html racine) */
  injectUI() {
    _extraUsersPromise =
      _fetchExtraUsers(); /* Charge les utilisateurs GitHub en arrière-plan */
    if (_sess()) return;
    const appRoot = document.getElementById("app-root");
    if (appRoot) appRoot.style.display = "none";

    const ov = document.createElement("div");
    ov.id = "auth-overlay";
    ov.innerHTML = `
      <div class="auth-card">
        <img class="auth-logo" src="logo_mmi.jpg" alt="MMI">
        <h2 class="auth-title">Gestion MMI</h2>
        <p class="auth-sub">IUT de Béziers — Accès réservé</p>
        <form id="auth-form" autocomplete="on" onsubmit="event.preventDefault(); AUTH._doLogin();">
          <input id="auth-login" class="auth-input" type="text"     placeholder="Identifiant"   autocomplete="username" autofocus>
          <input id="auth-pwd"   class="auth-input" type="password" placeholder="Mot de passe"  autocomplete="current-password">
          <button id="auth-btn"  class="auth-btn" type="submit">Connexion</button>
        </form>
        <p id="auth-err" class="auth-err" style="display:none">Identifiant ou mot de passe incorrect.</p>
      </div>`;
    document.body.appendChild(ov);
  },

  async _doLogin() {
    const login = document.getElementById("auth-login").value;
    const pwd = document.getElementById("auth-pwd").value;
    const btn = document.getElementById("auth-btn");
    const err = document.getElementById("auth-err");
    btn.disabled = true;
    btn.textContent = "…";
    err.style.display = "none";
    try {
      if (_extraUsersPromise)
        await _extraUsersPromise; /* Attendre le chargement des utilisateurs GitHub */
      if (await AUTH.login(login, pwd)) {
        document.getElementById("auth-overlay").remove();
        const appRoot = document.getElementById("app-root");
        if (appRoot) appRoot.style.display = "";
        window.dispatchEvent(new Event("auth-success"));
      } else {
        err.style.display = "block";
        document.getElementById("auth-pwd").value = "";
        btn.disabled = false;
        btn.textContent = "Connexion";
        document.getElementById("auth-pwd").focus();
      }
    } catch (e) {
      err.textContent = "Erreur d'authentification (" + e.message + ").";
      err.style.display = "block";
      btn.disabled = false;
      btn.textContent = "Connexion";
    }
  },

  injectBadge() {
    const s = _sess();
    if (!s || document.getElementById("auth-badge")) return;
    const badge = document.createElement("div");
    badge.id = "auth-badge";
    badge.innerHTML = `
      <span class="auth-badge-user">${s.login}</span>
      <span class="auth-badge-role">${AUTH.canWrite() ? "Lecture/Écriture" : "Lecture seule"}</span>
      <button class="auth-badge-logout" onclick="AUTH.logout()">Déconnexion</button>`;
    const hdr = document.querySelector(".header-inner");
    if (hdr) hdr.appendChild(badge);
  },

  /* Applique les restrictions d'interface (utilisé par Répartition) */
  applyPermissions() {
    const navMods = document.getElementById("nav-modifications");
    if (navMods) navMods.style.display = this.isAdmin() ? "" : "none";
    const navPilotage = document.getElementById("nav-pilotage");
    if (navPilotage) navPilotage.style.display = this.isAdmin() ? "" : "none";

    if (this.canWrite()) {
      document.body.classList.remove("auth-readonly");
      return;
    }
    document.body.classList.add("auth-readonly");
    document.querySelectorAll("#app-root select").forEach((s) => {
      s.disabled = true;
    });
    const writeActions = [
      "saveAffectationsGH",
      "saveMaquetteGH",
      "saveEnseignantsGH",
      "addEns",
      "deleteEns",
      "openEditEnsModal",
      "addSubrow",
      "removeSubrow",
      "saveEditEns",
    ];
    document.querySelectorAll("#app-root button[onclick]").forEach((btn) => {
      const oc = btn.getAttribute("onclick") || "";
      if (writeActions.some((fn) => oc.includes(fn)))
        btn.style.display = "none";
    });
  },
};
