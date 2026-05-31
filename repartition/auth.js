"use strict";

/* ── Utilisateurs (hachages SHA-256) ─────────────────────────────────────────
   Pour générer les hachages, ouvrir la console du navigateur sur cette page et
   coller la commande fournie dans le README ou le message de déploiement.
   Remplacer ensuite chaque "HASH_..." par la valeur retournée.
   ─────────────────────────────────────────────────────────────────────────── */
const _U = {
  chefdep: {
    h: "eeb705ce8d0aa8255bea1e65ac2633938eb36bb496b92695f8475428ef5313f1",
    rw: true,
  },
  dev: {
    h: "e9f6d4e3a860db8eec3bfc8dcf84186e7cfb24216f8c191d6f423a159250c7ec",
    rw: true,
  },
  crea: {
    h: "92bbadd93a744ec77a19eef8d0df9bbb354ced75ceefa18581a2c7a37c880746",
    rw: true,
  },
  edt: {
    h: "08bd382e37e89970a9fc8dcb6cc9392b49daf28f6cc0c37c7fe8f7c3d5a331e3",
    rw: false,
  },
  sec: {
    h: "651452ffac1d672f0bcb9fc86436fbca73f88fa3e416102b5f8b52992e5c33fd",
    rw: false,
  },
};

const _SK = "rep_auth_v1";

/* Fallback SHA-256 pur JS (contexte non-HTTPS où crypto.subtle est absent) */
function _sha256Pure(bytes) {
  function w(n) { return n >>> 0; }
  function ror(n, b) { return w((n >>> b) | (n << (32 - b))); }
  const K = new Uint32Array([
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
  ]);
  const H = new Uint32Array([
    0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19,
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
      const s0 = ror(W[j-15],7) ^ ror(W[j-15],18) ^ (W[j-15] >>> 3);
      const s1 = ror(W[j-2],17)  ^ ror(W[j-2],19)  ^ (W[j-2]  >>> 10);
      W[j] = w(W[j-16] + s0 + W[j-7] + s1);
    }
    let a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
    for (let j = 0; j < 64; j++) {
      const S1 = ror(e,6)  ^ ror(e,11)  ^ ror(e,25);
      const ch = (e & f)   ^ (~e & g);
      const t1 = w(h + S1 + ch + K[j] + W[j]);
      const S0 = ror(a,2)  ^ ror(a,13)  ^ ror(a,22);
      const mj = (a & b)   ^ (a & c)    ^ (b & c);
      const t2 = w(S0 + mj);
      h=g; g=f; f=e; e=w(d+t1); d=c; c=b; b=a; a=w(t1+t2);
    }
    H[0]=w(H[0]+a); H[1]=w(H[1]+b); H[2]=w(H[2]+c); H[3]=w(H[3]+d);
    H[4]=w(H[4]+e); H[5]=w(H[5]+f); H[6]=w(H[6]+g); H[7]=w(H[7]+h);
  }
  return [...H].map(x => x.toString(16).padStart(8, "0")).join("");
}

async function _sha256(s) {
  const bytes = new TextEncoder().encode(s);
  if (window.crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
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

window.AUTH = {
  isAuth: () => _sess() !== null,
  canWrite: () => {
    const s = _sess();
    return !!s && s.rw;
  },
  isAdmin: () => _sess()?.login === "chefdep",
  user: () => _sess()?.login ?? null,

  async login(login, pwd) {
    const u = _U[login.trim().toLowerCase()];
    if (!u) return false;
    if ((await _sha256(pwd)) !== u.h) return false;
    sessionStorage.setItem(
      _SK,
      JSON.stringify({ login: login.trim().toLowerCase(), rw: u.rw }),
    );
    return true;
  },

  logout() {
    sessionStorage.removeItem(_SK);
    location.reload();
  },

  injectUI() {
    if (_sess()) return;
    const appRoot = document.getElementById("app-root");
    if (appRoot) appRoot.style.display = "none";

    const ov = document.createElement("div");
    ov.id = "auth-overlay";
    ov.innerHTML = `
      <div class="auth-card">
        <img class="auth-logo" src="../logo_mmi.jpg" alt="MMI">
        <h2 class="auth-title">Répartition MMI</h2>
        <p class="auth-sub">Accès réservé — identifiez-vous</p>
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
      if (await AUTH.login(login, pwd)) {
        document.getElementById("auth-overlay").remove();
        document.getElementById("app-root").style.display = "";
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
      <span class="auth-badge-role">${s.rw ? "Lecture/Écriture" : "Lecture seule"}</span>
      <button class="auth-badge-logout" onclick="AUTH.logout()">Déconnexion</button>`;
    const hdr = document.querySelector(".header-inner");
    if (hdr) hdr.appendChild(badge);
  },

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
