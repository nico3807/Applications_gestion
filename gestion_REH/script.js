"use strict";

if (!AUTH.isAuth() || !AUTH.isAdmin()) location.href = '../index.html';

const GH_OWNER  = "nico3807";
const GH_REPO   = "Applications_gestion";
const GH_BRANCH = "main";
const GH_ORG_FILE      = "gestion_REH/orga_pf.json";
const GH_MISSIONS_FILE = "gestion_REH/missions.json";
const GH_AUTRE_FILE       = "gestion_REH/autre.json";
const GH_PARCOURSUP_FILE  = "gestion_REH/parcoursup.json";
const SK = "reh_v1_";
const MISSIONS_ROWS = 10;

/* ── Navigation ──────────────────────────────────────────────────────── */
function navigate(view) {
  document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
  const el = document.getElementById("nav-" + view);
  if (el) el.classList.add("active");
  renderView(view);
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

/* ── GitHub helpers ──────────────────────────────────────────────────── */
async function fetchGHJson(path) {
  const url = `/api/gh-proxy.php?path=${encodeURIComponent(path)}&ref=${GH_BRANCH}`;
  const resp = await fetch(url, {
    cache: "no-cache",
    credentials: "include",
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const json = await resp.json();
  return JSON.parse(decodeURIComponent(escape(atob(json.content.replace(/\n/g, "")))));
}

async function saveJsonToGitHub(path, jsonStr, message) {
  const url = `/api/gh-proxy.php?path=${encodeURIComponent(path)}`;
  const content = btoa(unescape(encodeURIComponent(jsonStr)));
  let sha = null;
  try {
    const r = await fetch(`${url}&ref=${GH_BRANCH}&_t=${Date.now()}`, {
      cache: "no-cache",
      credentials: "include",
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    if (r.ok) sha = (await r.json()).sha;
  } catch { /* fichier inexistant */ }
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

/* ── Auto-save organisation ──────────────────────────────────────────── */
let _autoSaveTimer = null;
let _orgState   = [];
let _orgNomList = [];
let _orgValList = [];

function scheduleAutoSave() {
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(doAutoSave, 1800);
}

function buildOrgJson() {
  const data = {};
  document.querySelectorAll(".org-sel").forEach(el => {
    if (el.value) data[el.id] = el.value;
  });
  return JSON.stringify(data, null, 2);
}

async function doAutoSave() {
  const ts = new Date().toLocaleString("fr-FR");
  try {
    await saveJsonToGitHub(GH_ORG_FILE, buildOrgJson(), `Organisation portfolio — ${ts}`);
    showToast("✓ Sauvegardé");
  } catch (e) {
    showToast("✗ GitHub : " + e.message);
  }
}

function saveOrgSel(el) {
  localStorage.setItem(SK + el.id, el.value);
  el.classList.toggle("filled", !!el.value);
  scheduleAutoSave();
}

function syncOrgStateFromDom() {
  _orgState = [];
  let i = 0;
  while (document.getElementById(`org_${i}_nom`) !== null) {
    _orgState.push({
      nom: document.getElementById(`org_${i}_nom`).value,
      val: document.getElementById(`org_${i}_val`).value,
    });
    i++;
  }
}

function buildOrgRow(i, row) {
  const savedNom = row.nom || "";
  const savedVal = row.val || "";
  return `
    <tr class="${i % 2 === 0 ? "group-even" : "group-odd"}">
      <td><select class="org-sel${savedNom ? " filled" : ""}" id="org_${i}_nom" onchange="saveOrgSel(this)">${makeOptions(_orgNomList, savedNom)}</select></td>
      <td style="text-align:center;"><select class="org-sel${savedVal ? " filled" : ""}" id="org_${i}_val" onchange="saveOrgSel(this)">${makeOptions(_orgValList, savedVal)}</select></td>
      <td style="padding:4px 8px; text-align:center;">
        <button class="btn-remove-subrow" onclick="removeOrgRow(${i})" title="Supprimer cette ligne">×</button>
      </td>
    </tr>`;
}

function rebuildOrgTable() {
  const tbody = document.getElementById("org-tbody");
  if (tbody) tbody.innerHTML = _orgState.map((row, i) => buildOrgRow(i, row)).join("");
}

function addOrgRow() {
  syncOrgStateFromDom();
  _orgState.push({ nom: "", val: "" });
  rebuildOrgTable();
  scheduleAutoSave();
}

function removeOrgRow(i) {
  syncOrgStateFromDom();
  _orgState.splice(i, 1);
  rebuildOrgTable();
  scheduleAutoSave();
}

/* ── Auto-save missions ───────────────────────────────────────────────── */
let _autoSaveMissionsTimer = null;
let _miState      = [];
let _miNomList    = [];
let _miHeuresList = [];

function scheduleMissionsAutoSave() {
  clearTimeout(_autoSaveMissionsTimer);
  _autoSaveMissionsTimer = setTimeout(doMissionsAutoSave, 1800);
}

function buildMissionsJson() {
  const rows = [];
  let i = 0;
  while (document.getElementById(`mis_${i}_nom`) !== null) {
    rows.push({
      nom:      document.getElementById(`mis_${i}_nom`).value,
      remarque: document.getElementById(`mis_${i}_remarque`).value,
      heures:   document.getElementById(`mis_${i}_heures`).value,
    });
    i++;
  }
  return JSON.stringify(rows, null, 2);
}

async function doMissionsAutoSave() {
  const ts = new Date().toLocaleString("fr-FR");
  try {
    await saveJsonToGitHub(GH_MISSIONS_FILE, buildMissionsJson(), `Missions — ${ts}`);
    showToast("✓ Sauvegardé");
  } catch (e) {
    showToast("✗ GitHub : " + e.message);
  }
}

function updateMiTotal() {
  let sum = 0;
  let i = 0;
  while (document.getElementById(`mis_${i}_heures`) !== null) {
    sum += parseInt(document.getElementById(`mis_${i}_heures`).value, 10) || 0;
    i++;
  }
  const el = document.getElementById("mis-total");
  if (el) el.textContent = sum;
}

function saveMissionsField(el) {
  localStorage.setItem(SK + el.id, el.value);
  if (el.tagName === "SELECT") el.classList.toggle("filled", !!el.value);
  updateMiTotal();
  scheduleMissionsAutoSave();
}

function syncMiStateFromDom() {
  _miState = [];
  let i = 0;
  while (document.getElementById(`mis_${i}_nom`) !== null) {
    _miState.push({
      nom:      document.getElementById(`mis_${i}_nom`).value,
      remarque: document.getElementById(`mis_${i}_remarque`).value,
      heures:   document.getElementById(`mis_${i}_heures`).value,
    });
    i++;
  }
}

function buildMisRow(i, row) {
  const savedNom      = row.nom      || "";
  const savedRemarque = row.remarque || "";
  const savedHeures   = row.heures   || "";
  return `
    <tr class="${i % 2 === 0 ? "group-even" : "group-odd"}">
      <td><select class="mis-sel${savedNom ? " filled" : ""}" id="mis_${i}_nom" onchange="saveMissionsField(this)">${makeOptions(_miNomList, savedNom)}</select></td>
      <td><input type="text" class="mis-txt" id="mis_${i}_remarque" value="${escapeAttr(savedRemarque)}" oninput="saveMissionsField(this)" placeholder="Mission…"></td>
      <td style="text-align:center;"><select class="mis-sel${savedHeures ? " filled" : ""}" id="mis_${i}_heures" onchange="saveMissionsField(this)">${makeOptions(_miHeuresList, savedHeures)}</select></td>
      <td style="padding:4px 8px; text-align:center;">
        <button class="btn-remove-subrow" onclick="removeMissionRow(${i})" title="Supprimer cette ligne">×</button>
      </td>
    </tr>`;
}

function rebuildMisTable() {
  const tbody = document.getElementById("mis-tbody");
  if (tbody) tbody.innerHTML = _miState.map((row, i) => buildMisRow(i, row)).join("");
  updateMiTotal();
}

function addMissionRow(afterIndex) {
  syncMiStateFromDom();
  _miState.splice(afterIndex + 1, 0, { nom: "", remarque: "", heures: "" });
  rebuildMisTable();
  scheduleMissionsAutoSave();
}

function removeMissionRow(i) {
  syncMiStateFromDom();
  _miState.splice(i, 1);
  rebuildMisTable();
  scheduleMissionsAutoSave();
}

/* ── Vue Portfolio ────────────────────────────────────────────────────── */
const PF_LEVELS = ["mmi1", "mmi2_init", "mmi2_alt", "mmi3_init", "mmi3_alt"];
const PF_DEFAULT_TEACHERS = { mmi1: 3, mmi2_init: 2, mmi2_alt: 2, mmi3_init: 2, mmi3_alt: 2 };

function buildValidPortfolioKeys(horaires) {
  const validKeys = new Set();
  for (const level of PF_LEVELS) {
    const teacherCount = parseInt(horaires[`${level}_teacher_count`]) || PF_DEFAULT_TEACHERS[level] || 2;

    const sectionDates = [];
    for (let i = 1; i <= 20; i++) {
      const d = horaires[`${level}_date${i}`];
      if (d === undefined) break;
      if (!sectionDates.includes(d)) sectionDates.push(d);
    }
    if (sectionDates.length === 0) continue;

    const sectionJuries = {};
    for (let n = 1; n <= 200; n++) {
      const juryDate = horaires[`${level}_jury${n}_date`];
      if (juryDate === undefined) break;
      let si = sectionDates.indexOf(juryDate);
      if (si === -1) si = Math.max(0, sectionDates.length - 1);
      if (!sectionJuries[si]) sectionJuries[si] = [];
      sectionJuries[si].push(n);
    }

    for (let si = 0; si < sectionDates.length; si++) {
      const juries = sectionJuries[si] || [];
      juries.forEach((_, pos) => {
        for (let t = 0; t < teacherCount; t++) {
          validKeys.add(`${level}_${si}_${pos}_${t}`);
        }
      });
    }
  }
  return validKeys;
}

function makeOptions(list, selectedVal) {
  return list.map(([v, l]) =>
    `<option value="${v}"${v === selectedVal ? " selected" : ""}>${l}</option>`
  ).join("");
}

function escapeAttr(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderPortfolio(root, pfData, horairesData, enseignants, orgData) {
  // ── Tableau REH Portfolio ────────────────────────────────────────────
  const validKeys = buildValidPortfolioKeys(horairesData);
  const counts = {};
  for (const key of validKeys) {
    const val = pfData[key];
    if (val) counts[val] = (counts[val] || 0) + 1;
  }

  const rows = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b, "fr"));
  const totalJurys = rows.reduce((s, [, n]) => s + n, 0);
  const totalREH   = totalJurys * 3;

  const rehRows = rows.map(([nom, nbre], i) => `
    <tr class="${i % 2 === 0 ? "group-even" : "group-odd"}">
      <td>${nom}</td>
      <td><strong>${nbre}</strong></td>
      <td><strong>${nbre * 3}</strong></td>
    </tr>`).join("");

  // ── Tableau Organisation portfolio ──────────────────────────────────
  _orgNomList = [["", "— Sélectionner —"]].concat(
    [...enseignants]
      .sort((a, b) => a.id.localeCompare(b.id, "fr"))
      .map(e => [e.id, `${e.nom} ${e.prenom}`])
  );
  _orgValList = [["", "—"]].concat(
    Array.from({ length: 6 }, (_, i) => [String(i), String(i)])
  );

  let maxOrgIdx = -1;
  Object.keys(orgData).forEach(key => {
    const m = key.match(/^org_(\d+)_/);
    if (m) maxOrgIdx = Math.max(maxOrgIdx, parseInt(m[1]));
  });
  _orgState = Array.from({ length: maxOrgIdx + 1 }, (_, i) => ({
    nom: orgData[`org_${i}_nom`] || localStorage.getItem(SK + `org_${i}_nom`) || "",
    val: orgData[`org_${i}_val`] || localStorage.getItem(SK + `org_${i}_val`) || "",
  }));

  const orgRows = _orgState.map((row, i) => buildOrgRow(i, row)).join("");

  root.innerHTML = `
    <div class="page-header">
      <h1>Portfolio</h1>
    </div>
    <div class="tables-row">
      <div>
        <p class="subtitle">REH Portfolio — participation aux jurys de soutenances portfolio</p>
        <div class="table-wrapper reh-table">
          <table class="ressources-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Nbre de jurys</th>
                <th>REH Portfolio</th>
              </tr>
            </thead>
            <tbody>${rehRows}</tbody>
            <tfoot>
              <tr class="reh-total-row">
                <td><strong>Total</strong></td>
                <td><strong>${totalJurys}</strong></td>
                <td><strong>${totalREH}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div>
        <p class="subtitle">Organisation portfolio</p>
        <div class="table-wrapper">
          <table class="ressources-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th style="text-align:center;">Nb</th>
                <th style="width:1%;"></th>
              </tr>
            </thead>
            <tbody id="org-tbody">${orgRows}</tbody>
          </table>
        </div>
        <div style="margin-top:0.6rem;">
          <button class="btn-add-subrow" onclick="addOrgRow()" title="Ajouter une ligne">+</button>
        </div>
      </div>
    </div>`;
}

/* ── Vue SAÉ ──────────────────────────────────────────────────────────── */
async function renderSAE(root) {
  root.innerHTML = `<div style="padding:3rem;text-align:center;color:#6b7280;">Chargement…</div>`;
  try {
    const saeData = await fetchGHJson("repartition/data/sae_data.json");

    const counts = {};
    for (const sem of saeData.semestres) {
      const list = saeData.sae[sem] || [];
      for (const sae of list) {
        const resp = (sae.responsable || "").trim();
        if (resp) counts[resp] = (counts[resp] || 0) + 1;
      }
    }

    const rows = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b, "fr"));
    const totalSae  = rows.reduce((s, [, n]) => s + n, 0);
    const totalREH  = totalSae * 2;

    const rehRows = rows.map(([nom, nbre], i) => `
      <tr class="${i % 2 === 0 ? "group-even" : "group-odd"}">
        <td>${nom}</td>
        <td><strong>${nbre}</strong></td>
        <td><strong>${nbre * 2}</strong></td>
      </tr>`).join("");

    root.innerHTML = `
      <div class="page-header">
        <h1>SAÉ</h1>
      </div>
      <div>
        <p class="subtitle">REH SAÉ — responsabilité des Situations d'Apprentissage et d'Évaluation</p>
        <div class="table-wrapper reh-table">
          <table class="ressources-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Nombre de SAÉ</th>
                <th>Heures REH</th>
              </tr>
            </thead>
            <tbody>${rehRows}</tbody>
            <tfoot>
              <tr class="reh-total-row">
                <td><strong>Total</strong></td>
                <td><strong>${totalSae}</strong></td>
                <td><strong>${totalREH}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>`;
  } catch (e) {
    root.innerHTML = `<div class="alert alert-danger" style="margin-top:1rem;">
      Erreur de chargement : ${e.message}</div>`;
  }
}

/* ── Auto-save autre ─────────────────────────────────────────────────── */
let _autoSaveAutreTimer = null;
let _autState      = [];
let _autNomList    = [];
let _autHeuresList = [];

function scheduleAutreAutoSave() {
  clearTimeout(_autoSaveAutreTimer);
  _autoSaveAutreTimer = setTimeout(doAutreAutoSave, 1800);
}

function buildAutreJson() {
  const rows = [];
  let i = 0;
  while (document.getElementById(`aut_${i}_nom`) !== null) {
    rows.push({
      nom:     document.getElementById(`aut_${i}_nom`).value,
      autre:   document.getElementById(`aut_${i}_autre`).value,
      heures:  document.getElementById(`aut_${i}_heures`).value,
    });
    i++;
  }
  return JSON.stringify(rows, null, 2);
}

async function doAutreAutoSave() {
  const ts = new Date().toLocaleString("fr-FR");
  try {
    await saveJsonToGitHub(GH_AUTRE_FILE, buildAutreJson(), `Autre — ${ts}`);
    showToast("✓ Sauvegardé");
  } catch (e) {
    showToast("✗ GitHub : " + e.message);
  }
}

function updateAutTotal() {
  let sum = 0;
  let i = 0;
  while (document.getElementById(`aut_${i}_heures`) !== null) {
    sum += parseInt(document.getElementById(`aut_${i}_heures`).value, 10) || 0;
    i++;
  }
  const el = document.getElementById("aut-total");
  if (el) el.textContent = sum;
}

function saveAutreField(el) {
  localStorage.setItem(SK + el.id, el.value);
  if (el.tagName === "SELECT") el.classList.toggle("filled", !!el.value);
  updateAutTotal();
  scheduleAutreAutoSave();
}

function syncAutStateFromDom() {
  _autState = [];
  let i = 0;
  while (document.getElementById(`aut_${i}_nom`) !== null) {
    _autState.push({
      nom:    document.getElementById(`aut_${i}_nom`).value,
      autre:  document.getElementById(`aut_${i}_autre`).value,
      heures: document.getElementById(`aut_${i}_heures`).value,
    });
    i++;
  }
}

function buildAutRow(i, row) {
  const savedNom    = row.nom    || "";
  const savedAutre  = row.autre  || "";
  const savedHeures = row.heures || "";
  return `
    <tr class="${i % 2 === 0 ? "group-even" : "group-odd"}">
      <td><select class="mis-sel${savedNom ? " filled" : ""}" id="aut_${i}_nom" onchange="saveAutreField(this)">${makeOptions(_autNomList, savedNom)}</select></td>
      <td><input type="text" class="mis-txt" id="aut_${i}_autre" value="${escapeAttr(savedAutre)}" oninput="saveAutreField(this)" placeholder="Autre…"></td>
      <td style="text-align:center;"><select class="mis-sel${savedHeures ? " filled" : ""}" id="aut_${i}_heures" onchange="saveAutreField(this)">${makeOptions(_autHeuresList, savedHeures)}</select></td>
      <td style="padding:4px 8px; text-align:center;">
        <button class="btn-remove-subrow" onclick="removeAutreRow(${i})" title="Supprimer cette ligne">×</button>
      </td>
    </tr>`;
}

function rebuildAutreTable() {
  const tbody = document.getElementById("aut-tbody");
  if (tbody) tbody.innerHTML = _autState.map((row, i) => buildAutRow(i, row)).join("");
  updateAutTotal();
}

function addAutreRow() {
  syncAutStateFromDom();
  _autState.push({ nom: "", autre: "", heures: "" });
  rebuildAutreTable();
  scheduleAutreAutoSave();
}

function removeAutreRow(i) {
  syncAutStateFromDom();
  _autState.splice(i, 1);
  rebuildAutreTable();
  scheduleAutreAutoSave();
}

/* ── Vue Autre ────────────────────────────────────────────────────────── */
async function renderAutre(root) {
  root.innerHTML = `<div style="padding:3rem;text-align:center;color:#6b7280;">Chargement…</div>`;
  try {
    const [enseignants, autreData] = await Promise.all([
      fetchGHJson("repartition/data/enseignants.json"),
      fetchGHJson(GH_AUTRE_FILE).catch(() => []),
    ]);

    _autNomList = [["", "— Sélectionner —"]].concat(
      [...enseignants]
        .sort((a, b) => a.id.localeCompare(b.id, "fr"))
        .map(e => [e.id, `${e.nom} ${e.prenom}`])
    );

    _autHeuresList = [["", "—"]].concat(
      Array.from({ length: 11 }, (_, i) => [String(i), String(i)])
    );

    const saved = Array.isArray(autreData) ? autreData : [];
    _autState = saved.length > 0 ? saved : [{ nom: "", autre: "", heures: "" }];

    const autRows = _autState.map((row, i) => buildAutRow(i, row)).join("");

    root.innerHTML = `
      <div class="page-header">
        <h1>Autre</h1>
      </div>
      <div>
        <p class="subtitle">Autre — enseignants</p>
        <div class="table-wrapper">
          <table class="ressources-table mis-table">
            <thead>
              <tr>
                <th style="width:200px;">Nom</th>
                <th style="width:350px;">Autre</th>
                <th style="width:70px; text-align:center;">Heures</th>
                <th style="width:40px;"></th>
              </tr>
            </thead>
            <tbody id="aut-tbody">${autRows}</tbody>
            <tfoot>
              <tr class="reh-total-row">
                <td><strong>Total</strong></td>
                <td></td>
                <td style="text-align:center;"><strong id="aut-total">0</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div style="margin-top:0.6rem;">
          <button class="btn-add-subrow" onclick="addAutreRow()" title="Ajouter une ligne">+</button>
        </div>
      </div>`;
    updateAutTotal();
  } catch (e) {
    root.innerHTML = `<div class="alert alert-danger" style="margin-top:1rem;">
      Erreur de chargement : ${e.message}</div>`;
  }
}

/* ── Vue Missions ─────────────────────────────────────────────────────── */
async function renderMissions(root) {
  root.innerHTML = `<div style="padding:3rem;text-align:center;color:#6b7280;">Chargement…</div>`;
  try {
    const [enseignants, missionsData] = await Promise.all([
      fetchGHJson("repartition/data/enseignants.json"),
      fetchGHJson(GH_MISSIONS_FILE).catch(() => []),
    ]);

    _miNomList = [["", "— Sélectionner —"]].concat(
      [...enseignants]
        .sort((a, b) => a.id.localeCompare(b.id, "fr"))
        .map(e => [e.id, `${e.nom} ${e.prenom}`])
    );

    _miHeuresList = [["", "—"]].concat(
      Array.from({ length: 11 }, (_, i) => [String(i), String(i)])
    );

    _miState = Array.isArray(missionsData) ? missionsData : [];

    const misRows = _miState.map((row, i) => buildMisRow(i, row)).join("");

    root.innerHTML = `
      <div class="page-header">
        <h1>Missions</h1>
      </div>
      <div>
        <p class="subtitle">Missions enseignants</p>
        <div class="table-wrapper">
          <table class="ressources-table mis-table">
            <thead>
              <tr>
                <th style="width:200px;">Nom</th>
                <th style="width:350px;">Missions</th>
                <th style="width:70px; text-align:center;">Heures</th>
                <th style="width:40px;"></th>
              </tr>
            </thead>
            <tbody id="mis-tbody">${misRows}</tbody>
            <tfoot>
              <tr class="reh-total-row">
                <td><strong>Total</strong></td>
                <td></td>
                <td style="text-align:center;"><strong id="mis-total">0</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div style="margin-top:0.6rem;">
          <button class="btn-add-subrow" onclick="addMissionRow(_miState.length - 1)" title="Ajouter une ligne">+</button>
        </div>
      </div>`;
    updateMiTotal();
  } catch (e) {
    root.innerHTML = `<div class="alert alert-danger" style="margin-top:1rem;">
      Erreur de chargement : ${e.message}</div>`;
  }
}

/* ── Auto-save parcoursup ────────────────────────────────────────────── */
let _autoSaveParcoursupTimer = null;
let _psState   = [];
let _psNomList = [];

function scheduleParcoursupAutoSave() {
  clearTimeout(_autoSaveParcoursupTimer);
  _autoSaveParcoursupTimer = setTimeout(doParcoursupAutoSave, 1800);
}

function buildParcoursupJson() {
  const rows = [];
  let i = 0;
  while (document.getElementById(`ps_${i}_nom`) !== null) {
    rows.push({
      nom:    document.getElementById(`ps_${i}_nom`).value,
      heures: document.getElementById(`ps_${i}_heures`).value,
    });
    i++;
  }
  return JSON.stringify(rows, null, 2);
}

async function doParcoursupAutoSave() {
  const ts = new Date().toLocaleString("fr-FR");
  try {
    await saveJsonToGitHub(GH_PARCOURSUP_FILE, buildParcoursupJson(), `Parcoursup — ${ts}`);
    showToast("✓ Sauvegardé");
  } catch (e) {
    showToast("✗ GitHub : " + e.message);
  }
}

function updatePsTotal() {
  let sum = 0;
  let i = 0;
  while (document.getElementById(`ps_${i}_heures`) !== null) {
    sum += parseInt(document.getElementById(`ps_${i}_heures`).value, 10) || 0;
    i++;
  }
  const el = document.getElementById("ps-total");
  if (el) el.textContent = sum;
}

function saveParcoursupField(el) {
  localStorage.setItem(SK + el.id, el.value);
  if (el.tagName === "SELECT") el.classList.toggle("filled", !!el.value);
  updatePsTotal();
  scheduleParcoursupAutoSave();
}

function syncPsStateFromDom() {
  _psState = [];
  let i = 0;
  while (document.getElementById(`ps_${i}_nom`) !== null) {
    _psState.push({
      nom:    document.getElementById(`ps_${i}_nom`).value,
      heures: document.getElementById(`ps_${i}_heures`).value,
    });
    i++;
  }
}

function buildPsRow(i, row) {
  const savedNom    = row.nom    || "";
  const savedHeures = row.heures || "";
  const psHeuresList = [["", "—"]].concat(
    Array.from({ length: 20 }, (_, j) => [String(j + 1), String(j + 1)])
  );
  return `
    <tr class="${i % 2 === 0 ? "group-even" : "group-odd"}">
      <td><select class="mis-sel${savedNom ? " filled" : ""}" id="ps_${i}_nom" onchange="saveParcoursupField(this)">${makeOptions(_psNomList, savedNom)}</select></td>
      <td style="text-align:center;"><select class="mis-sel${savedHeures ? " filled" : ""}" id="ps_${i}_heures" onchange="saveParcoursupField(this)">${makeOptions(psHeuresList, savedHeures)}</select></td>
      <td style="padding:4px 8px; text-align:center;">
        <button class="btn-remove-subrow" onclick="removePsRow(${i})" title="Supprimer cette ligne">×</button>
      </td>
    </tr>`;
}

function rebuildPsTable() {
  const tbody = document.getElementById("ps-tbody");
  if (tbody) tbody.innerHTML = _psState.map((row, i) => buildPsRow(i, row)).join("");
  updatePsTotal();
}

function addPsRow() {
  syncPsStateFromDom();
  _psState.push({ nom: "", heures: "" });
  rebuildPsTable();
  scheduleParcoursupAutoSave();
}

function removePsRow(i) {
  syncPsStateFromDom();
  _psState.splice(i, 1);
  rebuildPsTable();
  scheduleParcoursupAutoSave();
}

/* ── Vue Parcoursup ───────────────────────────────────────────────────── */
async function renderParcoursup(root) {
  root.innerHTML = `<div style="padding:3rem;text-align:center;color:#6b7280;">Chargement…</div>`;
  try {
    const [enseignants, psData] = await Promise.all([
      fetchGHJson("repartition/data/enseignants.json"),
      fetchGHJson(GH_PARCOURSUP_FILE).catch(() => []),
    ]);

    _psNomList = [["", "— Sélectionner —"]].concat(
      [...enseignants]
        .sort((a, b) => a.id.localeCompare(b.id, "fr"))
        .map(e => [e.id, `${e.nom} ${e.prenom}`])
    );

    _psState = Array.isArray(psData) ? psData : [];

    const psRows = _psState.map((row, i) => buildPsRow(i, row)).join("");

    root.innerHTML = `
      <div class="page-header">
        <h1>Parcoursup</h1>
      </div>
      <div>
        <p class="subtitle">Gestion parcoursup</p>
        <div class="table-wrapper">
          <table class="ressources-table mis-table">
            <thead>
              <tr>
                <th style="width:200px;">Nom</th>
                <th style="width:70px; text-align:center;">Heures</th>
                <th style="width:40px;"></th>
              </tr>
            </thead>
            <tbody id="ps-tbody">${psRows}</tbody>
            <tfoot>
              <tr class="reh-total-row">
                <td><strong>Total</strong></td>
                <td style="text-align:center;"><strong id="ps-total">0</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div style="margin-top:0.6rem;">
          <button class="btn-add-subrow" onclick="addPsRow()" title="Ajouter une ligne">+</button>
        </div>
      </div>`;
    updatePsTotal();
  } catch (e) {
    root.innerHTML = `<div class="alert alert-danger" style="margin-top:1rem;">
      Erreur de chargement : ${e.message}</div>`;
  }
}

/* ── Vue Récapitulatif ────────────────────────────────────────────────── */
async function renderRecap(root) {
  root.innerHTML = `<div style="padding:3rem;text-align:center;color:#6b7280;">Chargement…</div>`;
  try {
    const [pfData, horairesData, saeData, orgData, missionsData, autreData, psData] = await Promise.all([
      fetchGHJson("soutenances_portfolio/donnees_pf.json"),
      fetchGHJson("soutenances_portfolio/horaires_pf.json"),
      fetchGHJson("repartition/data/sae_data.json"),
      fetchGHJson(GH_ORG_FILE).catch(() => ({})),
      fetchGHJson(GH_MISSIONS_FILE).catch(() => []),
      fetchGHJson(GH_AUTRE_FILE).catch(() => []),
      fetchGHJson(GH_PARCOURSUP_FILE).catch(() => []),
    ]);

    // ── REH Portfolio (jury) ───────────────────────────────────────────
    const validKeys = buildValidPortfolioKeys(horairesData);
    const juryCounts = {};
    for (const key of validKeys) {
      const val = pfData[key];
      if (val) juryCounts[val] = (juryCounts[val] || 0) + 1;
    }
    const juryRows   = Object.entries(juryCounts).sort(([a], [b]) => a.localeCompare(b, "fr"));
    const juryTotal  = juryRows.reduce((s, [, n]) => s + n, 0);

    // ── Organisation portfolio ─────────────────────────────────────────
    let maxOrgIdx = -1;
    Object.keys(orgData).forEach(key => {
      const m = key.match(/^org_(\d+)_/);
      if (m) maxOrgIdx = Math.max(maxOrgIdx, parseInt(m[1]));
    });
    const orgRows = Array.from({ length: maxOrgIdx + 1 }, (_, i) => ({
      nom: orgData[`org_${i}_nom`] || "",
      val: orgData[`org_${i}_val`] || "",
    })).filter(r => r.nom);
    const orgTotal = orgRows.reduce((s, r) => s + (parseInt(r.val, 10) || 0), 0);

    // ── REH SAÉ ────────────────────────────────────────────────────────
    const saeCounts = {};
    for (const sem of saeData.semestres) {
      for (const sae of (saeData.sae[sem] || [])) {
        const resp = (sae.responsable || "").trim();
        if (resp) saeCounts[resp] = (saeCounts[resp] || 0) + 1;
      }
    }
    const saeRows  = Object.entries(saeCounts).sort(([a], [b]) => a.localeCompare(b, "fr"));
    const saeTotal = saeRows.reduce((s, [, n]) => s + n, 0);

    // ── Missions ──────────────────────────────────────────────────────
    const miRows  = Array.isArray(missionsData) ? missionsData.filter(r => r.nom) : [];
    const miTotal = miRows.reduce((s, r) => s + (parseInt(r.heures, 10) || 0), 0);

    // ── Autre ─────────────────────────────────────────────────────────
    const autRows  = Array.isArray(autreData) ? autreData.filter(r => r.nom) : [];
    const autTotal = autRows.reduce((s, r) => s + (parseInt(r.heures, 10) || 0), 0);

    // ── Parcoursup ────────────────────────────────────────────────────
    const psRows  = Array.isArray(psData) ? psData.filter(r => r.nom) : [];
    const psTotal = psRows.reduce((s, r) => s + (parseInt(r.heures, 10) || 0), 0);

    // ── Grand total par enseignant ─────────────────────────────────────
    const totals = {};
    const names  = {};
    const lastName = nom => nom.trim().split(/\s+/)[0];
    const add = (nom, h) => {
      if (!nom) return;
      const k = lastName(nom);
      totals[k] = (totals[k] || 0) + h;
      if (!names[k]) names[k] = new Set();
      names[k].add(nom.trim());
    };
    juryRows.forEach(([nom, n]) => add(nom, n * 3));
    orgRows.forEach(r => add(r.nom, parseInt(r.val, 10) || 0));
    saeRows.forEach(([nom, n]) => add(nom, n * 2));
    miRows.forEach(r => add(r.nom, parseInt(r.heures, 10) || 0));
    autRows.forEach(r => add(r.nom, parseInt(r.heures, 10) || 0));
    const totalRows  = Object.entries(totals).sort(([a], [b]) => a.localeCompare(b, "fr"));
    const grandTotal = totalRows.reduce((s, [, h]) => s + h, 0);

    const row = (i, cells) => `<tr class="${i % 2 === 0 ? "group-even" : "group-odd"}">${cells}</tr>`;

    root.innerHTML = `
      <div class="page-header"><h1>Récapitulatif</h1></div>
      <div style="display:flex;flex-direction:column;gap:2rem;">

        <div>
          <p class="subtitle">REH Portfolio — participation aux jurys de soutenances portfolio</p>
          <div class="table-wrapper reh-table">
            <table class="ressources-table">
              <thead><tr><th>Nom</th><th>Nbre de jurys</th><th>REH Portfolio</th></tr></thead>
              <tbody>${juryRows.map(([nom, n], i) => row(i,
                `<td>${escapeHtml(nom)}</td><td><strong>${n}</strong></td><td><strong>${n * 3}</strong></td>`
              )).join("")}</tbody>
              <tfoot><tr class="reh-total-row">
                <td><strong>Total</strong></td><td><strong>${juryTotal}</strong></td><td><strong>${juryTotal * 3}</strong></td>
              </tr></tfoot>
            </table>
          </div>
        </div>

        <div>
          <p class="subtitle">Organisation portfolio</p>
          <div class="table-wrapper reh-table">
            <table class="ressources-table">
              <thead><tr><th>Nom</th><th style="text-align:center;">Nb</th></tr></thead>
              <tbody>${orgRows.map((r, i) => row(i,
                `<td>${escapeHtml(r.nom)}</td><td style="text-align:center;"><strong>${r.val || 0}</strong></td>`
              )).join("")}</tbody>
              <tfoot><tr class="reh-total-row">
                <td><strong>Total</strong></td><td style="text-align:center;"><strong>${orgTotal}</strong></td>
              </tr></tfoot>
            </table>
          </div>
        </div>

        <div>
          <p class="subtitle">REH SAÉ — responsabilité des Situations d'Apprentissage et d'Évaluation</p>
          <div class="table-wrapper reh-table">
            <table class="ressources-table">
              <thead><tr><th>Nom</th><th>Nombre de SAÉ</th><th>Heures REH</th></tr></thead>
              <tbody>${saeRows.map(([nom, n], i) => row(i,
                `<td>${escapeHtml(nom)}</td><td><strong>${n}</strong></td><td><strong>${n * 2}</strong></td>`
              )).join("")}</tbody>
              <tfoot><tr class="reh-total-row">
                <td><strong>Total</strong></td><td><strong>${saeTotal}</strong></td><td><strong>${saeTotal * 2}</strong></td>
              </tr></tfoot>
            </table>
          </div>
        </div>

        <div>
          <p class="subtitle">Missions enseignants</p>
          <div class="table-wrapper reh-table">
            <table class="ressources-table">
              <thead><tr><th>Nom</th><th>Missions</th><th style="text-align:center;">Heures</th></tr></thead>
              <tbody>${miRows.map((r, i) => row(i,
                `<td>${escapeHtml(r.nom)}</td><td>${escapeHtml(r.remarque || "")}</td><td style="text-align:center;"><strong>${r.heures || 0}</strong></td>`
              )).join("")}</tbody>
              <tfoot><tr class="reh-total-row">
                <td><strong>Total</strong></td><td></td><td style="text-align:center;"><strong>${miTotal}</strong></td>
              </tr></tfoot>
            </table>
          </div>
        </div>

        <div>
          <p class="subtitle">Autre — enseignants</p>
          <div class="table-wrapper reh-table">
            <table class="ressources-table">
              <thead><tr><th>Nom</th><th>Autre</th><th style="text-align:center;">Heures</th></tr></thead>
              <tbody>${autRows.map((r, i) => row(i,
                `<td>${escapeHtml(r.nom)}</td><td>${escapeHtml(r.autre || "")}</td><td style="text-align:center;"><strong>${r.heures || 0}</strong></td>`
              )).join("")}</tbody>
              <tfoot><tr class="reh-total-row">
                <td><strong>Total</strong></td><td></td><td style="text-align:center;"><strong>${autTotal}</strong></td>
              </tr></tfoot>
            </table>
          </div>
        </div>

        <div>
          <p class="subtitle">Total REH par enseignant</p>
          <div class="table-wrapper reh-table">
            <table class="ressources-table">
              <thead><tr><th>Nom</th><th style="text-align:center;">Total</th></tr></thead>
              <tbody>${totalRows.map(([k, h], i) => row(i,
                `<td>${[...names[k]].sort((a, b) => a.localeCompare(b, "fr")).map(escapeHtml).join("<br>")}</td><td style="text-align:center;"><strong>${h}</strong></td>`
              )).join("")}</tbody>
              <tfoot><tr class="reh-total-row">
                <td><strong>Total</strong></td><td style="text-align:center;"><strong>${grandTotal}</strong></td>
              </tr></tfoot>
            </table>
          </div>
        </div>

        <div>
          <p class="subtitle">Gestion parcoursup</p>
          <div class="table-wrapper reh-table">
            <table class="ressources-table">
              <thead><tr><th>Nom</th><th style="text-align:center;">Heures</th></tr></thead>
              <tbody>${psRows.map((r, i) => row(i,
                `<td>${escapeHtml(r.nom)}</td><td style="text-align:center;"><strong>${r.heures || 0}</strong></td>`
              )).join("")}</tbody>
              <tfoot><tr class="reh-total-row">
                <td><strong>Total</strong></td><td style="text-align:center;"><strong>${psTotal}</strong></td>
              </tr></tfoot>
            </table>
          </div>
        </div>

      </div>`;
  } catch (e) {
    root.innerHTML = `<div class="alert alert-danger" style="margin-top:1rem;">
      Erreur de chargement : ${e.message}</div>`;
  }
}

/* ── Rendu principal ──────────────────────────────────────────────────── */
async function renderView(view) {
  const root = document.getElementById("app-root");
  if (view === "portfolio") {
    root.innerHTML = `<div style="padding:3rem;text-align:center;color:#6b7280;">Chargement…</div>`;
    try {
      const [pfData, horairesData, enseignants, orgData] = await Promise.all([
        fetchGHJson("soutenances_portfolio/donnees_pf.json"),
        fetchGHJson("soutenances_portfolio/horaires_pf.json"),
        fetchGHJson("repartition/data/enseignants.json"),
        fetchGHJson(GH_ORG_FILE).catch(() => ({})),
      ]);
      renderPortfolio(root, pfData, horairesData, enseignants, orgData);
    } catch (e) {
      root.innerHTML = `<div class="alert alert-danger" style="margin-top:1rem;">
        Erreur de chargement : ${e.message}</div>`;
    }
  } else if (view === "sae") {
    await renderSAE(root);
  } else if (view === "missions") {
    await renderMissions(root);
  } else if (view === "autre") {
    await renderAutre(root);
  } else if (view === "parcoursup") {
    await renderParcoursup(root);
  } else if (view === "recapitulatif") {
    await renderRecap(root);
  }
}

/* ── Init ─────────────────────────────────────────────────────────────── */
AUTH.injectBadge();
navigate("portfolio");
