"use strict";

const GH_KEY = "gh_repartition_cfg";
const GH_OWNER = "nico3807";
const GH_REPO = "Applications_gestion"; // À ajuster selon le dépôt exact
const GH_BRANCH = "main";
const GH_BASE_PATH = "repartition/data"; // Dossier où se trouvent les JSON sur GitHub
const GH_ARCHIVE_PATH = "repartition/archive_25-26/data";

let ARCHIVE_MODE = false;
let ARCHIVE_VERSION = "planifiee"; // "planifiee" | "realisee"

const SEMESTRES = [
  "S1",
  "S2",
  "S3",
  "S4 crea",
  "S4 dev",
  "S5 crea",
  "S5 dev",
  "S6 crea",
  "S6 dev",
];

let APP_DATA = {
  affectations: {},
  enseignants: [],
  maquette_overrides: {},
  modifications: [],
  volume_horaire_national: {},
};

let _pendingMods = [];

function _logMod(type, description, prev, next) {
  if (!AUTH.canWrite()) return;
  const now = new Date();
  _pendingMods.push({
    date: now.toLocaleDateString("fr-FR"),
    heure: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    utilisateur: AUTH.user() || "?",
    type,
    description,
    prev: String(prev ?? "—"),
    next: String(next ?? "—"),
  });
}

async function _flushMods() {
  if (_pendingMods.length === 0) return;
  APP_DATA.modifications.push(..._pendingMods);
  _pendingMods = [];
  if (isGHConfigured()) {
    try {
      await saveFileGH("modifications.json", APP_DATA.modifications, "Update modifications.json via Web UI");
    } catch (e) {
      console.warn("Could not save modifications.json:", e);
    }
  }
}

let currentView = "home";
let currentParam = null;
let enseignantsSortMode = "alpha"; // "alpha" ou "status"

/* ── Navigation ──────────────────────────────────────────────────────────── */
window.navigate = function (view, param = null) {
  currentView = view;
  currentParam = param;
  renderView();
};

function renderView() {
  const root = document.getElementById("app-root");

  // Titre et boutons archive / retour
  const yearEl = document.getElementById("app-year");
  if (yearEl) yearEl.textContent = ARCHIVE_MODE ? "2025-2026" : "2026-2027";
  const navArchive = document.getElementById("nav-archive");
  const navCurrent = document.getElementById("nav-current");
  if (navArchive) navArchive.style.display = ARCHIVE_MODE ? "none" : "";
  if (navCurrent) navCurrent.style.display = ARCHIVE_MODE ? "" : "none";

  // Bandeau archive
  let banner = document.getElementById("archive-banner");
  if (ARCHIVE_MODE) {
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "archive-banner";
      document.querySelector("header").insertAdjacentElement("afterend", banner);
    }
    const versionLabel = ARCHIVE_VERSION === "realisee" ? "Version réalisée" : "Version planifiée";
    const btnLabel = ARCHIVE_VERSION === "realisee" ? "Voir la version planifiée" : "Voir la version réalisée";
    banner.innerHTML = `
      <span>🗂 Mode archive 2025-2026 — consultation uniquement, aucune modification possible
        &nbsp;|&nbsp; <strong>${versionLabel}</strong>
      </span>
      <button class="btn-archive-version" onclick="switchArchiveVersion()">${btnLabel}</button>`;
  } else if (banner) {
    banner.remove();
  }

  // Mise à jour de la navigation active
  document
    .querySelectorAll(".nav-link")
    .forEach((l) => l.classList.remove("active"));
  if (currentView === "home" || currentView === "semestre")
    document.getElementById("nav-home").classList.add("active");
  else if (
    currentView === "maquette_index" ||
    currentView === "maquette_semestre"
  )
    document.getElementById("nav-maquette").classList.add("active");
  else if (currentView === "services")
    document.getElementById("nav-services").classList.add("active");
  else if (currentView === "enseignants")
    document.getElementById("nav-enseignants").classList.add("active");
  else if (currentView === "modifications") {
    const nm = document.getElementById("nav-modifications");
    if (nm) nm.classList.add("active");
  }

  if (currentView === "home") renderHome(root);
  else if (currentView === "semestre") renderSemestre(root, currentParam);
  else if (currentView === "maquette_index") renderMaquetteIndex(root);
  else if (currentView === "maquette_semestre")
    renderMaquetteSemestre(root, currentParam);
  else if (currentView === "services") renderServices(root);
  else if (currentView === "enseignants") renderEnseignants(root);
  else if (currentView === "modifications") renderModifications(root);

  AUTH.applyPermissions();
  if (ARCHIVE_MODE) document.body.classList.add("auth-readonly");
}

/* ── Vues : Accueil & Semestres ─────────────────────────────────────────── */
function renderHome(root) {
  let html = `<div class="page-header"><h1>Répartition</h1><p class="subtitle">Sélectionnez un semestre pour saisir la répartition</p></div>`;
  html += `<div class="semestre-grid">`;
  SEMESTRES.forEach((sem) => {
    html += `<a href="#" class="semestre-card" data-sem="${sem}" onclick="navigate('semestre', '${sem}')">${sem} <span class="semestre-arrow">→</span></a>`;
  });
  html += `</div>`;
  root.innerHTML = html;
}

function renderSemestre(root, sem) {
  const aff = APP_DATA.affectations[sem] || {};
  const maq = APP_DATA.maquette_overrides[sem] || {};
  const enseignants = APP_DATA.enseignants
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));

  let html = `
    <div class="page-header">
        <h1>Répartition ${sem}</h1>
        <div class="semestre-nav-buttons">
            ${SEMESTRES.map((s) => `<button class="sem-btn ${s === sem ? "active" : ""}" data-sem="${s}" onclick="navigate('semestre', '${s}')">${s}</button>`).join("")}
        </div>
    </div>
    <div class="table-wrapper"><table class="ressources-table">
    <thead>
        <tr>
            <th class="col-intitule">Ressource</th>
            <th class="col-prev">Prévisionnel (CM/TD/TP)</th>
            <th class="col-enseignant">Enseignant</th>
            <th class="col-h">CM</th>
            <th class="col-h">TD</th>
            <th class="col-h">TP</th>
            <th style="width:50px"></th>
        </tr>
    </thead>
    <tbody>`;

  Object.keys(aff).forEach((res, i) => {
    const data = aff[res];
    const prev = maq[res] || {};
    const isSae = res.toLowerCase().includes("saé");
    const isPort = res.toLowerCase().includes("portfolio");
    const rowClass = isSae
      ? "row-sae"
      : isPort
        ? "row-portfolio"
        : i % 2 === 0
          ? "group-even"
          : "group-odd";

    const selEns = enseignants.find((e) => e.id === data.enseignant);
    const selClass = selEns
      ? selEns.is_vac
        ? "select-vac"
        : "select-tit"
      : "";

    html += `<tr class="${rowClass} row-main-resource">
            <td>${res}</td>
            <td><span class="prev-badge">CM: ${prev.cm_final || 0} | TD: ${prev.td_final || 0} | TP: ${prev.tp_final || 0}</span></td>
            <td>
                <select class="select-enseignant ${selClass}" onchange="updateAff('${sem}', '${res.replace(/'/g, "\\'")}', 'enseignant', this.value)">
                    <option value="">-</option>
                    ${enseignants.map((e) => `<option value="${e.id}" class="ens-option" data-vac="${e.is_vac ? "true" : "false"}" ${e.id === data.enseignant ? "selected" : ""}>${e.id}</option>`).join("")}
                </select>
            </td>
            <td><input type="number" class="input-h" value="${data.cm || 0}" onchange="updateAff('${sem}', '${res.replace(/'/g, "\\'")}', 'cm', this.value)" step="0.5"></td>
            <td><input type="number" class="input-h" value="${data.td || 0}" onchange="updateAff('${sem}', '${res.replace(/'/g, "\\'")}', 'td', this.value)" step="0.5"></td>
            <td><input type="number" class="input-h" value="${data.tp || 0}" onchange="updateAff('${sem}', '${res.replace(/'/g, "\\'")}', 'tp', this.value)" step="0.5"></td>
            <td><button class="btn-add-subrow" onclick="addSubrow('${sem}', '${res.replace(/'/g, "\\'")}')">+</button></td>
        </tr>`;

    if (data.subrows && data.subrows.length > 0) {
      const teacherCount =
        (data.enseignant ? 1 : 0) +
        data.subrows.filter((s) => s.enseignant).length;
      const subrowLabel = teacherCount >= 2 ? "↳" : "↳ Sous-groupe";

      data.subrows.forEach((sub, j) => {
        const subEns = enseignants.find((e) => e.id === sub.enseignant);
        const subSelClass = subEns
          ? subEns.is_vac
            ? "select-vac"
            : "select-tit"
          : "";

        html += `<tr class="row-subrow ${rowClass}">
                    <td class="subrow-indent">${subrowLabel}</td>
                    <td></td>
                    <td>
                        <select class="select-enseignant ${subSelClass}" onchange="updateSub('${sem}', '${res.replace(/'/g, "\\'")}', ${j}, 'enseignant', this.value)">
                            <option value="">-</option>
                            ${enseignants.map((e) => `<option value="${e.id}" class="ens-option" data-vac="${e.is_vac ? "true" : "false"}" ${e.id === sub.enseignant ? "selected" : ""}>${e.id}</option>`).join("")}
                        </select>
                    </td>
                    <td><input type="number" class="input-h" value="${sub.cm || 0}" onchange="updateSub('${sem}', '${res.replace(/'/g, "\\'")}', ${j}, 'cm', this.value)" step="0.5"></td>
                    <td><input type="number" class="input-h" value="${sub.td || 0}" onchange="updateSub('${sem}', '${res.replace(/'/g, "\\'")}', ${j}, 'td', this.value)" step="0.5"></td>
                    <td><input type="number" class="input-h" value="${sub.tp || 0}" onchange="updateSub('${sem}', '${res.replace(/'/g, "\\'")}', ${j}, 'tp', this.value)" step="0.5"></td>
                    <td><button class="btn-remove-subrow" onclick="removeSubrow('${sem}', '${res.replace(/'/g, "\\'")}', ${j})">-</button></td>
                </tr>`;
      });
    }

    const respEns = enseignants.find((e) => e.id === data.responsable);
    const respSelClass = respEns
      ? respEns.is_vac
        ? "select-vac"
        : "select-tit"
      : "";
    html += `<tr class="row-responsable ${rowClass}">
            <td colspan="7" class="responsable-label">Responsable :
                <select class="select-enseignant ${respSelClass}" onchange="updateAff('${sem}', '${res.replace(/'/g, "\\'")}', 'responsable', this.value)">
                    <option value="">-</option>
                    ${enseignants.map((e) => `<option value="${e.id}" class="ens-option" data-vac="${e.is_vac ? "true" : "false"}" ${e.id === data.responsable ? "selected" : ""}>${e.id}</option>`).join("")}
                </select>
            </td>
        </tr>`;
  });

  html += `</tbody></table></div>
    <div class="form-actions">
        <button class="btn-save" onclick="saveAffectationsGH()">💾 Enregistrer les affectations sur GitHub</button>
    </div>`;

  root.innerHTML = html;
}

window.updateAff = function (sem, res, field, value) {
  const prev = APP_DATA.affectations[sem]?.[res]?.[field] ?? "";
  if (["cm", "td", "tp"].includes(field)) value = parseFloat(value) || 0;
  _logMod("Répartition", `${sem} / ${res} / ${field}`, prev, value);
  APP_DATA.affectations[sem][res][field] = value;
  if (field === "enseignant" || field === "responsable") renderView();
};
window.updateSub = function (sem, res, idx, field, value) {
  const prev = APP_DATA.affectations[sem]?.[res]?.subrows?.[idx]?.[field] ?? "";
  if (["cm", "td", "tp"].includes(field)) value = parseFloat(value) || 0;
  _logMod("Répartition", `${sem} / ${res} / sous-groupe ${idx + 1} / ${field}`, prev, value);
  APP_DATA.affectations[sem][res].subrows[idx][field] = value;
  if (field === "enseignant") renderView();
};
window.addSubrow = function (sem, res) {
  if (!APP_DATA.affectations[sem][res].subrows)
    APP_DATA.affectations[sem][res].subrows = [];
  APP_DATA.affectations[sem][res].subrows.push({
    enseignant: "",
    cm: 0,
    td: 0,
    tp: 0,
  });
  renderView();
};
window.removeSubrow = function (sem, res, idx) {
  APP_DATA.affectations[sem][res].subrows.splice(idx, 1);
  renderView();
};

/* ── Vues : Maquette ─────────────────────────────────────────────────────── */
function renderMaquetteIndex(root) {
  let html = `<div class="page-header"><h1>Maquette - Prévisionnels</h1><p class="subtitle">Sélectionnez un semestre pour modifier la maquette</p></div>`;
  html += `<div class="semestre-grid">`;
  SEMESTRES.forEach((sem) => {
    html += `<a href="#" class="semestre-card" data-sem="${sem}" onclick="navigate('maquette_semestre', '${sem}')">${sem} <span class="semestre-arrow">→</span></a>`;
  });
  html += `</div>`;
  root.innerHTML = html;
}

function renderMaquetteSemestre(root, sem) {
  const aff = APP_DATA.affectations[sem] || {};
  const maq = APP_DATA.maquette_overrides[sem] || {};
  const vhn = APP_DATA.volume_horaire_national[sem] || {};

  let html = `
    <div class="page-header">
        <h1>Maquette ${sem}</h1>
        <div class="semestre-nav-buttons">
            ${SEMESTRES.map((s) => `<button class="sem-btn ${s === sem ? "active" : ""}" data-sem="${s}" onclick="navigate('maquette_semestre', '${s}')">${s}</button>`).join("")}
        </div>
    </div>
    <div class="table-wrapper"><table class="ressources-table maquette-table">
    <thead>
        <tr>
            <th rowspan="2" class="col-intitule">Ressource</th>
            <th colspan="3" class="group-header editable-header">Volumes Maquette</th>
            <th colspan="4" class="group-header pn-header">PN + Adaptation locale</th>
            <th rowspan="2" class="pct-header">% réalisation<br>/ PN</th>
        </tr>
        <tr>
            <th class="editable-col">CM final</th>
            <th class="editable-col">TD final</th>
            <th class="editable-col">TP final</th>
            <th class="pn-readonly-col">Vol horaire PN<br>(CM+TD+TP)</th>
            <th class="pn-readonly-col">Dont TP</th>
            <th class="pn-editable-col">Adapt locale</th>
            <th class="pn-editable-col">Dont TP</th>
        </tr>
    </thead>
    <tbody>`;

  Object.keys(aff).forEach((res, i) => {
    const m = maq[res] || { cm_final: 0, td_final: 0, tp_final: 0 };
    const v = vhn[res] || { vol_hn: 0, dont_tp_hn: 0, adapt_locale: 0, dont_tp_al: 0 };
    const rowClass = i % 2 === 0 ? "group-even" : "group-odd";
    const resEsc = res.replace(/'/g, "\\'");
    const totalMaq = (m.cm_final || 0) + (m.td_final || 0) + (m.tp_final || 0);
    const volHn = v.vol_hn || 0;
    let pctHtml;
    if (volHn === 0) {
      pctHtml = `<span class="pct-na">—</span>`;
    } else {
      const pct = (totalMaq / volHn) * 100;
      const pctClass = pct < 95 ? "pct-low" : "pct-ok";
      pctHtml = `<span class="${pctClass}">${pct.toFixed(0)} %</span>`;
    }
    html += `<tr class="${rowClass} row-main-resource">
            <td>${res}</td>
            <td><input type="number" class="input-editable" value="${m.cm_final}" onchange="updateMaq('${sem}','${resEsc}','cm_final',this.value)"></td>
            <td><input type="number" class="input-editable" value="${m.td_final}" onchange="updateMaq('${sem}','${resEsc}','td_final',this.value)"></td>
            <td><input type="number" class="input-editable" value="${m.tp_final}" onchange="updateMaq('${sem}','${resEsc}','tp_final',this.value)"></td>
            <td class="pn-readonly-val">${v.vol_hn}</td>
            <td class="pn-readonly-val">${v.dont_tp_hn}</td>
            <td><input type="number" class="input-pn-editable" value="${v.adapt_locale}" onchange="updateVolHN('${sem}','${resEsc}','adapt_locale',this.value)" step="0.5"></td>
            <td><input type="number" class="input-pn-editable" value="${v.dont_tp_al}" onchange="updateVolHN('${sem}','${resEsc}','dont_tp_al',this.value)" step="0.5"></td>
            <td class="pct-cell">${pctHtml}</td>
        </tr>`;
  });

  html += `</tbody></table></div>
    <div class="form-actions">
        <button class="btn-save" onclick="saveMaquetteGH()">💾 Enregistrer la maquette sur GitHub</button>
    </div>`;

  root.innerHTML = html;
}

window.updateMaq = function (sem, res, field, value) {
  if (!APP_DATA.maquette_overrides[sem]) APP_DATA.maquette_overrides[sem] = {};
  if (!APP_DATA.maquette_overrides[sem][res])
    APP_DATA.maquette_overrides[sem][res] = { cm_final: 0, td_final: 0, tp_final: 0 };
  const prev = APP_DATA.maquette_overrides[sem][res][field] ?? 0;
  const newVal = parseFloat(value) || 0;
  _logMod("Maquette", `${sem} / ${res} / ${field}`, prev, newVal);
  APP_DATA.maquette_overrides[sem][res][field] = newVal;
};

window.updateVolHN = function (sem, res, field, value) {
  if (!APP_DATA.volume_horaire_national[sem]) APP_DATA.volume_horaire_national[sem] = {};
  if (!APP_DATA.volume_horaire_national[sem][res])
    APP_DATA.volume_horaire_national[sem][res] = { vol_hn: 0, dont_tp_hn: 0, adapt_locale: 0, dont_tp_al: 0 };
  const prev = APP_DATA.volume_horaire_national[sem][res][field] ?? 0;
  const newVal = parseFloat(value) || 0;
  _logMod("Maquette PN", `${sem} / ${res} / ${field}`, prev, newVal);
  APP_DATA.volume_horaire_national[sem][res][field] = newVal;
};

/* ── Vue : Services ──────────────────────────────────────────────────────── */
function renderServices(root) {
  const par_enseignant = {};
  const ensMap = {};
  APP_DATA.enseignants.forEach((e) => (ensMap[e.id] = e));

  SEMESTRES.forEach((sem) => {
    const sem_data = APP_DATA.affectations[sem] || {};
    Object.keys(sem_data).forEach((res) => {
      const data = sem_data[res];
      const entries = [
        { enseignant: data.enseignant, cm: data.cm, td: data.td, tp: data.tp },
      ];
      if (data.subrows)
        data.subrows.forEach((sub) =>
          entries.push({
            enseignant: sub.enseignant,
            cm: sub.cm,
            td: sub.td,
            tp: sub.tp,
          }),
        );

      entries.forEach((entry) => {
        const ens = (entry.enseignant || "").trim();
        if (!ens) return;
        let cm = parseFloat(entry.cm) || 0;
        let td = parseFloat(entry.td) || 0;
        let tp = parseFloat(entry.tp) || 0;

        let total = 0;
        // Reprise stricte de la règle de calcul de app.py
        if (["S1", "S2", "S3"].includes(sem)) {
          total = cm * 1 + td * 2 + tp * 4;
        } else {
          total = td * 1 + tp * 2;
        }

        if (cm === 0 && td === 0 && tp === 0) return;

        if (!par_enseignant[ens]) par_enseignant[ens] = [];
        par_enseignant[ens].push({
          semestre: sem,
          ressource: res,
          cm,
          td,
          tp,
          total,
        });
      });
    });
  });

  let html = `<div class="page-header"><h1>Services des enseignants</h1></div>`;

  html += `
    <div class="services-filter">
        <button class="btn-toggle-all" onclick="toggleAllServices()">Tout déployer / Tout replier</button>
        <span style="flex:1"></span>
        <button class="btn-filter-type active" data-type="titulaire" onclick="filterServices('titulaire', this)">Titulaires</button>
        <button class="btn-filter-type active" data-type="vacataire" onclick="filterServices('vacataire', this)">Vacataires</button>
    </div>`;

  const sortedEns = Object.keys(par_enseignant).sort();

  sortedEns.forEach((ens) => {
    const eData = ensMap[ens] || {
      service_du: null,
      service_max: null,
      is_vac: false,
    };
    const isVac = eData.is_vac;
    const sDu = eData.service_du || 0;
    const sMax = eData.service_max || 0;

    let sumTotal = par_enseignant[ens].reduce(
      (acc, curr) => acc + curr.total,
      0,
    );

    let badgeHtml = "";
    if (!isVac && sDu > 0) {
      let diff = sumTotal - sDu;
      let diffClass =
        diff === 0 ? "diff-ok" : diff > 0 ? "diff-surplus" : "diff-manque";
      let diffText = diff > 0 ? `+${diff}` : diff;
      badgeHtml = `<span class="service-du-badge">Dû : ${sDu}</span> <span class="service-diff-badge ${diffClass}">${diffText}</span>`;
    } else if (isVac && sMax > 0) {
      badgeHtml = `<span class="service-max-badge">Max : ${sMax}</span>`;
    }
    badgeHtml += `<span class="service-eqtd-badge">Réalisé : ${sumTotal}</span>`;

    html += `
        <div class="service-block" data-vac="${isVac}">
            <div class="service-nom" onclick="this.parentElement.classList.toggle('is-open')">
                ${ens} ${badgeHtml}
                <span class="service-toggle-btn">▼</span>
            </div>
            <div class="service-details table-wrapper">
                <table class="ressources-table">
                    <thead><tr><th class="col-semestre">Semestre</th><th>Ressource</th><th class="col-h">CM</th><th class="col-h">TD</th><th class="col-h">TP</th><th class="col-h">Total</th></tr></thead>
                    <tbody>
                    ${par_enseignant[ens]
                      .map(
                        (r) => `<tr>
                        <td><span class="badge-semestre" data-sem="${r.semestre}">${r.semestre}</span></td>
                        <td>${r.ressource}</td>
                        <td class="col-h">${r.cm}</td>
                        <td class="col-h">${r.td}</td>
                        <td class="col-h">${r.tp}</td>
                        <td class="col-h total-cell">${r.total}</td>
                    </tr>`,
                      )
                      .join("")}
                    </tbody>
                </table>
            </div>
        </div>`;
  });

  root.innerHTML = html;
}

window.toggleAllServices = function () {
  const blocks = document.querySelectorAll(".service-block");
  const allOpen = Array.from(blocks).every((b) =>
    b.classList.contains("is-open"),
  );
  blocks.forEach((b) => b.classList.toggle("is-open", !allOpen));
};

window.filterServices = function (type, btn) {
  btn.classList.toggle("active");
  const showTit = document
    .querySelector('.btn-filter-type[data-type="titulaire"]')
    .classList.contains("active");
  const showVac = document
    .querySelector('.btn-filter-type[data-type="vacataire"]')
    .classList.contains("active");

  document.querySelectorAll(".service-block").forEach((b) => {
    const isVac = b.getAttribute("data-vac") === "true";
    if ((isVac && showVac) || (!isVac && showTit)) b.style.display = "";
    else b.style.display = "none";
  });
};

/* ── Vue : Enseignants ───────────────────────────────────────────────────── */
window.toggleSortEnseignants = function () {
  enseignantsSortMode = enseignantsSortMode === "alpha" ? "status" : "alpha";
  renderView();
};

window.sortEnseignantsArray = function () {
  APP_DATA.enseignants.sort((a, b) => {
    if (enseignantsSortMode === "status" && a.is_vac !== b.is_vac)
      return a.is_vac ? 1 : -1;
    return a.id.localeCompare(b.id);
  });
};

function renderEnseignants(root) {
  sortEnseignantsArray();

  // Calcul des heures réalisées par enseignant
  const totals = {};
  const rawHours = {}; // cm/td/tp bruts pour Eq TD
  const wHours = {};   // cm/td/tp pondérés par semestre pour colonnes CM/TD/TP
  SEMESTRES.forEach((sem) => {
    const sem_data = APP_DATA.affectations[sem] || {};
    Object.keys(sem_data).forEach((res) => {
      const data = sem_data[res];
      const entries = [
        { enseignant: data.enseignant, cm: data.cm, td: data.td, tp: data.tp },
      ];
      if (data.subrows) {
        data.subrows.forEach((sub) =>
          entries.push({
            enseignant: sub.enseignant,
            cm: sub.cm,
            td: sub.td,
            tp: sub.tp,
          }),
        );
      }

      entries.forEach((entry) => {
        const ens = (entry.enseignant || "").trim();
        if (!ens) return;
        let cm = parseFloat(entry.cm) || 0;
        let td = parseFloat(entry.td) || 0;
        let tp = parseFloat(entry.tp) || 0;

        let total = 0;
        if (["S1", "S2", "S3"].includes(sem)) {
          total = cm * 1 + td * 2 + tp * 4;
        } else {
          total = td * 1 + tp * 2;
        }

        if (!totals[ens]) totals[ens] = 0;
        totals[ens] += total;

        if (!rawHours[ens]) rawHours[ens] = { cm: 0, td: 0, tp: 0 };
        rawHours[ens].cm += cm;
        rawHours[ens].td += td;
        rawHours[ens].tp += tp;

        if (!wHours[ens]) wHours[ens] = { cm: 0, td: 0, tp: 0 };
        if (["S1", "S2", "S3"].includes(sem)) {
          wHours[ens].cm += cm * 1;
          wHours[ens].td += td * 2;
          wHours[ens].tp += tp * 4;
        } else {
          wHours[ens].td += td * 1;
          wHours[ens].tp += tp * 2;
        }
      });
    });
  });

  let html = `<div class="page-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
    <h1 style="margin: 0;">Gestion des enseignants</h1>
    <button class="btn-toggle-all" onclick="toggleSortEnseignants()">
        ⇅ Trier : ${enseignantsSortMode === "alpha" ? "Titulaires puis Vacataires" : "Alphabétique"}
    </button>
  </div>`;
  html += `<div class="table-wrapper"><table class="ressources-table">
    <thead><tr><th>Nom complet</th><th>Statut</th><th>Service Dû</th><th>Service Max</th><th>Total Réalisé</th><th>Différence</th><th class="col-h">CM</th><th class="col-h">TD</th><th class="col-h">TP</th><th>Eq TD</th><th style="width:80px; text-align:center;">Actions</th></tr></thead><tbody>`;

  APP_DATA.enseignants.forEach((e, i) => {
    const totalRealise = totals[e.id] || 0;

    let diffHtml = "<span style='color:#9ca3af'>-</span>";
    if (!e.is_vac && e.service_du != null) {
      const diff = totalRealise - e.service_du;
      const sign = diff > 0 ? "+" : "";
      const style = diff === 0
        ? "color:#16a34a;font-weight:700;"
        : diff < 0
          ? "color:#dc2626;font-weight:700;"
          : "font-weight:600;";
      diffHtml = `<span style="${style}">${sign}${diff}</span>`;
    } else if (e.is_vac && e.service_max != null) {
      const diff = totalRealise - e.service_max;
      const sign = diff > 0 ? "+" : "";
      const style = diff === 0
        ? "color:#16a34a;font-weight:700;"
        : diff > 0
          ? "color:#dc2626;font-weight:700;"
          : "font-weight:600;";
      diffHtml = `<span style="${style}">${sign}${diff}</span>`;
    }

    const raw = rawHours[e.id] || { cm: 0, td: 0, tp: 0 };
    const w = wHours[e.id] || { cm: 0, td: 0, tp: 0 };
    const eqTdHtml = !e.is_vac
      ? `<strong>${(w.cm * 1.5 + w.td + (2 / 3) * w.tp).toFixed(2)}</strong>`
      : `<span style="color:#9ca3af">-</span>`;

    html += `<tr class="enseignant-item" data-vac="${e.is_vac ? "true" : "false"}">
            <td>${e.id}</td>
            <td>${e.is_vac ? (e.is_cev ? "Vacataire (CEV)" : "Vacataire") : "Titulaire"}</td>
            <td>${e.service_du != null ? e.service_du : "-"}</td>
            <td>${e.service_max != null ? e.service_max : "-"}</td>
            <td><strong>${totalRealise}</strong></td>
            <td style="text-align:center;">${diffHtml}</td>
            <td style="text-align:center;">${!e.is_vac ? (w.cm || "-") : "<span style='color:#9ca3af'>-</span>"}</td>
            <td style="text-align:center;">${!e.is_vac ? (w.td || "-") : "<span style='color:#9ca3af'>-</span>"}</td>
            <td style="text-align:center;">${!e.is_vac ? (w.tp || "-") : "<span style='color:#9ca3af'>-</span>"}</td>
            <td style="text-align:center;">${eqTdHtml}</td>
            <td>
                <div style="display:flex; gap:6px; justify-content:center;">
                    <button class="btn-edit-subrow" onclick="openEditEnsModal(${i})" title="Modifier">✏️</button>
                    <button class="btn-remove-subrow" onclick="deleteEns(${i})" title="Supprimer">🗑</button>
                </div>
            </td>
        </tr>`;
  });

  html += `</tbody></table></div>`;

  // Calcul du pourcentage de vacataire
  const ensMapStat = {};
  APP_DATA.enseignants.forEach((e) => (ensMapStat[e.id] = e));
  let heuresPermanents = 0, heuresCEV = 0, heuresVacSimples = 0;
  Object.keys(totals).forEach((id) => {
    const e = ensMapStat[id];
    if (!e) return;
    if (!e.is_vac) heuresPermanents += totals[id];
    else if (e.is_cev) heuresCEV += totals[id];
    else heuresVacSimples += totals[id];
  });
  const grandTotal = heuresPermanents + heuresCEV + heuresVacSimples;
  const pctVac = grandTotal > 0 ? (heuresVacSimples / grandTotal * 100) : 0;
  const pctColor = pctVac < 25 ? "#dc2626" : "#16a34a";
  const pctBg = pctVac < 25 ? "#fef2f2" : "#f0fdf4";
  const pctBorder = pctVac < 25 ? "#fecaca" : "#bbf7d0";

  html += `<div style="display:flex; gap:1.5rem; align-items:flex-start; flex-wrap:wrap; margin-top:2rem">
    <div class="form-card">
        <h3 style="margin-bottom:1rem">Ajouter un enseignant</h3>
        <div class="form-group"><label>Nom</label><input type="text" id="new_ens_nom" class="form-input"></div>
        <div class="form-group"><label>Prénom</label><input type="text" id="new_ens_prenom" class="form-input"></div>
        <div class="form-group form-group-check"><label><input type="checkbox" id="new_ens_vac" onchange="document.getElementById('new_cev_group').style.display = this.checked ? 'block' : 'none'; if (!this.checked) document.getElementById('new_ens_cev').checked = false;"> Est vacataire</label></div>
        <div class="form-group form-group-check" id="new_cev_group" style="display:none; padding-left:1.5rem"><label><input type="checkbox" id="new_ens_cev"> Chargé d'enseignement vacataire (CEV)</label></div>
        <div class="form-group"><label>Service dû (Titulaires)</label><input type="number" id="new_ens_du" class="form-input"></div>
        <div class="form-group"><label>Service max (Vacataires)</label><input type="number" id="new_ens_max" class="form-input"></div>
        <button class="btn-save" onclick="addEns()">Ajouter</button>
        <button class="btn-save" style="margin-left:1rem; background:#16a34a" onclick="saveEnseignantsGH()">💾 Enregistrer sur GitHub</button>
    </div>
    <div class="form-card" style="max-width:280px; background:${pctBg}; border-color:${pctBorder}">
        <h3 style="margin-bottom:1.25rem; color:#1e3a5f">Pourcentage de vacataire</h3>
        <div style="font-size:3rem; font-weight:800; color:${pctColor}; text-align:center; line-height:1; margin-bottom:1.25rem">${pctVac.toFixed(1)}<span style="font-size:1.5rem">%</span></div>
        <div style="font-size:13px; color:#374151; display:flex; flex-direction:column; gap:6px; border-top:1px solid ${pctBorder}; padding-top:1rem">
            <div style="display:flex; justify-content:space-between; gap:1rem"><span>Titulaires + CEV</span><strong>${(heuresPermanents + heuresCEV).toFixed(1)} h</strong></div>
            <div style="display:flex; justify-content:space-between; gap:1rem"><span>Vacataires simples</span><strong>${heuresVacSimples.toFixed(1)} h</strong></div>
            <div style="display:flex; justify-content:space-between; gap:1rem; margin-top:4px; border-top:1px solid ${pctBorder}; padding-top:6px; font-weight:600"><span>Total</span><strong>${grandTotal.toFixed(1)} h</strong></div>
        </div>
    </div>
  </div>`;

  root.innerHTML = html;
}

window.addEns = function () {
  const nom = document.getElementById("new_ens_nom").value.trim().toUpperCase();
  const prenom = document.getElementById("new_ens_prenom").value.trim();
  const is_vac = document.getElementById("new_ens_vac").checked;
  const is_cev = is_vac && document.getElementById("new_ens_cev").checked;
  const du = parseFloat(document.getElementById("new_ens_du").value) || null;
  const max = parseFloat(document.getElementById("new_ens_max").value) || null;

  if (!nom && !prenom) return alert("Le nom ou prénom est requis.");
  const id = `${nom} ${prenom}`.trim();
  if (APP_DATA.enseignants.find((e) => e.id === id))
    return alert("Cet enseignant existe déjà.");

  APP_DATA.enseignants.push({ id, nom, prenom, is_vac, ...(is_vac ? { is_cev } : {}), service_du: du, service_max: max });
  _logMod("Enseignants", "Ajout", "—", id);
  renderView();
};

window.deleteEns = async function (i) {
  if (confirm("Supprimer cet enseignant ?")) {
    _logMod("Enseignants", "Suppression", APP_DATA.enseignants[i].id, "—");
    APP_DATA.enseignants.splice(i, 1);
    renderView();
    if (isGHConfigured()) await saveEnseignantsGH();
  }
};

window.openEditEnsModal = function (i) {
  const e = APP_DATA.enseignants[i];
  let modal = document.getElementById("edit-ens-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "edit-ens-modal";
    modal.className = "gh-modal-overlay";
    document.body.appendChild(modal);
    modal.addEventListener("click", (evt) => {
      if (evt.target === modal) closeEditEnsModal();
    });
  }

  modal.innerHTML = `
    <div class="form-card" style="margin:10% auto; position:relative; max-width:400px">
        <h3 style="margin-bottom:1rem; color:#1e3a5f">Modifier ${e.id}</h3>
        <div class="form-group form-group-check">
            <label><input type="checkbox" id="edit_ens_vac" ${e.is_vac ? "checked" : ""} onchange="document.getElementById('edit_cev_group').style.display = this.checked ? 'block' : 'none'; if (!this.checked) document.getElementById('edit_ens_cev').checked = false;"> Est vacataire</label>
        </div>
        <div class="form-group form-group-check" id="edit_cev_group" style="display:${e.is_vac ? "block" : "none"}; padding-left:1.5rem">
            <label><input type="checkbox" id="edit_ens_cev" ${e.is_cev ? "checked" : ""}> Chargé d'enseignement vacataire (CEV)</label>
        </div>
        <div class="form-group">
            <label>Service dû (Titulaires)</label>
            <input type="number" id="edit_ens_du" class="form-input" value="${e.service_du || ""}">
        </div>
        <div class="form-group">
            <label>Service max (Vacataires)</label>
            <input type="number" id="edit_ens_max" class="form-input" value="${e.service_max || ""}">
        </div>
        <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1.5rem;">
            <button class="btn-cancel" onclick="closeEditEnsModal()">Annuler</button>
            <button class="btn-save" onclick="saveEditEns(${i})">Enregistrer</button>
        </div>
    </div>`;
  modal.style.display = "block";
};

window.closeEditEnsModal = function () {
  const modal = document.getElementById("edit-ens-modal");
  if (modal) modal.style.display = "none";
};

window.saveEditEns = async function (i) {
  const is_vac = document.getElementById("edit_ens_vac").checked;
  const is_cev = is_vac && document.getElementById("edit_ens_cev").checked;
  const du = parseFloat(document.getElementById("edit_ens_du").value) || null;
  const max = parseFloat(document.getElementById("edit_ens_max").value) || null;

  const e = APP_DATA.enseignants[i];
  const prev = `${e.is_vac ? (e.is_cev ? "Vacataire (CEV)" : "Vacataire") : "Titulaire"}, dû:${e.service_du ?? "—"}, max:${e.service_max ?? "—"}`;
  const next = `${is_vac ? (is_cev ? "Vacataire (CEV)" : "Vacataire") : "Titulaire"}, dû:${du ?? "—"}, max:${max ?? "—"}`;
  _logMod("Enseignants", `Modification ${e.id}`, prev, next);

  APP_DATA.enseignants[i].is_vac = is_vac;
  if (is_vac) APP_DATA.enseignants[i].is_cev = is_cev;
  else delete APP_DATA.enseignants[i].is_cev;
  APP_DATA.enseignants[i].service_du = du;
  APP_DATA.enseignants[i].service_max = max;

  closeEditEnsModal();
  renderView();
  if (isGHConfigured()) await saveEnseignantsGH();
};

/* ── Logique GitHub & Données ────────────────────────────────────────────── */
window.showToast = function (msg) {
  let t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
};

window.isGHConfigured = function () {
  return !!getGHConfig().token;
};
window.getGHConfig = function () {
  try {
    return JSON.parse(localStorage.getItem(GH_KEY)) || {};
  } catch {
    return {};
  }
};

window.openGHModal = function () {
  document.getElementById("gh-modal").style.display = "block";
};
window.closeGHModal = function () {
  document.getElementById("gh-modal").style.display = "none";
};
window.saveGHFromModal = function () {
  const token = document.getElementById("gh-token").value.trim();
  if (!token) return alert("Saisissez un token.");
  localStorage.setItem(GH_KEY, JSON.stringify({ token }));
  const btn = document.getElementById("gh-config-btn");
  if (btn) btn.innerHTML = "● GitHub configuré";
  alert("Token enregistré !");
  closeGHModal();
};

function injectGHUI() {
  const footer = document.createElement("div");
  footer.className = "gh-footer";
  footer.innerHTML = `<button class="gh-footer-link" id="gh-config-btn" onclick="openGHModal()">${isGHConfigured() ? "● GitHub configuré" : "⚙ Configurer sauvegarde GitHub"}</button>`;
  document.body.appendChild(footer);

  const modal = document.createElement("div");
  modal.id = "gh-modal";
  modal.className = "gh-modal-overlay";
  modal.style.display = "none";
  modal.innerHTML = `
    <div class="form-card" style="margin:10% auto; position:relative; max-width:400px">
        <h3 style="margin-bottom:1rem; color:#1e3a5f">⚙ Token GitHub</h3>
        <p style="font-size:13px; color:#6b7280; margin-bottom:1rem;">Les JSON seront sauvegardés dans <strong>${GH_OWNER}/${GH_REPO}</strong> (branche <code>${GH_BRANCH}</code>).</p>
        <div class="form-group">
            <label>Personal Access Token</label>
            <input id="gh-token" class="form-input" type="password" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx">
        </div>
        <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1.5rem;">
            <button class="btn-cancel" onclick="closeGHModal()">Annuler</button>
            <button class="btn-save" onclick="saveGHFromModal()">Enregistrer</button>
        </div>
    </div>`;
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeGHModal();
  });
  document.body.appendChild(modal);

  const cfg = getGHConfig();
  if (cfg.token) document.getElementById("gh-token").value = cfg.token;
}

async function fetchGH(filename, basePath = GH_BASE_PATH) {
  const cfg = getGHConfig();
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${basePath}/${filename}?ref=${GH_BRANCH}`;
  const resp = await fetch(url, {
    // Ajout de no-cache pour éviter les conflits de version dus au cache du navigateur
    cache: "no-cache",
    headers: {
      Authorization: `token ${cfg.token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!resp.ok) return null;
  const json = await resp.json();
  return JSON.parse(
    decodeURIComponent(escape(atob(json.content.replace(/\n/g, "")))),
  );
}

async function saveFileGH(filename, dataObj, msg) {
  const cfg = getGHConfig();
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_BASE_PATH}/${filename}`;
  const content = btoa(
    unescape(encodeURIComponent(JSON.stringify(dataObj, null, 2))),
  );
  let sha = null;
  try {
    const r = await fetch(`${url}?ref=${GH_BRANCH}`, {
      // Ajout de no-cache pour s'assurer de récupérer le SHA le plus récent
      cache: "no-cache",
      headers: {
        Authorization: `token ${cfg.token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    if (r.ok) sha = (await r.json()).sha;
  } catch {}

  const body = { message: msg, content, branch: GH_BRANCH };
  if (sha) body.sha = sha;

  const r = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${cfg.token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    let errMsg = `Erreur ${r.status}`;
    try {
      const errJson = await r.json();
      if (r.status === 401)
        errMsg = "Token GitHub invalide ou expiré — reconfigurez-le via le bouton en bas de page.";
      else
        errMsg = errJson.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }
}

window.saveAffectationsGH = async function () {
  if (ARCHIVE_MODE) return showToast("Archives 2025-2026 — consultation uniquement");
  if (!isGHConfigured()) return alert("Veuillez configurer GitHub d'abord !");
  try {
    await _flushMods();
    await saveFileGH("affectations.json", APP_DATA.affectations, "Update affectations.json via Web UI");
    showToast("Affectations sauvegardées sur GitHub !");
  } catch (e) {
    alert("Erreur: " + e.message);
  }
};

window.saveEnseignantsGH = async function () {
  if (ARCHIVE_MODE) return showToast("Archives 2025-2026 — consultation uniquement");
  if (!isGHConfigured()) return alert("Veuillez configurer GitHub d'abord !");

  // Si le formulaire contient des données non encore ajoutées, les ajouter d'abord
  const nomField = document.getElementById("new_ens_nom");
  const prenomField = document.getElementById("new_ens_prenom");
  if (nomField && prenomField && (nomField.value.trim() || prenomField.value.trim())) {
    const countBefore = APP_DATA.enseignants.length;
    addEns();
    if (APP_DATA.enseignants.length === countBefore) return; // addEns a échoué (doublon ou champ vide)
  }

  try {
    await _flushMods();
    await saveFileGH("enseignants.json", APP_DATA.enseignants, "Update enseignants.json via Web UI");
    showToast("Enseignants sauvegardés sur GitHub !");
  } catch (e) {
    alert("Erreur: " + e.message);
  }
};

window.saveMaquetteGH = async function () {
  if (ARCHIVE_MODE) return showToast("Archives 2025-2026 — consultation uniquement");
  if (!isGHConfigured()) return alert("Veuillez configurer GitHub d'abord !");
  try {
    await _flushMods();
    await Promise.all([
      saveFileGH("maquette_overrides.json", APP_DATA.maquette_overrides, "Update maquette_overrides.json via Web UI"),
      saveFileGH("volume_horaire_national.json", APP_DATA.volume_horaire_national, "Update volume_horaire_national.json via Web UI"),
    ]);
    showToast("Maquette sauvegardée sur GitHub !");
  } catch (e) {
    alert("Erreur: " + e.message);
  }
};

/* ── Vue : Journal des modifications ────────────────────────────────────── */
function renderModifications(root) {
  const mods = APP_DATA.modifications.slice().reverse();

  let html = `
    <div class="page-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
      <div>
        <h1 style="margin:0;">Journal des modifications</h1>
        <p class="subtitle">Modifications effectuées par les utilisateurs avec droits d'écriture</p>
      </div>
      ${mods.length > 0 ? `<button class="btn-delete" onclick="clearModificationsGH()" style="flex-shrink:0;">🗑 Vider le journal</button>` : ""}
    </div>`;

  if (mods.length === 0) {
    html += `<p style="text-align:center; color:#6b7280; padding:3rem 0;">Aucune modification enregistrée.</p>`;
    root.innerHTML = html;
    return;
  }

  html += `<div class="table-wrapper"><table class="ressources-table">
    <thead>
      <tr>
        <th style="width:90px">Date</th>
        <th style="width:70px">Heure</th>
        <th style="width:100px">Utilisateur</th>
        <th>Type</th>
        <th>Valeur précédente</th>
        <th>Valeur modifiée</th>
      </tr>
    </thead>
    <tbody>`;

  mods.forEach((m, i) => {
    const rowClass = i % 2 === 0 ? "mod-row-blue" : "mod-row-green";
    html += `<tr class="${rowClass}">
      <td>${m.date}</td>
      <td>${m.heure}</td>
      <td><strong>${m.utilisateur}</strong></td>
      <td>${m.type}${m.description ? `<br><small class="mod-desc">${m.description}</small>` : ""}</td>
      <td>${m.prev}</td>
      <td>${m.next}</td>
    </tr>`;
  });

  html += `</tbody></table></div>`;
  root.innerHTML = html;
}

window.clearModificationsGH = async function () {
  if (!confirm("Vider définitivement le journal des modifications ?")) return;
  APP_DATA.modifications = [];
  if (isGHConfigured()) {
    try {
      await saveFileGH("modifications.json", [], "Vider le journal des modifications via Web UI");
      showToast("Journal vidé sur GitHub !");
    } catch (e) {
      alert("Erreur: " + e.message);
      return;
    }
  }
  renderView();
};

window.switchToArchive = async function () {
  ARCHIVE_MODE = true;
  ARCHIVE_VERSION = "planifiee";
  APP_DATA = { affectations: {}, enseignants: [], maquette_overrides: {}, modifications: [], volume_horaire_national: {} };
  currentView = "home";
  await loadData();
};

window.switchToCurrent = async function () {
  ARCHIVE_MODE = false;
  ARCHIVE_VERSION = "planifiee";
  APP_DATA = { affectations: {}, enseignants: [], maquette_overrides: {}, modifications: [], volume_horaire_national: {} };
  currentView = "home";
  await loadData();
};

window.switchArchiveVersion = async function () {
  ARCHIVE_VERSION = ARCHIVE_VERSION === "planifiee" ? "realisee" : "planifiee";
  APP_DATA.affectations = {};
  await loadData();
};

async function loadData() {
  const localBase = ARCHIVE_MODE ? "archive_25-26/data" : "data";
  const ghBase   = ARCHIVE_MODE ? GH_ARCHIVE_PATH : GH_BASE_PATH;
  const sfx      = ARCHIVE_MODE ? "_25-26" : "";
  const affSfx   = ARCHIVE_MODE && ARCHIVE_VERSION === "realisee" ? "_25-26_realise" : sfx;

  // 1. Charge d'abord les fichiers locaux (fallback garanti)
  try {
    const [aff, ens, maq, mods, vhn] = await Promise.all([
      fetch(`${localBase}/affectations${affSfx}.json`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${localBase}/enseignants${sfx}.json`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${localBase}/maquette_overrides${sfx}.json`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${localBase}/modifications${sfx}.json`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${localBase}/volume_horaire_national.json`).then((r) => (r.ok ? r.json() : null)),
    ]);
    if (aff) APP_DATA.affectations = aff;
    if (ens) APP_DATA.enseignants = ens;
    if (maq) APP_DATA.maquette_overrides = maq;
    if (mods) APP_DATA.modifications = mods;
    if (vhn) APP_DATA.volume_horaire_national = vhn;
  } catch (e) {
    console.warn("Local load failed (file:// ?)", e);
  }

  // 2. Si GitHub est configuré, tente de récupérer les données (priorité sur local)
  if (isGHConfigured()) {
    try {
      const [aff, ens, maq, mods, vhn] = await Promise.all([
        fetchGH(`affectations${affSfx}.json`, ghBase),
        fetchGH(`enseignants${sfx}.json`, ghBase),
        fetchGH(`maquette_overrides${sfx}.json`, ghBase),
        fetchGH(`modifications${sfx}.json`, ghBase),
        fetchGH(`volume_horaire_national.json`, ghBase),
      ]);
      if (aff) APP_DATA.affectations = aff;
      if (ens) APP_DATA.enseignants = ens;
      if (maq) APP_DATA.maquette_overrides = maq;
      if (mods) APP_DATA.modifications = mods;
      if (vhn) APP_DATA.volume_horaire_national = vhn;
    } catch (e) {
      console.warn("GH load failed, données locales conservées", e);
    }
  }

  renderView();
}

document.addEventListener("DOMContentLoaded", async () => {
  AUTH.injectUI();
  const init = async () => {
    injectGHUI();
    await loadData();
    AUTH.injectBadge();
  };
  if (AUTH.isAuth()) {
    await init();
  } else {
    window.addEventListener("auth-success", init, { once: true });
  }
});
