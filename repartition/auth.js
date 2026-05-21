"use strict";

/* ── Utilisateurs (hachages SHA-256) ─────────────────────────────────────────
   Pour générer les hachages, ouvrir la console du navigateur sur cette page et
   coller la commande fournie dans le README ou le message de déploiement.
   Remplacer ensuite chaque "HASH_..." par la valeur retournée.
   ─────────────────────────────────────────────────────────────────────────── */
const _U = {
  chedep: {
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

async function _sha256(s) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s),
  );
  return [...new Uint8Array(buf)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
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
