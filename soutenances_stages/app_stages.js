"use strict";
const SK = "sout_v1_";
const PAGE_ID = (location.pathname.split("/").pop() || "index")
  .replace(".html", "")
  .replace("_stages", "");
const GH_OWNER = "nico3807";
const GH_REPO = "Applications_gestion";
const GH_BRANCH = "main";
let APP_CONFIG = {
  enseignants: [],
  salles: [],
  horaires: {},
  etudiants: {},
};
let _cfgImportedNames = [];

/* ── Populators ─────────────────────────────────────────────────── */
function populateSelects() {
  document.querySelectorAll(".tselect").forEach((select) => {
    const lbl = select.previousElementSibling;
    let options = null;

    if (select.dataset.type === "tuteur") {
      options = APP_CONFIG.enseignants;
    } else if (lbl && lbl.classList.contains("mlbl")) {
      const labelText = lbl.textContent.trim();
      if (labelText.startsWith("Enseignant")) {
        options = APP_CONFIG.enseignants;
      } else if (labelText === "Salle") {
        options = APP_CONFIG.salles;
      }
    }

    if (options && options.length > 0) {
      select.innerHTML = `<option value="">— Sélectionner —</option>`;
      options.forEach((opt) => {
        select.add(new Option(opt, opt));
      });
    }
  });
}

/* ── localStorage auto-save ──────────────────────────────────────── */
function saveT(el) {
  localStorage.setItem(SK + el.id, el.value);
  el.classList.toggle("filled", !!el.value);
  const pv = el.parentElement.querySelector(".print-val");
  if (pv) pv.textContent = el.value || "";
  scheduleAutoSave();
}

/* ── Auto-save GitHub (R/W uniquement, déclenché après délai) ────── */
let _autoSaveTimer = null;

function scheduleAutoSave() {
  if (!AUTH.canWrite() || !isGHConfigured()) return;
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(doAutoSave, 1800);
}

async function doAutoSave() {
  const editedNames = {};
  document.querySelectorAll(".sname[data-skey]").forEach((el) => {
    const key = el.getAttribute("data-skey");
    const val = el.textContent.trim();
    if (key) editedNames[key] = val;
  });
  const changedNames = Object.entries(editedNames).filter(
    ([k, v]) => (APP_CONFIG.etudiants[k] || "") !== v,
  );
  const ts = new Date().toLocaleString("fr-FR");
  try {
    await saveJsonToGitHub(
      "soutenances_stages/donnees_stages.json",
      buildJSON(),
      `Mise à jour ${PAGE_ID} — ${ts}`,
    );
    if (changedNames.length > 0) {
      const merged = { ...APP_CONFIG.etudiants };
      for (const [k, v] of changedNames) {
        if (v) merged[k] = v;
        else delete merged[k];
      }
      await saveJsonToGitHub(
        "soutenances_stages/etudiants_stages.json",
        JSON.stringify(merged, null, 2),
        `Mise à jour noms ${PAGE_ID} — ${ts}`,
      );
      APP_CONFIG.etudiants = merged;
    }
    showToast("✓ Sauvegardé automatiquement");
  } catch (e) {
    showToast("✗ GitHub : " + e.message);
  }
}

function loadAll() {
  document.querySelectorAll(".tselect").forEach((el) => {
    const v = localStorage.getItem(SK + el.id);
    if (v !== null) {
      el.value = v;
      el.classList.toggle("filled", !!v);
    }
    const pv = el.parentElement.querySelector(".print-val");
    if (pv) pv.textContent = el.value || "";
  });
}

/* ── JSON helpers ─────────────────────────────────────────────────── */
function buildJSON() {
  // S'assure que les sélections actuelles de la page sont bien dans le localStorage
  document.querySelectorAll(".tselect").forEach((el) => {
    if (el.value) {
      localStorage.setItem(SK + el.id, el.value);
    } else {
      localStorage.removeItem(SK + el.id);
    }
  });

  const data = {
    _enseignants: APP_CONFIG.enseignants,
    _salles: APP_CONFIG.salles,
  };
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(SK)) {
      data[key.replace(SK, "")] = localStorage.getItem(key);
    }
  }
  return JSON.stringify(data, null, 2);
}

function applyJSON(text) {
  try {
    const data = JSON.parse(text);
    if (data._enseignants) {
      APP_CONFIG.enseignants = data._enseignants.sort((a, b) =>
        a.localeCompare(b, "fr"),
      );
    }
    if (data._salles) {
      APP_CONFIG.salles = data._salles.sort((a, b) => a.localeCompare(b, "fr"));
    }
    populateSelects();

    for (const [id, val] of Object.entries(data)) {
      if (id.startsWith("_")) continue;
      localStorage.setItem(SK + id, val);
      const el = document.getElementById(id);
      if (el) {
        el.value = val;
        el.classList.toggle("filled", !!val);
        const pv = el.parentElement.querySelector(".print-val");
        if (pv) pv.textContent = val || "";
      }
    }
  } catch (e) {
    console.error("Erreur de lecture JSON", e);
  }
}

/* ── GitHub API (relayée par api/gh-proxy.php — le token reste côté serveur,
   aucune configuration n'est nécessaire côté client) ────────────────────── */
function isGHConfigured() {
  return true;
}

function ghFilePath() {
  return `soutenances_stages/donnees_stages.json`;
}

async function fetchGHJson(path) {
  const url = `/api/gh-proxy.php?path=${encodeURIComponent(path)}&ref=${GH_BRANCH}`;
  const resp = await fetch(url, {
    cache: "no-cache",
    credentials: "include",
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!resp.ok) return null;
  const json = await resp.json();
  return decodeURIComponent(escape(atob(json.content.replace(/\n/g, ""))));
}

async function loadFromGitHub() {
  try {
    const text = await fetchGHJson(ghFilePath());
    if (!text) return false;
    applyJSON(text);
    showToast("↺ Sélections restaurées depuis GitHub");
    return true;
  } catch {
    return false;
  }
}

async function loadHorairesFromGitHub() {
  if (document.getElementById("juries-root")?.children.length > 0) return;
  try {
    const text = await fetchGHJson("soutenances_stages/horaires_stages.json");
    if (!text) return;
    const data = JSON.parse(text);
    APP_CONFIG.horaires = data;
    renderJuries(PAGE_ID);
    applyHoraires(data);
  } catch {
    /* ignore */
  }
}

async function saveJsonToGitHub(filename, jsonStr, message) {
  const url = `/api/gh-proxy.php?path=${encodeURIComponent(filename)}`;
  const content = btoa(unescape(encodeURIComponent(jsonStr)));
  let sha = null;
  try {
    const r = await fetch(`${url}&ref=${GH_BRANCH}&_t=${Date.now()}`, {
      cache: "no-cache",
      credentials: "include",
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    if (r.ok) sha = (await r.json()).sha;
  } catch {
    /* fichier inexistant */
  }
  const body = { message, content };
  if (sha) body.sha = sha;
  const r = await fetch(url, {
    method: "PUT",
    credentials: "include",
    headers: {
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Erreur ${r.status}`);
  }
}

async function saveToGitHub() {
  try {
    await saveJsonToGitHub(
      "soutenances_stages/donnees_stages.json",
      buildJSON(),
      `Mise à jour ${PAGE_ID} — ${new Date().toLocaleString("fr-FR")}`,
    );
    showToast("✓ Sauvegarde sur GitHub réussie");
    return true;
  } catch (e) {
    showToast("✗ GitHub : " + e.message);
    return false;
  }
}

/* ── Config modal ────────────────────────────────────────────────── */
const CFG_LEVELS = {
  mmi2_init: "MMI 2 — Initiaux",
  mmi2_alt: "MMI 2 — Alternants",
  mmi3_init: "MMI 3 — Initiaux",
  mmi3_alt: "MMI 3 — Alternants",
};
const CFG_MAX_JURIES = 8;
const CFG_MAX_CRENEAUX = 8;
const CFG_MAX_TEACHERS = 5;

function parseJuryDate(str) {
  str = (str || "").trim();
  if (/après[\s-]midi$/i.test(str)) {
    return {
      dateStr: str.replace(/\s*après[\s-]midi$/i, "").trim(),
      period: "après-midi",
    };
  }
  return { dateStr: str.replace(/\s*matin$/i, "").trim(), period: "matin" };
}

const FR_MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];
const FR_DAYS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

function frenchToIso(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.trim().split(/\s+/);
  // "Lundi 22 juin 2026" → offset 1 ; "22 juin 2026" → offset 0
  const offset = parts.length >= 4 ? 1 : parts.length === 3 ? 0 : -1;
  if (offset < 0) return "";
  const day = parseInt(parts[offset], 10);
  const monthStr = (parts[offset + 1] || "").toLowerCase();
  const year = parseInt(parts[offset + 2], 10);
  if (!day || !year) return "";
  const m = FR_MONTHS.findIndex((x) => x.toLowerCase() === monthStr);
  if (m === -1) return "";
  return `${year}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isoToFrench(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  const date = new Date(y, m - 1, d);
  return `${FR_DAYS[date.getDay()]} ${d} ${FR_MONTHS[m - 1]} ${y}`;
}

function getJuryCount(level) {
  let n = 0;
  for (let i = 1; i <= CFG_MAX_JURIES; i++) {
    if (
      APP_CONFIG.horaires[`${level}_jury${i}_date`] !== undefined ||
      APP_CONFIG.horaires[`${level}_jury${i}_creneau1`] !== undefined
    )
      n = i;
  }
  return n || 1;
}

function getTeacherCount(level) {
  const stored = parseInt(APP_CONFIG.horaires[`${level}_teacher_count`]);
  if (!isNaN(stored) && stored >= 1) return stored;
  return PAGE_LEVEL_CFG[level]?.teachers ?? 2;
}

const PAGE_LEVEL_CFG = {
  mmi2_init: { teachers: 2 },
  mmi2_alt: { teachers: 2 },
  mmi3_init: { teachers: 2 },
  mmi3_alt: { teachers: 2 },
};

function getBadgeClass(badge) {
  if (badge === "crea") return { cls: "badge badge-crea", lbl: "Créa" };
  if (badge === "dweb") return { cls: "badge badge-dweb", lbl: "DWeb-DI" };
  return { cls: "badge badge-empty", lbl: "—" };
}

function renderJuries(level) {
  const root = document.getElementById("juries-root");
  if (!root) return;
  const cfg = PAGE_LEVEL_CFG[level];
  if (!cfg) return;

  const h = APP_CONFIG.horaires;
  const teacherCount = getTeacherCount(level);

  const sectionDates = [];
  for (let i = 1; i <= 20; i++) {
    const d = h[`${level}_date${i}`];
    if (d === undefined) break;
    if (!sectionDates.includes(d)) sectionDates.push(d);
  }

  let juryCount = 0;
  for (let i = 1; i <= CFG_MAX_JURIES; i++) {
    if (
      h[`${level}_jury${i}_date`] !== undefined ||
      h[`${level}_jury${i}_creneau1`] !== undefined
    )
      juryCount = i;
  }
  if (juryCount === 0) {
    root.innerHTML = "";
    return;
  }

  const sectionJuries = {};
  for (let n = 1; n <= juryCount; n++) {
    const juryDate = h[`${level}_jury${n}_date`] || "";
    let si = sectionDates.indexOf(juryDate);
    if (si === -1) si = Math.max(0, sectionDates.length - 1);
    if (!sectionJuries[si]) sectionJuries[si] = [];
    sectionJuries[si].push(n);
  }
  if (sectionDates.length === 0) {
    sectionJuries[0] = Array.from({ length: juryCount }, (_, i) => i + 1);
  }

  let html = "";
  const numSections = Math.max(sectionDates.length, 1);
  for (let si = 0; si < numSections; si++) {
    const juries = sectionJuries[si] || [];
    if (juries.length === 0) continue;
    const dateKey = `${level}_date${si + 1}`;
    html += `<div class="section"><div class="sec-date"><h2 id="${dateKey}"></h2></div><div class="jgrid">`;
    juries.forEach((juryN, pos) => {
      const bi = getBadgeClass(h[`${level}_jury${juryN}_badge`]);
      const showParcours = bi.cls !== "badge badge-empty";
      let meta = "";
      for (let t = 0; t < teacherCount; t++) {
        meta += `<div class="mrow"><span class="mlbl">Enseignant ${t + 1}</span><select class="tselect" id="${level}_${si}_${pos}_${t}" aria-label="Enseignant ${t + 1}" onchange="saveT(this)"><option value="">— Sélectionner —</option></select><span class="print-val"></span></div>`;
      }
      meta += `<div class="mrow"><span class="mlbl">Salle</span><select class="tselect" id="${level}_${si}_${pos}_salle" aria-label="Salle" onchange="saveT(this)"><option value="">— Sélectionner —</option></select><span class="print-val"></span></div>`;
      let rows = "";
      for (let m = 1; m <= CFG_MAX_CRENEAUX; m++) {
        const ck = `${level}_jury${juryN}_creneau${m}`;
        if (h[ck] === undefined) break;
        const sk = `${level}_jury${juryN}_sname${m}`;
        rows += `<tr><td><span id="${ck}"></span></td><td><span class="sname sname-edit" contenteditable="true" data-skey="${sk}" spellcheck="false"></span></td>${showParcours ? `<td><span class="${bi.cls}">${bi.lbl}</span></td>` : ""}<td><select class="tselect tselect-tuteur" id="${ck}_tuteur" data-type="tuteur" aria-label="Tuteur" onchange="saveT(this)"><option value="">—</option></select><span class="print-val"></span></td></tr>`;
      }
      html += `<div class="jcard"><div class="jcard-hdr"><span class="jury-name">Jury ${juryN}</span><span class="jury-date" id="${level}_jury${juryN}_date"></span></div><div class="jcard-meta">${meta}</div><table class="stable"><thead><tr><th>Horaire</th><th>Étudiant</th>${showParcours ? "<th>Parcours</th>" : ""}<th>Tuteur</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    });
    html += `</div></div>`;
  }
  root.innerHTML = html;
}

function injectCfgUI() {
  const levelOptions = Object.entries(CFG_LEVELS)
    .map(([k, v]) => `<option value="${k}">${v}</option>`)
    .join("");
  const modal = document.createElement("div");
  modal.id = "cfg-modal";
  modal.className = "gh-modal-overlay";
  modal.innerHTML = `
<div class="cfg-modal">
  <div class="gh-modal-hdr">
    <span>⚙ Configuration des soutenances</span>
    <button class="gh-modal-close" onclick="closeCfgModal()">✕</button>
  </div>
  <div class="cfg-modal-body">
    <div class="cfg-top-row">
      <div class="gh-form-group" style="margin:0">
        <label class="gh-label">Niveau</label>
        <select id="cfg-level" class="gh-input" onchange="cfgOnLevelChange()">${levelOptions}</select>
      </div>
      <div class="gh-form-group" style="margin:0">
        <label class="gh-label">Nombre de jurys</label>
        <input type="number" id="cfg-jury-count" class="gh-input" min="1" max="${CFG_MAX_JURIES}"
               style="width:70px" oninput="cfgUpdateJuryVisibility()">
      </div>
      <div class="gh-form-group" style="margin:0">
        <label class="gh-label">Nb enseignants / jury</label>
        <input type="number" id="cfg-teacher-count" class="gh-input" min="1" max="${CFG_MAX_TEACHERS}"
               style="width:70px">
      </div>
    </div>
    <div id="cfg-juries-container"></div>
    <div class="cfg-import-section">
      <div class="cfg-section-lbl">Importer les candidats</div>
      <div class="cfg-import-row">
        <label class="gh-label" style="white-space:nowrap;margin:0">Fichier .txt</label>
        <input type="file" id="cfg-import-file" accept=".txt"
               class="gh-input cfg-file-input" onchange="cfgImportFile(this)">
        <span class="gh-hint" style="white-space:nowrap">Un nom par ligne</span>
      </div>
      <div id="cfg-import-preview" class="cfg-import-preview"></div>
    </div>
    <div id="cfg-status" class="gh-status" style="display:none;margin-top:12px"></div>
  </div>
  <div class="gh-modal-footer">
    <span style="flex:1"></span>
    <button class="gh-btn-clear" onclick="closeCfgModal()">Annuler</button>
    <button class="gh-btn-save" onclick="saveCfgModal()">Valider</button>
  </div>
</div>`;
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeCfgModal();
  });
  document.body.appendChild(modal);
}

function cfgResetImport() {
  _cfgImportedNames = [];
  const preview = document.getElementById("cfg-import-preview");
  if (preview) preview.innerHTML = "";
  const fileInput = document.getElementById("cfg-import-file");
  if (fileInput) fileInput.value = "";
}

function cfgGetSlotsPerJury() {
  const count = parseInt(document.getElementById("cfg-jury-count").value) || 1;
  const level = document.getElementById("cfg-level").value;
  const slots = [];
  for (let n = 1; n <= count; n++) {
    let s = 0;
    for (let m = 1; m <= CFG_MAX_CRENEAUX; m++) {
      const el = document.getElementById(`cfg-j${n}-c${m}`);
      if (el && el.value.trim()) s = m;
    }
    if (s === 0) {
      for (let m = 1; m <= CFG_MAX_CRENEAUX; m++) {
        if (APP_CONFIG.horaires[`${level}_jury${n}_creneau${m}`]) s = m;
      }
    }
    slots.push(s || 0);
  }
  return slots;
}

function cfgImportFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const names = e.target.result
      .split(/\r?\n/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0);
    _cfgImportedNames = names;
    cfgShowImportPreview(names);
  };
  reader.readAsText(file, "UTF-8");
}

function cfgShowImportPreview(names) {
  const preview = document.getElementById("cfg-import-preview");
  if (!preview) return;
  if (!names.length) {
    preview.innerHTML = "";
    return;
  }
  const count = parseInt(document.getElementById("cfg-jury-count").value) || 1;
  const slots = cfgGetSlotsPerJury();
  let idx = 0;
  let html = `<div class="cfg-import-preview-list">`;
  for (let n = 1; n <= count; n++) {
    const s = slots[n - 1] || 0;
    html += `<div class="cfg-import-jury"><strong>Jury ${n}</strong><ol>`;
    for (let m = 1; m <= s; m++) {
      html += `<li>${idx < names.length ? names[idx++] : "<em>—</em>"}</li>`;
    }
    html += `</ol></div>`;
  }
  html += `</div>`;
  if (idx < names.length) {
    html += `<p class="cfg-import-warn">⚠ ${names.length - idx} nom(s) ignoré(s) — plus de noms que de créneaux</p>`;
  }
  preview.innerHTML = html;
}

function openCfgModal() {
  const pwd = prompt(
    "Veuillez saisir le mot de passe pour accéder à la configuration :",
  );
  if (pwd === null) return;
  const secret = [
    126, 110, 90, 94, 130, 34, 94, 96, 104, 105, 110, 42, 41, 44, 41,
  ];
  const isAuth =
    pwd.length === secret.length &&
    pwd.split("").every((c, i) => (c.charCodeAt(0) ^ 45) + i === secret[i]);
  if (!isAuth) {
    alert("Mot de passe incorrect. Accès refusé.");
    return;
  }
  cfgResetImport();
  const levelEl = document.getElementById("cfg-level");
  if (levelEl && PAGE_ID in CFG_LEVELS) levelEl.value = PAGE_ID;
  cfgOnLevelChange();
  document.getElementById("cfg-modal").classList.add("open");
}

function closeCfgModal() {
  document.getElementById("cfg-modal").classList.remove("open");
}

function cfgOnLevelChange() {
  const level = document.getElementById("cfg-level").value;
  const count = getJuryCount(level);
  document.getElementById("cfg-jury-count").value = count;
  document.getElementById("cfg-teacher-count").value = getTeacherCount(level);
  buildCfgJuries(level, count);
  cfgResetImport();
}

function buildCfgJuries(level, count) {
  let html = "";
  for (let n = 1; n <= CFG_MAX_JURIES; n++) {
    const { dateStr, period } = parseJuryDate(
      APP_CONFIG.horaires[`${level}_jury${n}_date`] || "",
    );
    const isoDate = frenchToIso(dateStr);
    const currentBadge =
      APP_CONFIG.horaires[`${level}_jury${n}_badge`] || "empty";
    let creneauxHtml = "";
    for (let m = 1; m <= CFG_MAX_CRENEAUX; m++) {
      const val = APP_CONFIG.horaires[`${level}_jury${n}_creneau${m}`] || "";
      creneauxHtml += `
        <div class="cfg-creneau-row">
          <span class="cfg-creneau-lbl">${m}</span>
          <input type="text" id="cfg-j${n}-c${m}" class="gh-input cfg-creneau-input"
                 value="${val}" placeholder="—">
        </div>`;
    }
    html += `
      <div class="cfg-jury-section" id="cfg-jury-${n}"${n > count ? ' style="display:none"' : ""}>
        <div class="cfg-jury-hdr">
          <span class="cfg-jury-num">Jury ${n}</span>
        </div>
        <div class="cfg-jury-date-row">
          <label class="gh-label" style="white-space:nowrap">Date</label>
          <input type="date" id="cfg-j${n}-date" class="gh-input cfg-date-input"
                 value="${isoDate}">
          <select id="cfg-j${n}-period" class="gh-input cfg-period-select">
            <option value="matin"${period === "matin" ? " selected" : ""}>matin</option>
            <option value="après-midi"${period === "après-midi" ? " selected" : ""}>après-midi</option>
          </select>
          <select id="cfg-j${n}-badge" class="gh-input cfg-badge-select">
            <option value="empty"${currentBadge === "empty" ? " selected" : ""}>— Parcours —</option>
            <option value="crea"${currentBadge === "crea" ? " selected" : ""}>Créa</option>
            <option value="dweb"${currentBadge === "dweb" ? " selected" : ""}>DWeb-DI</option>
          </select>
        </div>
        <div class="cfg-creneaux">${creneauxHtml}</div>
      </div>`;
  }
  document.getElementById("cfg-juries-container").innerHTML = html;
}

function cfgUpdateJuryVisibility() {
  const count = parseInt(document.getElementById("cfg-jury-count").value) || 1;
  for (let n = 1; n <= CFG_MAX_JURIES; n++) {
    const el = document.getElementById(`cfg-jury-${n}`);
    if (el) el.style.display = n <= count ? "" : "none";
  }
  if (_cfgImportedNames.length > 0) cfgShowImportPreview(_cfgImportedNames);
}

function showCfgStatus(msg, type) {
  const s = document.getElementById("cfg-status");
  if (!s) return;
  s.textContent = msg;
  s.className = `gh-status gh-status--${type}`;
  s.style.display = "block";
}

async function saveCfgModal() {
  if (!isGHConfigured()) {
    showCfgStatus(
      "Configurez d'abord GitHub via le lien en bas de page.",
      "error",
    );
    return;
  }
  const level = document.getElementById("cfg-level").value;
  const juryCount =
    parseInt(document.getElementById("cfg-jury-count").value) || 1;
  const teacherCount =
    parseInt(document.getElementById("cfg-teacher-count").value) || 2;
  const newEntries = {};
  newEntries[`${level}_teacher_count`] = teacherCount;
  const uniqueDates = [];

  for (let n = 1; n <= juryCount; n++) {
    const isoDate = (
      document.getElementById(`cfg-j${n}-date`)?.value || ""
    ).trim();
    const period =
      document.getElementById(`cfg-j${n}-period`)?.value || "matin";
    const dateStr = isoToFrench(isoDate);
    const fullDate = `${dateStr} ${period}`;
    newEntries[`${level}_jury${n}_date`] = fullDate;
    if (!uniqueDates.includes(fullDate)) uniqueDates.push(fullDate);
    const badge = document.getElementById(`cfg-j${n}-badge`)?.value || "empty";
    newEntries[`${level}_jury${n}_badge`] = badge;
    for (let m = 1; m <= CFG_MAX_CRENEAUX; m++) {
      const val = (
        document.getElementById(`cfg-j${n}-c${m}`)?.value || ""
      ).trim();
      if (val) newEntries[`${level}_jury${n}_creneau${m}`] = val;
    }
  }
  uniqueDates.forEach((d, i) => {
    newEntries[`${level}_date${i + 1}`] = d;
  });

  const merged = {};
  for (const [k, v] of Object.entries(APP_CONFIG.horaires)) {
    if (!k.startsWith(`${level}_`)) merged[k] = v;
  }
  Object.assign(merged, newEntries);

  showCfgStatus("Sauvegarde en cours…", "info");
  try {
    const ts = new Date().toLocaleString("fr-FR");
    await saveJsonToGitHub(
      "soutenances_stages/horaires_stages.json",
      JSON.stringify(merged, null, 2),
      `Config horaires ${level} — ${ts}`,
    );
    await saveJsonToGitHub(
      "soutenances_stages/donnees_stages.json",
      buildJSON(),
      `Sync donnees ${level} — ${ts}`,
    );
    APP_CONFIG.horaires = merged;
    if (level === PAGE_ID) {
      renderJuries(level);
      populateSelects();
      loadAll();
    }
    applyHoraires(merged);

    if (_cfgImportedNames.length > 0) {
      const slots = cfgGetSlotsPerJury();
      let idx = 0;
      const etudiantsEntries = {};
      for (let n = 1; n <= juryCount; n++) {
        for (let m = 1; m <= (slots[n - 1] || 0); m++) {
          if (idx < _cfgImportedNames.length) {
            etudiantsEntries[`${level}_jury${n}_sname${m}`] =
              _cfgImportedNames[idx++];
          }
        }
      }
      const mergedEtudiants = {};
      for (const [k, v] of Object.entries(APP_CONFIG.etudiants)) {
        if (!k.startsWith(`${level}_`)) mergedEtudiants[k] = v;
      }
      Object.assign(mergedEtudiants, etudiantsEntries);
      await saveJsonToGitHub(
        "soutenances_stages/etudiants_stages.json",
        JSON.stringify(mergedEtudiants, null, 2),
        `Candidats ${level} — ${ts}`,
      );
      APP_CONFIG.etudiants = mergedEtudiants;
      applyEtudiants(mergedEtudiants);
    } else if (level === PAGE_ID) {
      applyEtudiants(APP_CONFIG.etudiants);
    }

    showCfgStatus("✓ Configuration sauvegardée !", "success");
    setTimeout(closeCfgModal, 1400);
  } catch (e) {
    showCfgStatus("✗ " + e.message, "error");
  }
}

/* ── Sauvegarder (conservé pour compatibilité, appelle doAutoSave) ── */
async function saveSelectionsToFile() {
  await doAutoSave();
}

/* ── Auto-load depuis le dossier courant (serveur local) ─────────── */
async function loadFromServer() {
  try {
    // Tente de récupérer donnees_stages.json s'il est accessible à la racine
    const resp = await fetch("donnees_stages.json", { cache: "no-store" });
    if (resp.ok) {
      const text = await resp.text();
      applyJSON(text);
      console.log(
        "Sélections chargées depuis donnees_stages.json (dossier courant)",
      );
    }
  } catch (e) {
    /* Ignore (échouera si ouvert en file:// sans serveur) */
  }
}

function applyHoraires(data) {
  for (const [id, val] of Object.entries(data)) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
}

function applyEtudiants(data) {
  for (const [id, val] of Object.entries(data)) {
    const m = id.match(/^(.+_jury\d+)_sname(\d+)$/);
    if (!m) continue;
    const creneauEl = document.getElementById(`${m[1]}_creneau${m[2]}`);
    if (creneauEl) {
      const snameEl = creneauEl.closest("tr")?.querySelector(".sname");
      if (snameEl) snameEl.textContent = val;
    }
  }
}

function applyIndexDates(data) {
  // Cherche tous les éléments avec data-dates dans la page
  document.querySelectorAll("[data-dates]").forEach((el) => {
    const keyPrefix = el.getAttribute("data-dates"); // ex: "mmi1_date"
    const dates = [];

    // Cherche toutes les clés qui correspondent au préfixe
    for (const [key, val] of Object.entries(data)) {
      if (key.startsWith(keyPrefix) && typeof val === "string") {
        // Extrait le jour et mois de la chaîne (ex: "Lundi 22 juin 2026 matin" → "22 juin")
        const match = val.match(/(\d+\s+\w+)\s+\d+/);
        if (match) {
          const dateStr = match[1]; // "22 juin"
          if (!dates.some((d) => d === dateStr)) {
            dates.push(dateStr); // Ajoute si pas encore présent
          }
        }
      }
    }

    // Formate et affiche les dates
    if (dates.length > 0) {
      // Extrait l'année de la première date trouvée
      const yearMatch = data[keyPrefix + "1"]?.match(/(\d{4})/);
      const year = yearMatch ? yearMatch[1] : "";

      // Combine les dates : "22 & 23 juin 2026" ou "30 juin & 1er juillet 2026"
      const dateStr = dates.join(" & ") + (year ? ` ${year}` : "");
      el.textContent = dateStr;
    }
  });
}

async function loadHoraires() {
  try {
    const resp = await fetch("horaires_stages.json", { cache: "no-store" });
    if (resp.ok) {
      const data = await resp.json();
      APP_CONFIG.horaires = data;
      renderJuries(PAGE_ID);
      applyHoraires(data);
      if (PAGE_ID === "index") applyIndexDates(data);
      return;
    }
  } catch {
    /* file:// or server error — try raw GitHub */
  }
  try {
    const rawUrl = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/soutenances_stages/horaires_stages.json`;
    const resp = await fetch(rawUrl, { cache: "no-store" });
    if (resp.ok) {
      const data = await resp.json();
      APP_CONFIG.horaires = data;
      renderJuries(PAGE_ID);
      applyHoraires(data);
      if (PAGE_ID === "index") applyIndexDates(data);
    }
  } catch (e) {
    console.warn("Impossible de charger horaires_stages.json", e);
  }
}

async function loadEtudiants() {
  try {
    const resp = await fetch("etudiants_stages.json", { cache: "no-store" });
    if (resp.ok) {
      const data = await resp.json();
      APP_CONFIG.etudiants = data;
      applyEtudiants(data);
    }
  } catch (e) {
    console.warn("etudiants_stages.json non trouvé.", e);
  }
}
/* ── Toast ───────────────────────────────────────────────────────── */
function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}

/* ── PDF export ──────────────────────────────────────────────────── */
function exportPDF() {
  document.querySelectorAll(".tselect").forEach((el) => {
    const pv = el.parentElement.querySelector(".print-val");
    if (pv) pv.textContent = el.value || "";
  });
  showToast("Ouverture de la boîte de dialogue impression…");
  setTimeout(() => window.print(), 300);
}

/* ── XLSX export ─────────────────────────────────────────────────── */
function exportXLSX() {
  if (typeof XLSX === "undefined") {
    showToast("⚠ Bibliothèque XLSX non disponible");
    return;
  }
  const firstCard = document.querySelector(".jcard");
  if (!firstCard) {
    showToast("⚠ Aucune donnée à exporter");
    return;
  }

  const teacherCount = Array.from(firstCard.querySelectorAll(".mrow")).filter(
    (row) =>
      row.querySelector(".mlbl")?.textContent.trim().startsWith("Enseignant"),
  ).length;

  const headerTeachers = Array.from(
    { length: teacherCount },
    (_, i) => `Enseignant ${i + 1}`,
  );
  const header = [
    "Jury",
    "Date",
    "Salle",
    ...headerTeachers,
    "Horaire",
    "Étudiant",
    "Parcours",
    "Tuteur",
  ];
  const rows = [header];

  document.querySelectorAll(".jcard").forEach((card) => {
    const juryName = card.querySelector(".jury-name")?.textContent.trim() || "";
    const juryDate = card.querySelector(".jury-date")?.textContent.trim() || "";

    const enseignants = [];
    card.querySelectorAll(".mrow").forEach((row) => {
      const lbl = row.querySelector(".mlbl");
      const sel = row.querySelector(".tselect");
      if (lbl?.textContent.trim().startsWith("Enseignant") && sel)
        enseignants.push(sel.value || "");
    });
    while (enseignants.length < teacherCount) enseignants.push("");

    let salle = "";
    card.querySelectorAll(".mrow").forEach((row) => {
      const lbl = row.querySelector(".mlbl");
      const sel = row.querySelector(".tselect");
      if (lbl?.textContent.trim() === "Salle" && sel) salle = sel.value || "";
    });

    const tbodyRows = card.querySelectorAll(".stable tbody tr");
    if (tbodyRows.length === 0) {
      rows.push([juryName, juryDate, salle, ...enseignants, "", "", "", ""]);
    } else {
      tbodyRows.forEach((tr) => {
        const horaire =
          tr.querySelector("td:first-child span")?.textContent.trim() || "";
        const etudiant = tr.querySelector(".sname")?.textContent.trim() || "";
        const parcours =
          tr
            .querySelector("span.badge-crea, span.badge-dweb")
            ?.textContent.trim() || "";
        const tuteur = tr.querySelector(".tselect-tuteur")?.value || "";
        rows.push([
          juryName,
          juryDate,
          salle,
          ...enseignants,
          horaire,
          etudiant,
          parcours,
          tuteur,
        ]);
      });
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = header.map((_, ci) => ({
    wch: Math.min(
      rows.reduce(
        (max, row) => Math.max(max, String(row[ci] || "").length),
        8,
      ) + 2,
      40,
    ),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, PAGE_ID.toUpperCase());
  XLSX.writeFile(
    wb,
    `soutenances_stages_${PAGE_ID}_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
  showToast("✓ Export XLSX téléchargé !");
}

/**
 * Injecte du CSS spécifique pour l'impression afin de supprimer
 * les informations de bordure du navigateur (URL, titre, date).
 */
function injectPrintStyles() {
  const style = document.createElement("style");
  style.textContent = `
    @media print {
      @page { margin: 0; }
      body { margin: 1.5cm; }
      #toast { display: none !important; }
    }
  `;
  document.head.appendChild(style);
}

/* ── Init ────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", async () => {
  injectPrintStyles();
  injectCfgUI();
  await loadHoraires();
  await loadFromServer();
  await loadEtudiants();
  if (isGHConfigured()) {
    await loadHorairesFromGitHub();
    await loadFromGitHub();
  }
  loadAll();

  /* Masquer le bouton Sauvegarder (remplacé par l'auto-save) */
  document.querySelectorAll(".save-btn").forEach((btn) => btn.remove());

  /* Auto-save sur modification des noms d'étudiants (contenteditable) */
  document.addEventListener("input", (e) => {
    if (e.target.classList.contains("sname") && e.target.isContentEditable) {
      scheduleAutoSave();
    }
  });

  /* Badge utilisateur dans la nav */
  if (AUTH.isAuth() && !document.getElementById("auth-badge")) {
    const badge = document.createElement("div");
    badge.id = "auth-badge";
    badge.style.cssText = "display:flex;align-items:center;gap:8px;font-size:13px;flex-shrink:0;margin-left:4px;";
    badge.innerHTML = `
      <span style="font-weight:600;color:#fff;">${AUTH.user()}</span>
      <span style="color:rgba(255,255,255,.65);font-size:12px;">${AUTH.canWrite() ? "Lecture / Écriture" : "Lecture seule"}</span>
      <button onclick="AUTH.logout()" style="padding:3px 10px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);border-radius:5px;color:#fff;font-size:12px;cursor:pointer;">Déconnexion</button>`;
    const nav = document.querySelector(".nav");
    if (nav) nav.appendChild(badge);
  }
});
