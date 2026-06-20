"use strict";

if (!AUTH.isAuth() || !AUTH.isAdmin()) location.href = '../index.html';

const GH_OWNER  = "nico3807";
const GH_REPO   = "Applications_gestion";
const GH_BRANCH = "main";
const GH_ORG_FILE      = "gestion_REH/orga_pf.json";
const GH_MISSIONS_FILE = "gestion_REH/missions.json";
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

function saveMissionsField(el) {
  localStorage.setItem(SK + el.id, el.value);
  if (el.tagName === "SELECT") el.classList.toggle("filled", !!el.value);
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
      <td style="white-space:nowrap; padding:4px 8px; text-align:center;">
        <button class="btn-add-subrow" onclick="addMissionRow(${i})" title="Ajouter une ligne après">+</button>
        <button class="btn-remove-subrow" onclick="removeMissionRow(${i})" title="Supprimer cette ligne" style="margin-left:4px;">×</button>
      </td>
    </tr>`;
}

function rebuildMisTable() {
  const tbody = document.getElementById("mis-tbody");
  if (tbody) tbody.innerHTML = _miState.map((row, i) => buildMisRow(i, row)).join("");
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
  const nomList = [["", "— Sélectionner —"]].concat(
    enseignants
      .sort((a, b) => a.id.localeCompare(b.id, "fr"))
      .map(e => [e.id, `${e.nom} ${e.prenom}`])
  );
  const valList = [["", "—"]].concat(
    Array.from({ length: 6 }, (_, i) => [String(i), String(i)])
  );

  const N = rows.length;
  const orgRows = Array.from({ length: N }, (_, i) => {
    const savedNom = orgData[`org_${i}_nom`] || localStorage.getItem(SK + `org_${i}_nom`) || "";
    const savedVal = orgData[`org_${i}_val`] || localStorage.getItem(SK + `org_${i}_val`) || "";
    return `
      <tr class="${i % 2 === 0 ? "group-even" : "group-odd"}">
        <td><select class="org-sel${savedNom ? " filled" : ""}" id="org_${i}_nom" onchange="saveOrgSel(this)">${makeOptions(nomList, savedNom)}</select></td>
        <td style="text-align:center;"><select class="org-sel${savedVal ? " filled" : ""}" id="org_${i}_val" onchange="saveOrgSel(this)">${makeOptions(valList, savedVal)}</select></td>
      </tr>`;
  }).join("");

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
              </tr>
            </thead>
            <tbody>${orgRows}</tbody>
          </table>
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
                <th>Missions</th>
                <th style="width:1%; white-space:nowrap; text-align:center;">Heures</th>
                <th style="width:1%;"></th>
              </tr>
            </thead>
            <tbody id="mis-tbody">${misRows}</tbody>
          </table>
        </div>
        <div style="margin-top:0.6rem;">
          <button class="btn-add-subrow" onclick="addMissionRow(_miState.length - 1)" title="Ajouter une ligne">+</button>
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
  }
}

/* ── Init ─────────────────────────────────────────────────────────────── */
AUTH.injectBadge();
navigate("portfolio");
