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

/* Données SAÉ par défaut (PN 2022) — toujours disponibles même sans JSON */
const _SAE_DEFAULT = {
  semestres: ["S1", "S2", "S3", "S4 crea", "S4 dev", "S5 crea", "S5 dev", "S6 crea", "S6 dev"],
  sae: {
    S1: [
      { code: "SAÉ 1.01 | Auditer une communication numérique",
        competence: "Comprendre les écosystèmes, les besoins des utilisateurs et les dispositifs de communication numérique",
        ressources: ["R1.03 | Ergonomie et Accessibilité","R1.04 | Culture numérique","R1.05 | Stratégies de communication et marketing","R1.09 | Culture artistique","R1.14 | Représentation et traitement de l'information","R1.16 | Économie, gestion et droit du numérique"],
        responsable: "" },
      { code: "SAÉ 1.02 | Concevoir une recommandation de communication numérique",
        competence: "Concevoir ou co-concevoir une réponse stratégique pertinente à une problématique complexe",
        ressources: ["R1.01 | Anglais","R1.02 | Anglais Renforcé ou LV2","R1.05 | Stratégies de communication et marketing","R1.06 | Expression, communication et rhétorique"],
        responsable: "" },
      { code: "SAÉ 1.03 | Produire les éléments d'une communication visuelle",
        competence: "Exprimer un message avec les médias numériques pour informer et communiquer",
        ressources: ["R1.01 | Anglais","R1.08 | Production graphique","R1.09 | Culture artistique","R1.14 | Représentation et traitement de l'information"],
        responsable: "" },
      { code: "SAÉ 1.04 | Produire un contenu audio et vidéo",
        competence: "Exprimer un message avec les médias numériques pour informer et communiquer",
        ressources: ["R1.07 | Écriture multimédia et narration","R1.10 | Production audio et vidéo","R1.14 | Représentation et traitement de l'information"],
        responsable: "" },
      { code: "SAÉ 1.05 | Produire un site Web",
        competence: "Développer pour le web et les médias numériques",
        ressources: ["R1.11 | Intégration","R1.12 | Développement Web","R1.13 | Hébergement"],
        responsable: "" },
      { code: "SAÉ 1.06 | Gérer un projet de communication numérique",
        competence: "Entreprendre dans le secteur du numérique",
        ressources: ["R1.01 | Anglais","R1.02 | Anglais Renforcé ou LV2","R1.06 | Expression, communication et rhétorique","R1.15 | Gestion de projet","R1.16 | Économie, gestion et droit du numérique","R1.17 | Projet Personnel et Professionnel"],
        responsable: "" }
    ],
    S2: [
      { code: "SAÉ 2.01 | Explorer les usages du numérique",
        competence: "Comprendre les écosystèmes, les besoins des utilisateurs et les dispositifs de communication numérique",
        ressources: ["R2.01 | Anglais","R2.02 | Anglais Renforcé ou LV2","R2.03 | Ergonomie et Accessibilité","R2.04 | Culture numérique","R2.05 | Stratégies de communication et marketing","R2.06 | Expression, communication et rhétorique","R2.07 | Écriture multimédia et narration","R2.16 | Représentation et traitement de l'information"],
        responsable: "" },
      { code: "SAÉ 2.02 | Concevoir un produit ou un service et sa communication",
        competence: "Concevoir · Exprimer · Développer · Entreprendre",
        ressources: ["R2.08 | Production graphique","R2.09 | Culture artistique","R2.10 | Production audio et vidéo","R2.11 | Gestion de contenus","R2.16 | Représentation et traitement de l'information","R2.17 | Gestion de projet","R2.18 | Économie, gestion et droit du numérique","R2.19 | Projet Personnel et Professionnel"],
        responsable: "" },
      { code: "SAÉ 2.03 | Concevoir un site web avec une source de données",
        competence: "Développer pour le web et les médias numériques",
        ressources: ["R2.12 | Intégration","R2.13 | Développement Web","R2.14 | Système d'information","R2.15 | Hébergement"],
        responsable: "" },
      { code: "SAÉ 2.04 | Construire sa présence en ligne",
        competence: "Entreprendre dans le secteur du numérique",
        ressources: ["R2.06 | Expression, communication et rhétorique","R2.19 | Projet Personnel et Professionnel"],
        responsable: "" },
      { code: "SAÉ 2.98 | Hackathon", competence: "", ressources: [], responsable: "" },
      { code: "SAÉ 2.99 | Marathon MMI", competence: "", ressources: [], responsable: "" }
    ],
    S3: [
      { code: "SAÉ 3.01 | Intégrer des interfaces utilisateurs au sein d'un système d'information",
        competence: "Comprendre · Concevoir · Développer · Entreprendre",
        ressources: ["R3.03 | Design d'expérience","R3.04 | Culture numérique","R3.12 | Développement Front et intégration","R3.14 | Déploiement de services","R3.16 | Gestion de projet","R3.17 | Économie, gestion et droit du numérique","R3.18 | Projet Personnel et Professionnel"],
        responsable: "" },
      { code: "SAÉ 3.02 | Produire des contenus pour une communication plurimédia",
        competence: "Comprendre · Concevoir · Exprimer · Entreprendre",
        ressources: ["R3.01 | Anglais","R3.02 | Anglais Renforcé ou LV2","R3.06 | Référencement","R3.07 | Expression, communication et rhétorique","R3.08 | Écriture multimédia et narration","R3.10 | Culture artistique","R3.11 | Audiovisuel et Motion design","R3.15 | Représentation et traitement de l'information","R3.17 | Économie, gestion et droit du numérique"],
        responsable: "" },
      { code: "SAÉ 3.03 | Concevoir des visualisations de données pour le web et un support animé",
        competence: "Comprendre · Exprimer · Développer",
        ressources: ["R3.10 | Culture artistique","R3.11 | Audiovisuel et Motion design","R3.12 | Développement Front et intégration","R3.15 | Représentation et traitement de l'information"],
        responsable: "" }
    ],
    "S4 crea": [
      { code: "SAÉ 4.Crea.01 | Créer pour une campagne de communication visuelle",
        competence: "Comprendre · Concevoir · Exprimer · Entreprendre",
        ressources: ["R4.Crea.01 | Anglais","R4.02 | Économie, gestion et Droit du numérique","R4.03 | Design d'expérience","R4.Crea.06 | Culture artistique"],
        responsable: "" },
      { code: "SAÉ 4.Crea.02 | Produire du contenu multimédia",
        competence: "Concevoir · Exprimer · Développer · Entreprendre",
        ressources: ["R4.Crea.01 | Anglais","R4.03 | Design d'expérience","R4.04 | Expression, communication","R4.Crea.05 | Gestion de contenus spécialisée","R4.Crea.07 | Audiovisuel – Motion design","R4.Crea.08 | Écriture multimédia et narration"],
        responsable: "" },
      { code: "SAÉ 4.Crea.03 | SAE langues", competence: "", ressources: [], responsable: "" },
      { code: "SAÉ 4.98 | Hackathon", competence: "", ressources: [], responsable: "" },
      { code: "SAÉ 4.99 | Marathon MMI", competence: "", ressources: [], responsable: "" }
    ],
    "S4 dev": [
      { code: "SAÉ 4.DWeb-DI.01 | Développer pour le Web",
        competence: "Comprendre · Concevoir · Développer · Entreprendre",
        ressources: ["R4.DWeb-DI.01 | Anglais","R4.02 | Économie, gestion et Droit du numérique","R4.03 | Design d'expérience","R4.04 | Expression, communication","R4.DWeb-DI.06 | Développement front","R4.DWeb-DI.07 | Développement back","R4.DWeb-DI.08 | Déploiement de services"],
        responsable: "" },
      { code: "SAÉ 4.DWeb-DI.02 | Concevoir un dispositif interactif",
        competence: "Exprimer · Développer",
        ressources: ["R4.DWeb-DI.01 | Anglais","R4.DWeb-DI.05 | Création et design interactif","R4.DWeb-DI.06 | Développement front"],
        responsable: "" },
      { code: "SAÉ 4.DWeb-DI.04 | Apprentis : Interface, contenus et visualisation",
        competence: "", ressources: [], responsable: "" },
      { code: "SAÉ 4.98 | Hackathon", competence: "", ressources: [], responsable: "" },
      { code: "SAÉ 4.99 | Marathon MMI", competence: "", ressources: [], responsable: "" }
    ],
    "S5 crea": [
      { code: "SAÉ 5.Crea.01 | Créer par/pour le numérique",
        competence: "Exprimer · Entreprendre",
        ressources: ["R5.01 | Anglais","R5.02 | Management et Assurance qualité","R5.03 | Entrepreneuriat","R5.04 | Projet Personnel et Professionnel","R5.Crea.05 | Définir une direction artistique","R5.Crea.06 | Création numérique","R5.Crea.07 | Écriture Multimédia et narration"],
        responsable: "" },
      { code: "SAÉ 5.Crea.02 | SAE Management", competence: "", ressources: [], responsable: "" },
      { code: "SAÉ 5.Crea.03 | SAE Conception d'interface", competence: "", ressources: [], responsable: "" }
    ],
    "S5 dev": [
      { code: "SAÉ 5D.01 | Développer pour le web",
        competence: "Développer · Entreprendre",
        ressources: ["R5.01 | Anglais","R5.02 | Management et Assurance qualité","R5.03 | Entrepreneuriat","R5.04 | Projet Personnel et Professionnel","R5.DWeb-DI.05 | Développement front avancé","R5.DWeb-DI.06 | Développement back avancé","R5.DWeb-DI.07 | Dispositifs interactifs","R5.DWeb-DI.08 | Hébergement et cybersécurité"],
        responsable: "" },
      { code: "SAÉ 5D.02 | SAE Management", competence: "", ressources: [], responsable: "" },
      { code: "SAÉ 5D.03 | Concevoir un dispositif interactif", competence: "", ressources: [], responsable: "" },
      { code: "SAÉ 5D.04 | Integration d'un LLM", competence: "", ressources: [], responsable: "" }
    ],
    "S6 crea": [
      { code: "SAÉ 6.Crea.01 | UX / UI avancé", competence: "", ressources: [], responsable: "" }
    ],
    "S6 dev": [
      { code: "SAÉ 6.dev.01 | Developpement avancé", competence: "", ressources: [], responsable: "" }
    ]
  }
};

let APP_DATA = {
  affectations: {},
  enseignants: [],
  maquette_overrides: {},
  modifications: [],
  volume_horaire_national: {},
  sae: JSON.parse(JSON.stringify(_SAE_DEFAULT)),
};

let _pendingMods = [];

function _logMod(type, description, prev, next) {
  if (!AUTH.canWrite()) return;
  const now = new Date();
  _pendingMods.push({
    date: now.toLocaleDateString("fr-FR"),
    heure: now.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
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
      await saveFileGH(
        "modifications.json",
        APP_DATA.modifications,
        "Update modifications.json via Web UI",
      );
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

const _PRINTABLE_VIEWS = new Set(["semestre","maquette_semestre","services","pilotage"]);

/* Priorité de tri des ressources (module-level, réutilisée dans export et maquette) */
function _resPrio(r) {
  const l = r.toLowerCase();
  if (l.includes("hackathon")) return 4;
  if (l.includes("marathon"))  return 3;
  if (l.includes("portfolio")) return 2;
  if (l.includes("saé"))       return 1;
  return 0;
}

function _injectPrintBar(root) {
  const bar = document.createElement("div");
  bar.className = "print-bar";
  bar.innerHTML = `
    <button class="btn-print-action" onclick="window.print()">🖨 Imprimer</button>
    <button class="btn-pdf-action"   onclick="exportXLSX()">⬇ Exporter XLSX</button>`;
  const pageHeader = root.querySelector(".page-header");
  if (pageHeader) pageHeader.appendChild(bar);
  else root.insertBefore(bar, root.firstChild);
}

window.exportXLSX = function () {
  if (typeof XLSX === "undefined") { alert("Bibliothèque XLSX non chargée."); return; }
  const sem = currentParam || "";
  const safeSem = sem.replace(/\s+/g, "_");
  let rows, filename, sheetName;

  if (currentView === "semestre") {
    const aff = APP_DATA.affectations[sem] || {};
    rows = [["Ressource", "Enseignant", "CM", "TD", "TP"]];
    Object.keys(aff).forEach((res) => {
      const d = aff[res];
      rows.push([res, d.enseignant || "", parseFloat(d.cm) || 0, parseFloat(d.td) || 0, parseFloat(d.tp) || 0]);
      (d.subrows || []).forEach((s) => {
        rows.push(["", s.enseignant || "", parseFloat(s.cm) || 0, parseFloat(s.td) || 0, parseFloat(s.tp) || 0]);
      });
    });
    filename = `repartition_${safeSem}.xlsx`;
    sheetName = sem || "Répartition";

  } else if (currentView === "maquette_semestre") {
    const aff = APP_DATA.affectations[sem] || {};
    const maq = APP_DATA.maquette_overrides[sem] || {};
    const vhn = APP_DATA.volume_horaire_national[sem] || {};
    const sorted = Object.keys(aff).sort((a, b) => {
      const d = _resPrio(a) - _resPrio(b);
      return d !== 0 ? d : a.localeCompare(b, "fr");
    });
    rows = [["Ressource", "CM final", "TD final", "TP final", "Vol horaire PN", "Dont TP PN", "Adapt locale", "Dont TP AL"]];
    sorted.forEach((res) => {
      const m = maq[res] || {};
      const v = vhn[res] || {};
      rows.push([
        res,
        parseFloat(m.cm_final) || 0, parseFloat(m.td_final) || 0, parseFloat(m.tp_final) || 0,
        v.vol_hn || 0, v.dont_tp_hn || 0,
        parseFloat(v.adapt_locale) || 0, parseFloat(v.dont_tp_al) || 0,
      ]);
    });
    filename = `maquette_${safeSem}.xlsx`;
    sheetName = sem || "Maquette";

  } else if (currentView === "sae") {
    const sem     = _saeSemFilter;
    const safeSem = sem.replace(/\s+/g, "_");
    const list    = (APP_DATA.sae.sae[sem] || []);
    rows = [["SAÉ", "Intitulé", "Compétence ciblée", "Ressources nécessaires", "Responsable"]];
    list.forEach((s) => {
      rows.push([
        s.code,
        s.intitule,
        s.competence,
        (s.ressources || []).join(", "),
        s.responsable || "",
      ]);
    });
    filename  = `sae_${safeSem}.xlsx`;
    sheetName = `SAÉ ${sem}`.substring(0, 31);

  } else {
    return;
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
  XLSX.writeFile(wb, filename);
};

/* ── Tooltip Total / étudiant ────────────────────────────────────────────── */
function _ensureTooltip() {
  let tt = document.getElementById("res-tooltip");
  if (!tt) {
    tt = document.createElement("div");
    tt.id = "res-tooltip";
    tt.style.cssText = "display:none;position:fixed;z-index:9999;background:#fff;" +
      "border:1px solid #d1d5db;border-radius:8px;padding:0.65rem 0.9rem;" +
      "box-shadow:0 4px 16px rgba(0,0,0,.15);font-size:12px;pointer-events:none;" +
      "min-width:220px;line-height:1.8;";
    document.body.appendChild(tt);
  }
  return tt;
}

function _posTooltip(e, tt) {
  const m = 14;
  let l = e.clientX + m, t = e.clientY + m;
  if (l + tt.offsetWidth  > window.innerWidth)  l = e.clientX - tt.offsetWidth  - m;
  if (t + tt.offsetHeight > window.innerHeight) t = e.clientY - tt.offsetHeight - m;
  tt.style.left = l + "px";
  tt.style.top  = t + "px";
}

document.addEventListener("mouseover", function (e) {
  const badge = e.target.closest(".res-total-badge");
  if (!badge) return;

  const field  = badge.dataset.field;
  const val    = parseFloat(badge.dataset.val)    || 0;
  const maqCM  = parseFloat(badge.dataset.maqCm)  || 0;
  const maqTD  = parseFloat(badge.dataset.maqTd)  || 0;
  const maqTP  = parseFloat(badge.dataset.maqTp)  || 0;
  const maqVal = field === "cm" ? maqCM : field === "td" ? maqTD : maqTP;

  const ecart = val - maqVal;
  let ecartColor;
  if (ecart < 0) {
    ecartColor = "#dc2626";
  } else if (maqVal === 0 ? ecart === 0 : ecart / maqVal <= 0.1) {
    ecartColor = "#16a34a";
  } else {
    ecartColor = "#ea580c";
  }

  const fmt  = (n) => (n % 1 === 0 ? String(n) : n.toFixed(1));
  const sign = ecart >= 0 ? "+" : "";
  const lbl  = field.toUpperCase();

  const tt = _ensureTooltip();
  tt.innerHTML =
    `<div><strong>Total&nbsp;/&nbsp;étudiant&nbsp;:</strong> ${lbl}&nbsp;=&nbsp;${fmt(val)}</div>` +
    `<div><strong>Maquette&nbsp;:</strong> CM&nbsp;${fmt(maqCM)}&nbsp;|&nbsp;TD&nbsp;${fmt(maqTD)}&nbsp;|&nbsp;TP&nbsp;${fmt(maqTP)}</div>` +
    `<div><strong>Écart&nbsp;:</strong> <span style="color:${ecartColor};font-weight:700;">${sign}${fmt(ecart)}</span></div>`;
  tt.style.display = "block";
  _posTooltip(e, tt);
});

document.addEventListener("mousemove", function (e) {
  const tt = document.getElementById("res-tooltip");
  if (tt && tt.style.display !== "none") _posTooltip(e, tt);
});

document.addEventListener("mouseout", function (e) {
  if (!e.target.closest(".res-total-badge")) return;
  if (e.relatedTarget && e.target.contains(e.relatedTarget)) return;
  const tt = document.getElementById("res-tooltip");
  if (tt) tt.style.display = "none";
});

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
      document
        .querySelector("header")
        .insertAdjacentElement("afterend", banner);
    }
    const versionLabel =
      ARCHIVE_VERSION === "realisee" ? "Version réalisée" : "Version planifiée";
    const btnLabel =
      ARCHIVE_VERSION === "realisee"
        ? "Voir la version planifiée"
        : "Voir la version réalisée";
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
  } else if (currentView === "pilotage") {
    const np = document.getElementById("nav-pilotage");
    if (np) np.classList.add("active");
  } else if (currentView === "sae") {
    const ns = document.getElementById("nav-sae");
    if (ns) ns.classList.add("active");
  } else if (currentView === "souhaits") {
    const ns = document.getElementById("nav-souhaits");
    if (ns) ns.classList.add("active");
  }

  if (currentView === "home") renderHome(root);
  else if (currentView === "semestre") renderSemestre(root, currentParam);
  else if (currentView === "maquette_index") renderMaquetteIndex(root);
  else if (currentView === "maquette_semestre")
    renderMaquetteSemestre(root, currentParam);
  else if (currentView === "services") renderServices(root);
  else if (currentView === "enseignants") renderEnseignants(root);
  else if (currentView === "modifications") renderModifications(root);
  else if (currentView === "pilotage") renderPilotage(root);
  else if (currentView === "sae") renderSae(root);
  else if (currentView === "souhaits") renderSouhaits(root);

  if (_PRINTABLE_VIEWS.has(currentView)) _injectPrintBar(root);

  AUTH.applyPermissions();
  if (ARCHIVE_MODE) document.body.classList.add("auth-readonly");
}

/* ── Vues : Accueil & Semestres ─────────────────────────────────────────── */
function renderHome(root) {
  let html = `<div class="page-header"><h1>Répartition</h1><p class="subtitle">Sélectionnez un semestre pour saisir la répartition</p></div>`;
  html += `<div class="semestre-nav-buttons">`;
  SEMESTRES.forEach((sem) => {
    html += `<button class="sem-btn" data-sem="${sem}" onclick="navigate('semestre', '${sem}')">${sem}</button>`;
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
    <div class="table-wrapper table-wrapper--semestre"><table class="ressources-table">
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

  /* Tri des ressources : Hackathon/Marathon en avant-dernier, Portfolio en dernier */
  const _rowPrio = (r) => {
    const l = r.toLowerCase();
    if (l.includes("portfolio"))  return 2;
    if (l.includes("hackathon") || l.includes("marathon")) return 1;
    return 0;
  };
  const _affKeys = Object.keys(aff).sort((a, b) => _rowPrio(a) - _rowPrio(b));

  // Calcul des totaux
  let totPrevCM = 0,
    totPrevTD = 0,
    totPrevTP = 0;
  let totCM = 0,
    totTD = 0,
    totTP = 0;
  _affKeys.forEach((res) => {
    const data = aff[res];
    const prev = maq[res] || {};
    totPrevCM += parseFloat(prev.cm_final) || 0;
    totPrevTD += parseFloat(prev.td_final) || 0;
    totPrevTP += parseFloat(prev.tp_final) || 0;
    const entries = [{ cm: data.cm, td: data.td, tp: data.tp }];
    if (data.subrows)
      data.subrows.forEach((s) =>
        entries.push({ cm: s.cm, td: s.td, tp: s.tp }),
      );
    entries.forEach((e) => {
      totCM += parseFloat(e.cm) || 0;
      totTD += parseFloat(e.td) || 0;
      totTP += parseFloat(e.tp) || 0;
    });
  });

  _affKeys.forEach((res, i) => {
    const data = aff[res];
    const prev = maq[res] || {};
    const resLc = res.toLowerCase();
    const isSae = resLc.includes("saé");
    const isPort = resLc.includes("portfolio");
    const isHackMarathon = resLc.includes("hackathon") || resLc.includes("marathon");
    const rowClass = isHackMarathon
      ? "row-hackathon"
      : isSae
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

    /* Totaux CM/TD/TP de la ressource (ligne principale + sous-groupes) */
    let resCM = parseFloat(data.cm) || 0;
    let resTD = parseFloat(data.td) || 0;
    let resTP = parseFloat(data.tp) || 0;
    if (data.subrows) data.subrows.forEach((s) => {
      resCM += parseFloat(s.cm) || 0;
      resTD += parseFloat(s.td) || 0;
      resTP += parseFloat(s.tp) || 0;
    });
    const fmtR = (n) => (n % 1 === 0 ? n : n.toFixed(1).replace(/\.0$/, ""));

    const _ecartStyle = (v, m) => {
      const e = v - m;
      if (e < 0) return "color:#dc2626;font-weight:700;";
      return (m === 0 ? e === 0 : e / m <= 0.1) ? "color:#16a34a;" : "color:#ea580c;";
    };
    const cmStyle = _ecartStyle(resCM, parseFloat(prev.cm_final) || 0);
    const tdStyle = _ecartStyle(resTD, parseFloat(prev.td_final) || 0);
    const tpStyle = _ecartStyle(resTP, parseFloat(prev.tp_final) || 0);

    /* Pour les SAÉ : responsable lu depuis la section SAÉ (non éditable ici) */
    const _saeList  = (APP_DATA.sae && APP_DATA.sae.sae[sem]) || [];
    const _saeEntry = _saeList.find((s) => s.code === res);
    const _saeResp  = _saeEntry ? (_saeEntry.responsable || "") : null;

    const respCell = (isSae && _saeEntry !== undefined)
      ? `<td colspan="2" class="responsable-label">Responsable SAÉ :
            <span style="display:inline-block;padding:3px 10px;background:#f0f4fb;border:1px solid #c7d2e8;border-radius:5px;font-size:13px;color:${_saeResp ? "#1e3a5f" : "#9ca3af"};">
              ${_saeResp || "Non assigné — voir section SAÉ"}
            </span>
         </td>`
      : `<td colspan="2" class="responsable-label">Responsable :
            <select class="select-enseignant ${respSelClass}" onchange="updateAff('${sem}', '${res.replace(/'/g, "\\'")}', 'responsable', this.value)">
                <option value="">-</option>
                ${enseignants
                  .filter((e) => !e.is_vac)
                  .map((e) => `<option value="${e.id}" class="ens-option" ${e.id === data.responsable ? "selected" : ""}>${e.id}</option>`)
                  .join("")}
            </select>
         </td>`;

    html += `<tr class="row-responsable ${rowClass}">
            ${respCell}
            <td class="responsable-label" style="text-align:right;">Total / étudiant :</td>
            <td style="text-align:center;"><span class="prev-badge res-total-badge" style="${cmStyle}" data-field="cm" data-val="${resCM}" data-maq-cm="${prev.cm_final||0}" data-maq-td="${prev.td_final||0}" data-maq-tp="${prev.tp_final||0}">${fmtR(resCM)}</span></td>
            <td style="text-align:center;"><span class="prev-badge res-total-badge" style="${tdStyle}" data-field="td" data-val="${resTD}" data-maq-cm="${prev.cm_final||0}" data-maq-td="${prev.td_final||0}" data-maq-tp="${prev.tp_final||0}">${fmtR(resTD)}</span></td>
            <td style="text-align:center;"><span class="prev-badge res-total-badge" style="${tpStyle}" data-field="tp" data-val="${resTP}" data-maq-cm="${prev.cm_final||0}" data-maq-td="${prev.td_final||0}" data-maq-tp="${prev.tp_final||0}">${fmtR(resTP)}</span></td>
            <td></td>
        </tr>`;
  });

  const fmtT = (n) => (n % 1 === 0 ? n : n.toFixed(1).replace(/\.0$/, ""));
  html += `<tr class="row-total-pose">
        <td><strong>Total posé</strong></td>
        <td><span class="prev-badge">CM: ${fmtT(totPrevCM)} | TD: ${fmtT(totPrevTD)} | TP: ${fmtT(totPrevTP)}</span></td>
        <td></td>
        <td class="total-pose-val">${fmtT(totCM)}</td>
        <td class="total-pose-val">${fmtT(totTD)}</td>
        <td class="total-pose-val">${fmtT(totTP)}</td>
        <td></td>
    </tr>`;

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
  _logMod(
    "Répartition",
    `${sem} / ${res} / sous-groupe ${idx + 1} / ${field}`,
    prev,
    value,
  );
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
  html += `<div class="semestre-nav-buttons">`;
  SEMESTRES.forEach((sem) => {
    html += `<button class="sem-btn" data-sem="${sem}" onclick="navigate('maquette_semestre', '${sem}')">${sem}</button>`;
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
    <div class="table-wrapper table-wrapper--semestre"><table class="ressources-table maquette-table">
    <thead>
        <tr>
            <th rowspan="2" class="col-intitule">Ressource</th>
            <th colspan="3" class="group-header editable-header">Volumes Maquette</th>
            <th colspan="4" class="group-header pn-header">PN + Adaptation locale</th>
            <th colspan="3" class="group-header reel-header">Réel planifié</th>
            <th rowspan="2" class="pct-header">% réalisation<br>/ PN</th>
            <th rowspan="2" style="width:38px;"></th>
        </tr>
        <tr>
            <th class="editable-col">CM final</th>
            <th class="editable-col">TD final</th>
            <th class="editable-col">TP final</th>
            <th class="pn-readonly-col">Vol horaire PN<br>(CM+TD+TP)</th>
            <th class="pn-readonly-col">Dont TP</th>
            <th class="pn-editable-col">Adapt locale</th>
            <th class="pn-editable-col">Dont TP</th>
            <th class="reel-col">CM</th>
            <th class="reel-col">TD</th>
            <th class="reel-col">TP</th>
        </tr>
    </thead>
    <tbody>`;

  const sortedRes = Object.keys(aff).sort((a, b) => {
    const d = _resPrio(a) - _resPrio(b);
    return d !== 0 ? d : a.localeCompare(b, "fr");
  });

  const fmtR = (n) => (n % 1 === 0 ? n : n.toFixed(1).replace(/\.0$/, ""));
  let totCMf = 0, totTDf = 0, totTPf = 0;
  let totVolHN = 0, totDontTpHN = 0, totAL = 0, totDontTpAL = 0;
  let totRCM = 0, totRTD = 0, totRTP = 0;

  sortedRes.forEach((res, i) => {
    const m = maq[res] || { cm_final: 0, td_final: 0, tp_final: 0 };
    const v = vhn[res] || {
      vol_hn: 0,
      dont_tp_hn: 0,
      adapt_locale: 0,
      dont_tp_al: 0,
    };
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
    /* Réel planifié : somme des heures saisies dans la répartition */
    const affRes = aff[res] || {};
    let rCM = parseFloat(affRes.cm) || 0;
    let rTD = parseFloat(affRes.td) || 0;
    let rTP = parseFloat(affRes.tp) || 0;
    if (affRes.subrows) affRes.subrows.forEach((s) => {
      rCM += parseFloat(s.cm) || 0;
      rTD += parseFloat(s.td) || 0;
      rTP += parseFloat(s.tp) || 0;
    });

    totCMf += m.cm_final || 0; totTDf += m.td_final || 0; totTPf += m.tp_final || 0;
    totVolHN += v.vol_hn || 0; totDontTpHN += v.dont_tp_hn || 0;
    totAL += v.adapt_locale || 0; totDontTpAL += v.dont_tp_al || 0;
    totRCM += rCM; totRTD += rTD; totRTP += rTP;

    html += `<tr class="${rowClass} row-main-resource">
            <td>${res}</td>
            <td><input type="number" class="input-editable" value="${m.cm_final}" onchange="updateMaq('${sem}','${resEsc}','cm_final',this.value)"></td>
            <td><input type="number" class="input-editable" value="${m.td_final}" onchange="updateMaq('${sem}','${resEsc}','td_final',this.value)"></td>
            <td><input type="number" class="input-editable" value="${m.tp_final}" onchange="updateMaq('${sem}','${resEsc}','tp_final',this.value)"></td>
            <td class="pn-readonly-val">${v.vol_hn || '-'}</td>
            <td class="pn-readonly-val">${v.dont_tp_hn || '-'}</td>
            <td><input type="number" class="input-pn-editable" value="${v.adapt_locale}" onchange="updateVolHN('${sem}','${resEsc}','adapt_locale',this.value)" step="0.5"></td>
            <td><input type="number" class="input-pn-editable" value="${v.dont_tp_al}" onchange="updateVolHN('${sem}','${resEsc}','dont_tp_al',this.value)" step="0.5"></td>
            <td class="reel-val">${fmtR(rCM)}</td>
            <td class="reel-val">${fmtR(rTD)}</td>
            <td class="reel-val">${fmtR(rTP)}</td>
            <td class="pct-cell">${pctHtml}</td>
            <td style="text-align:center;"><button class="btn-remove-subrow" onclick="deleteRessourceMaq('${sem}','${resEsc}')" title="Supprimer cette ressource">🗑</button></td>
        </tr>`;
  });

  const totMaqGlobal = totCMf + totTDf + totTPf;
  const totPctHtml = totVolHN > 0
    ? `<span class="${totMaqGlobal / totVolHN * 100 < 95 ? "pct-low" : "pct-ok"}">${(totMaqGlobal / totVolHN * 100).toFixed(0)} %</span>`
    : `<span class="pct-na">—</span>`;

  html += `</tbody><tfoot><tr class="row-total-pose">
      <td><strong>Total</strong></td>
      <td><strong>${fmtR(totCMf)}</strong></td>
      <td><strong>${fmtR(totTDf)}</strong></td>
      <td><strong>${fmtR(totTPf)}</strong></td>
      <td><strong>${fmtR(totVolHN) || '-'}</strong></td>
      <td><strong>${fmtR(totDontTpHN) || '-'}</strong></td>
      <td><strong>${fmtR(totAL)}</strong></td>
      <td><strong>${fmtR(totDontTpAL)}</strong></td>
      <td><strong>${fmtR(totRCM)}</strong></td>
      <td><strong>${fmtR(totRTD)}</strong></td>
      <td><strong>${fmtR(totRTP)}</strong></td>
      <td>${totPctHtml}</td>
      <td></td>
  </tr></tfoot></table></div>
    <div class="form-actions" style="gap:0.75rem;">
        <button class="btn-add-res" onclick="openRenameRessourcesModal('${sem}')">✏️ Modif ressources/SAÉ</button>
        <button class="btn-add-res" onclick="openAddRessourceModal('${sem}')">➕ Ajout de ressource ou de SAÉ / Adaptation locale</button>
        <button class="btn-save" onclick="saveMaquetteGH()">💾 Enregistrer la maquette sur GitHub</button>
    </div>`;

  root.innerHTML = html;
}

window.openAddRessourceModal = function (sem) {
  let modal = document.getElementById("add-res-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "add-res-modal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-box">
        <h3>Ajout de ressource ou de SAÉ</h3>
        <p class="modal-sub">Adaptation locale — Semestre <strong id="add-res-sem-lbl"></strong></p>

        <div class="modal-fields">
          <label class="modal-field-label">
            Intitulé
            <span class="modal-hint">Commencez par "SAÉ" pour une SAÉ, sinon la ressource sera traitée comme une ressource standard</span>
            <input id="add-res-name" type="text" class="input-editable" placeholder="Ex : SAÉ 3.01 — … ou R3.01 …" style="width:100%;margin-top:4px;">
          </label>

          <div class="modal-group-header">Volumes Maquette</div>
          <div class="modal-row3">
            <label class="modal-field-label">CM final<input id="add-res-cm" type="number" class="input-editable" value="0" min="0" step="0.5"></label>
            <label class="modal-field-label">TD final<input id="add-res-td" type="number" class="input-editable" value="0" min="0" step="0.5"></label>
            <label class="modal-field-label">TP final<input id="add-res-tp" type="number" class="input-editable" value="0" min="0" step="0.5"></label>
          </div>

          <div class="modal-group-header">PN + Adaptation locale <span class="modal-hint">(optionnel)</span></div>
          <div class="modal-row4">
            <label class="modal-field-label">Vol horaire PN<input id="add-res-vhn" type="number" class="input-editable" value="0" min="0" step="0.5"></label>
            <label class="modal-field-label">Dont TP PN<input id="add-res-dtp" type="number" class="input-editable" value="0" min="0" step="0.5"></label>
            <label class="modal-field-label">Adapt locale<input id="add-res-al"  type="number" class="input-editable" value="0" min="0" step="0.5"></label>
            <label class="modal-field-label">Dont TP AL<input id="add-res-dal" type="number" class="input-editable" value="0" min="0" step="0.5"></label>
          </div>

          <p id="add-res-err" class="modal-err" style="display:none;"></p>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" onclick="closeAddRessourceModal()">Annuler</button>
          <button class="btn-save"   onclick="confirmAddRessource()">Ajouter</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeAddRessourceModal(); });
  }
  modal.dataset.sem = sem;
  document.getElementById("add-res-sem-lbl").textContent = sem;
  ["add-res-name"].forEach((id) => (document.getElementById(id).value = ""));
  ["add-res-cm","add-res-td","add-res-tp","add-res-vhn","add-res-dtp","add-res-al","add-res-dal"]
    .forEach((id) => (document.getElementById(id).value = "0"));
  document.getElementById("add-res-err").style.display = "none";
  modal.style.display = "flex";
  document.getElementById("add-res-name").focus();
};

window.closeAddRessourceModal = function () {
  const modal = document.getElementById("add-res-modal");
  if (modal) modal.style.display = "none";
};

window.confirmAddRessource = function () {
  const modal = document.getElementById("add-res-modal");
  const sem   = modal.dataset.sem;
  const name  = document.getElementById("add-res-name").value.trim();
  const err   = document.getElementById("add-res-err");

  if (!name) {
    err.textContent = "L'intitulé est obligatoire.";
    err.style.display = "block";
    return;
  }
  if (APP_DATA.affectations[sem]?.[name]) {
    err.textContent = `La ressource "${name}" existe déjà dans ce semestre.`;
    err.style.display = "block";
    return;
  }

  if (!APP_DATA.affectations[sem])            APP_DATA.affectations[sem]            = {};
  if (!APP_DATA.maquette_overrides[sem])       APP_DATA.maquette_overrides[sem]       = {};
  if (!APP_DATA.volume_horaire_national[sem])  APP_DATA.volume_horaire_national[sem]  = {};

  APP_DATA.affectations[sem][name] = { enseignant: "", cm: 0, td: 0, tp: 0, responsable: "", subrows: [] };

  APP_DATA.maquette_overrides[sem][name] = {
    cm_final: parseFloat(document.getElementById("add-res-cm").value) || 0,
    td_final: parseFloat(document.getElementById("add-res-td").value) || 0,
    tp_final: parseFloat(document.getElementById("add-res-tp").value) || 0,
  };

  APP_DATA.volume_horaire_national[sem][name] = {
    vol_hn:       parseFloat(document.getElementById("add-res-vhn").value) || 0,
    dont_tp_hn:   parseFloat(document.getElementById("add-res-dtp").value) || 0,
    adapt_locale: parseFloat(document.getElementById("add-res-al").value)  || 0,
    dont_tp_al:   parseFloat(document.getElementById("add-res-dal").value) || 0,
  };

  _logMod("Maquette", `Ajout ressource — ${sem}`, "—", name);
  closeAddRessourceModal();
  renderView();
};

/* ── Renommage de ressources / SAÉ ─────────────────────────────────────── */
window.openRenameRessourcesModal = function (sem) {
  let modal = document.getElementById("rename-res-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "rename-res-modal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-box" style="max-width:640px; max-height:80vh; display:flex; flex-direction:column;">
        <h3>Modifier les intitulés des ressources</h3>
        <p class="modal-sub">Semestre <strong id="rename-res-sem-lbl"></strong></p>
        <div id="rename-res-list" style="overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:6px; margin:0.75rem 0;"></div>
        <p id="rename-res-err" class="modal-err" style="display:none;"></p>
        <div class="modal-actions">
          <button class="btn-cancel" onclick="closeRenameRessourcesModal()">Annuler</button>
          <button class="btn-save"   onclick="confirmRenameRessources()">Enregistrer</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeRenameRessourcesModal(); });
  }

  modal.dataset.sem = sem;
  document.getElementById("rename-res-sem-lbl").textContent = sem;

  const aff = APP_DATA.affectations[sem] || {};
  const sorted = Object.keys(aff).sort((a, b) => {
    const d = _resPrio(a) - _resPrio(b);
    return d !== 0 ? d : a.localeCompare(b, "fr");
  });

  const list = document.getElementById("rename-res-list");
  list.innerHTML = "";
  sorted.forEach((res) => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex; align-items:center; gap:8px;";
    const input = document.createElement("input");
    input.type = "text";
    input.className = "rename-input input-editable";
    input.dataset.old = res;
    input.value = res;
    input.style.cssText = "flex:1; width:100%;";
    input.autocomplete = "off";
    row.appendChild(input);
    list.appendChild(row);
  });

  document.getElementById("rename-res-err").style.display = "none";
  modal.style.display = "flex";
};

window.closeRenameRessourcesModal = function () {
  const modal = document.getElementById("rename-res-modal");
  if (modal) modal.style.display = "none";
};

window.confirmRenameRessources = function () {
  const modal = document.getElementById("rename-res-modal");
  const sem = modal.dataset.sem;
  const err = document.getElementById("rename-res-err");
  err.style.display = "none";

  const inputs = [...modal.querySelectorAll(".rename-input")];
  const nameMap = inputs.map((i) => ({ old: i.dataset.old, new: i.value.trim() }));

  for (const m of nameMap) {
    if (!m.new) {
      err.textContent = "Un intitulé ne peut pas être vide.";
      err.style.display = "block"; return;
    }
  }
  if (new Set(nameMap.map((m) => m.new)).size < nameMap.length) {
    err.textContent = "Deux ressources ne peuvent pas avoir le même intitulé.";
    err.style.display = "block"; return;
  }

  const unchangedNames = new Set(nameMap.filter((m) => m.old === m.new).map((m) => m.new));
  const renames = nameMap.filter((m) => m.old !== m.new);
  for (const r of renames) {
    if (unchangedNames.has(r.new)) {
      err.textContent = `"${r.new}" est déjà utilisé par une autre ressource.`;
      err.style.display = "block"; return;
    }
  }

  if (renames.length === 0) { closeRenameRessourcesModal(); return; }

  const affSem = APP_DATA.affectations[sem]           || {};
  const maqSem = APP_DATA.maquette_overrides[sem]      || {};
  const vhnSem = APP_DATA.volume_horaire_national[sem] || {};

  /* Sauvegarde des données avant suppression (évite les conflits entre renames) */
  const saved = renames.map((r) => ({
    old: r.old, new: r.new,
    aff: affSem[r.old], maq: maqSem[r.old], vhn: vhnSem[r.old],
  }));
  saved.forEach((r) => { delete affSem[r.old]; delete maqSem[r.old]; delete vhnSem[r.old]; });
  saved.forEach((r) => {
    if (r.aff !== undefined) affSem[r.new] = r.aff;
    if (r.maq !== undefined) maqSem[r.new] = r.maq;
    if (r.vhn !== undefined) vhnSem[r.new] = r.vhn;
    _logMod("Maquette", `Renommage — ${sem}`, r.old, r.new);
  });

  closeRenameRessourcesModal();
  renderView();
};

window.deleteRessourceMaq = function (sem, res) {
  if (!confirm(`Supprimer "${res}" du semestre ${sem} ?\nToutes les affectations associées seront également supprimées.`)) return;
  delete (APP_DATA.affectations[sem] || {})[res];
  delete (APP_DATA.maquette_overrides[sem] || {})[res];
  delete (APP_DATA.volume_horaire_national[sem] || {})[res];
  _logMod("Maquette", `Suppression ressource — ${sem}`, res, "—");
  renderView();
};

window.updateMaq = function (sem, res, field, value) {
  if (!APP_DATA.maquette_overrides[sem]) APP_DATA.maquette_overrides[sem] = {};
  if (!APP_DATA.maquette_overrides[sem][res])
    APP_DATA.maquette_overrides[sem][res] = {
      cm_final: 0,
      td_final: 0,
      tp_final: 0,
    };
  const prev = APP_DATA.maquette_overrides[sem][res][field] ?? 0;
  const newVal = parseFloat(value) || 0;
  _logMod("Maquette", `${sem} / ${res} / ${field}`, prev, newVal);
  APP_DATA.maquette_overrides[sem][res][field] = newVal;
};

window.updateVolHN = function (sem, res, field, value) {
  if (!APP_DATA.volume_horaire_national[sem])
    APP_DATA.volume_horaire_national[sem] = {};
  if (!APP_DATA.volume_horaire_national[sem][res])
    APP_DATA.volume_horaire_national[sem][res] = {
      vol_hn: 0,
      dont_tp_hn: 0,
      adapt_locale: 0,
      dont_tp_al: 0,
    };
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
        if (["S1", "S2", "S3"].includes(sem)) {
          total = cm * 1.5 + td * 2 + tp * 4;
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
      const diff = sumTotal - sDu;
      const diffClass = diff === 0 ? "diff-ok" : diff > 0 ? "diff-surplus" : "diff-manque";
      const diffText = diff > 0 ? `+${diff}` : diff;
      badgeHtml = `<span class="service-du-badge">Dû : ${sDu}</span> ` +
                  `<span class="service-eqtd-badge">Réalisé : ${sumTotal}</span> ` +
                  `<span class="service-diff-badge ${diffClass}">${diffText}</span>`;
    } else if (isVac && sMax > 0) {
      badgeHtml = `<span class="service-max-badge">Max : ${sMax}</span> ` +
                  `<span class="service-eqtd-badge">Réalisé : ${sumTotal}</span>`;
    } else {
      badgeHtml = `<span class="service-eqtd-badge">Réalisé : ${sumTotal}</span>`;
    }

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
  const wHours = {}; // cm/td/tp pondérés par semestre pour colonnes CM/TD/TP
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
          total = cm * 1.5 + td * 2 + tp * 4;
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
    <div style="display:flex; gap:8px; align-items:center;">
      <button class="btn-save" style="margin:0" onclick="openAddEnsModal()">➕ Ajouter un enseignant</button>
      <button class="btn-toggle-all" onclick="toggleSortEnseignants()">
          ⇅ Trier : ${enseignantsSortMode === "alpha" ? "Titulaires puis Vacataires" : "Alphabétique"}
      </button>
    </div>
  </div>`;
  html += `<div class="table-wrapper"><table class="ressources-table">
    <thead><tr><th>Nom complet</th><th>Statut</th><th>Service Dû</th><th>Service Max</th><th>Total Réalisé</th><th>Différence</th><th class="col-h">CM</th><th class="col-h">TD</th><th class="col-h">TP</th><th>Eq TD</th><th style="width:80px; text-align:center;">Actions</th></tr></thead><tbody>`;

  APP_DATA.enseignants.forEach((e, i) => {
    const totalRealise = totals[e.id] || 0;

    let diffHtml = "<span style='color:#9ca3af'>-</span>";
    if (!e.is_vac && e.service_du != null) {
      const diff = totalRealise - e.service_du;
      const sign = diff > 0 ? "+" : "";
      const style =
        diff === 0
          ? "color:#16a34a;font-weight:700;"
          : diff < 0
            ? "color:#dc2626;font-weight:700;"
            : "font-weight:600;";
      diffHtml = `<span style="${style}">${sign}${diff}</span>`;
    } else if (e.is_vac && e.service_max != null) {
      const diff = totalRealise - e.service_max;
      const sign = diff > 0 ? "+" : "";
      const style =
        diff === 0
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
            <td style="text-align:center;">${!e.is_vac ? w.cm || "-" : "<span style='color:#9ca3af'>-</span>"}</td>
            <td style="text-align:center;">${!e.is_vac ? w.td || "-" : "<span style='color:#9ca3af'>-</span>"}</td>
            <td style="text-align:center;">${!e.is_vac ? w.tp || "-" : "<span style='color:#9ca3af'>-</span>"}</td>
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
  let heuresPermanents = 0,
    heuresCEV = 0,
    heuresVacSimples = 0;
  Object.keys(totals).forEach((id) => {
    const e = ensMapStat[id];
    if (!e) return;
    if (!e.is_vac) heuresPermanents += totals[id];
    else if (e.is_cev) heuresCEV += totals[id];
    else heuresVacSimples += totals[id];
  });
  const grandTotal = heuresPermanents + heuresCEV + heuresVacSimples;
  const pctVac = grandTotal > 0 ? (heuresVacSimples / grandTotal) * 100 : 0;
  const pctColor = pctVac < 25 ? "#dc2626" : "#16a34a";
  const pctBg = pctVac < 25 ? "#fef2f2" : "#f0fdf4";
  const pctBorder = pctVac < 25 ? "#fecaca" : "#bbf7d0";

  html += `<div style="display:flex; justify-content:center; margin-top:2rem">
    <div class="form-card" style="max-width:280px; background:${pctBg}; border-color:${pctBorder}">
        <h3 style="margin-bottom:1.25rem; color:#1e3a5f">Pourcentage de vacataires</h3>
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

window.openAddEnsModal = function () {
  let modal = document.getElementById("add-ens-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "add-ens-modal";
    modal.className = "gh-modal-overlay";
    document.body.appendChild(modal);
    modal.addEventListener("click", (evt) => {
      if (evt.target === modal) closeAddEnsModal();
    });
  }

  modal.innerHTML = `
    <div class="form-card" style="margin:10% auto; position:relative; max-width:400px">
        <h3 style="margin-bottom:1rem; color:#1e3a5f">Ajouter un enseignant</h3>
        <div class="form-group"><label>Nom</label><input type="text" id="new_ens_nom" class="form-input" placeholder="NOM" autocomplete="off"></div>
        <div class="form-group"><label>Prénom</label><input type="text" id="new_ens_prenom" class="form-input" placeholder="Prénom" autocomplete="off"></div>
        <div class="form-group form-group-check"><label><input type="checkbox" id="new_ens_vac" onchange="document.getElementById('new_cev_group').style.display = this.checked ? 'block' : 'none'; if (!this.checked) document.getElementById('new_ens_cev').checked = false;"> Est vacataire</label></div>
        <div class="form-group form-group-check" id="new_cev_group" style="display:none; padding-left:1.5rem"><label><input type="checkbox" id="new_ens_cev"> Chargé d'enseignement vacataire (CEV)</label></div>
        <div class="form-group"><label>Service dû (Titulaires)</label><input type="number" id="new_ens_du" class="form-input" autocomplete="off"></div>
        <div class="form-group"><label>Service max (Vacataires)</label><input type="number" id="new_ens_max" class="form-input" autocomplete="off"></div>
        <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1.5rem;">
            <button class="btn-cancel" onclick="closeAddEnsModal()">Annuler</button>
            <button class="btn-save" onclick="addEns()">Ajouter</button>
        </div>
    </div>`;
  modal.style.display = "block";
};

window.closeAddEnsModal = function () {
  const modal = document.getElementById("add-ens-modal");
  if (modal) modal.style.display = "none";
};

window.addEns = async function () {
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

  APP_DATA.enseignants.push({
    id,
    nom,
    prenom,
    is_vac,
    ...(is_vac ? { is_cev } : {}),
    service_du: du,
    service_max: max,
  });
  _logMod("Enseignants", "Ajout", "—", id);
  closeAddEnsModal();
  renderView();
  showToast(`Enseignant "${id}" ajouté.`);
  if (isGHConfigured()) await saveEnseignantsGH();
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
            <input type="number" id="edit_ens_du" class="form-input" value="${e.service_du || ""}" autocomplete="off">
        </div>
        <div class="form-group">
            <label>Service max (Vacataires)</label>
            <input type="number" id="edit_ens_max" class="form-input" value="${e.service_max || ""}" autocomplete="off">
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

  /* Lecture du SHA courant — _t= contourne le CDN GitHub (cache serveur) */
  async function _getSha() {
    try {
      const r = await fetch(`${url}?ref=${GH_BRANCH}&_t=${Date.now()}`, {
        cache: "no-cache",
        headers: {
          Authorization: `token ${cfg.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      if (r.ok) return (await r.json()).sha;
    } catch {}
    return null;
  }

  /* Envoi du PUT avec le SHA fourni */
  async function _put(sha) {
    const body = { message: msg, content, branch: GH_BRANCH };
    if (sha) body.sha = sha;
    return fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${cfg.token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  let sha = await _getSha();
  let r = await _put(sha);

  /* Retry sur conflit SHA — GitHub renvoie 409 ou 422 selon les versions */
  if (r.status === 409 || r.status === 422) {
    let body; try { body = await r.json(); } catch {}
    const isSHAConflict = !body || !body.message || body.message.includes("expected");
    if (isSHAConflict) {
      sha = await _getSha();
      r = await _put(sha);
    }
  }

  if (!r.ok) {
    let errMsg = `Erreur ${r.status}`;
    try {
      const errJson = await r.json();
      if (r.status === 401)
        errMsg =
          "Token GitHub invalide ou expiré — reconfigurez-le via le bouton en bas de page.";
      else errMsg = errJson.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }
}

window.saveAffectationsGH = async function () {
  if (ARCHIVE_MODE)
    return showToast("Archives 2025-2026 — consultation uniquement");
  if (!isGHConfigured()) return alert("Veuillez configurer GitHub d'abord !");
  try {
    await _flushMods();
    await saveFileGH(
      "affectations.json",
      APP_DATA.affectations,
      "Update affectations.json via Web UI",
    );
    showToast("Affectations sauvegardées sur GitHub !");
  } catch (e) {
    alert("Erreur: " + e.message);
  }
};

window.saveEnseignantsGH = async function () {
  if (ARCHIVE_MODE)
    return showToast("Archives 2025-2026 — consultation uniquement");
  if (!isGHConfigured()) return alert("Veuillez configurer GitHub d'abord !");

  try {
    await _flushMods();
    await saveFileGH(
      "enseignants.json",
      APP_DATA.enseignants,
      "Update enseignants.json via Web UI",
    );
    showToast("Enseignants sauvegardés sur GitHub !");
  } catch (e) {
    alert("Erreur: " + e.message);
  }
};

window.saveMaquetteGH = async function () {
  if (ARCHIVE_MODE)
    return showToast("Archives 2025-2026 — consultation uniquement");
  if (!isGHConfigured()) return alert("Veuillez configurer GitHub d'abord !");
  try {
    await _flushMods();
    await saveFileGH(
      "maquette_overrides.json",
      APP_DATA.maquette_overrides,
      "Update maquette_overrides.json via Web UI",
    );
    await saveFileGH(
      "volume_horaire_national.json",
      APP_DATA.volume_horaire_national,
      "Update volume_horaire_national.json via Web UI",
    );
    showToast("Maquette sauvegardée sur GitHub !");
  } catch (e) {
    alert("Erreur: " + e.message);
  }
};

/* ── Vue : SAÉ (chefdep uniquement) ─────────────────────────────────────── */
let _saeSemFilter = "S1";
let _saeShowRecap = false;

function renderSae(root) {
  if (!AUTH.isAdmin()) {
    root.innerHTML = `<div class="page-header"><h1>Accès refusé</h1></div>`;
    return;
  }

  const saeData   = APP_DATA.sae || { semestres: [], sae: {} };
  const semestres = saeData.semestres || [];
  const titulaires = APP_DATA.enseignants.filter((e) => !e.is_vac);

  /* S'assurer que le filtre courant est valide */
  if (!semestres.includes(_saeSemFilter) && semestres.length > 0) {
    _saeSemFilter = semestres[0];
  }

  const semBtns = semestres.map((s) =>
    `<button class="sem-btn ${s === _saeSemFilter && !_saeShowRecap ? "active" : ""}" data-sem="${s}" onclick="setSaeSemFilter('${s}')">${s}</button>`
  ).join("");

  const recapBtn = `<button class="sem-btn ${_saeShowRecap ? "active" : ""}" onclick="setSaeShowRecap(true)">Responsables</button>`;

  const filterBar = `
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:1.25rem;">
      ${semBtns}
      <span style="color:#d1d5db;font-size:18px;margin:0 2px;">|</span>
      ${recapBtn}
    </div>`;

  if (_saeShowRecap) {
    let bodyRows = "";
    let rowIdx = 0;
    semestres.forEach((sem) => {
      const rows = (saeData.sae[sem] || []);
      if (!rows.length) return;
      bodyRows += `<tr>
        <td colspan="3" style="background:#1e3a5f;color:#fff;font-weight:700;font-size:13px;padding:7px 14px;letter-spacing:.03em;border:none;">${sem}</td>
      </tr>`;
      rows.forEach((sae) => {
        const [codeRef, codeName] = sae.code.includes(" | ")
          ? sae.code.split(" | ")
          : [sae.code, sae.intitule || ""];
        const respBadge = sae.responsable
          ? `<span style="display:inline-block;background:#dcfce7;color:#166534;border:1px solid #86efac;border-radius:4px;padding:2px 10px;font-size:12px;font-weight:500;">${sae.responsable}</span>`
          : `<span style="color:#9ca3af;font-size:12px;">—</span>`;
        bodyRows += `<tr class="${rowIdx % 2 === 0 ? "group-even" : "group-odd"}">
          <td style="font-weight:600;white-space:nowrap;color:#1e3a5f;font-size:12px;width:100px;">${codeRef}</td>
          <td style="font-size:13px;">${codeName}</td>
          <td style="width:200px;">${respBadge}</td>
        </tr>`;
        rowIdx++;
      });
    });

    root.innerHTML = `
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <h1 style="margin:0;">Responsables SAÉ</h1>
        <div style="display:flex;gap:8px;align-items:center;">
          <button class="btn-print-action" onclick="window.print()">🖨 Imprimer</button>
          <button class="btn-save" onclick="saveSaeGH()">💾 Enregistrer sur GitHub</button>
        </div>
      </div>
      ${filterBar}
      <div class="table-wrapper">
        <table class="ressources-table">
          <colgroup>
            <col style="width:110px;">
            <col>
            <col style="width:200px;">
          </colgroup>
          <thead>
            <tr>
              <th>Code</th>
              <th>Intitulé</th>
              <th>Responsable SAÉ</th>
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>`;
    return;
  }

  const rows = (saeData.sae[_saeSemFilter] || []);

  const respOptions = `<option value="">— Aucun —</option>` +
    titulaires.map((e) => `<option value="${e.id}">${e.id}</option>`).join("");

  const tableRows = rows.map((sae, i) => {
    const ressBadges = sae.ressources.map((r) =>
      `<span style="display:inline-block;background:#dbeafe;color:#1e3a5f;border:1px solid #93c5fd;border-radius:4px;padding:1px 7px;font-size:11px;margin:2px 2px 2px 0;">${r}</span>`
    ).join("");

    const escSem = _saeSemFilter.replace(/'/g, "\\'");
    const escCode = sae.code.replace(/'/g, "\\'");

    const [codeRef, codeName] = sae.code.includes(" | ")
      ? sae.code.split(" | ")
      : [sae.code, sae.intitule];

    return `<tr class="${i % 2 === 0 ? "group-even" : "group-odd"}">
      <td style="font-weight:600;">
        <span style="color:#1e3a5f;font-size:12px;white-space:nowrap;">${codeRef}</span><br>
        <span style="font-weight:400;font-size:13px;">${codeName || ""}</span>
      </td>
      <td style="font-size:13px;color:#374151;">${sae.competence}</td>
      <td style="line-height:1.8;">${ressBadges}</td>
      <td>
        <select class="select-enseignant" autocomplete="off"
                onchange="updateSaeResponsable('${escSem}','${escCode}',this.value)"
                style="min-width:160px;">
          ${respOptions.replace(
            `value="${sae.responsable}"`,
            `value="${sae.responsable}" selected`
          )}
        </select>
      </td>
    </tr>`;
  }).join("");

  root.innerHTML = `
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
      <h1 style="margin:0;">Responsables SAÉ</h1>
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="btn-print-action" onclick="window.print()">🖨 Imprimer</button>
        <button class="btn-pdf-action" onclick="exportXLSX()">⬇ Exporter XLSX</button>
        <button class="btn-save" onclick="saveSaeGH()">💾 Enregistrer sur GitHub</button>
      </div>
    </div>
    ${filterBar}
    <div class="table-wrapper table-wrapper--semestre">
      <table class="ressources-table">
        <thead>
          <tr>
            <th style="min-width:220px;">SAÉ</th>
            <th>Compétence ciblée</th>
            <th>Ressources nécessaires</th>
            <th style="min-width:180px;">Responsable SAÉ</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>`;
}

window.setSaeSemFilter = function (sem) {
  _saeSemFilter = sem;
  _saeShowRecap = false;
  renderView();
};

window.setSaeShowRecap = function (v) {
  _saeShowRecap = v;
  renderView();
};

window.updateSaeResponsable = function (sem, code, login) {
  const list = (APP_DATA.sae.sae[sem] || []);
  const sae  = list.find((s) => s.code === code);
  if (!sae) return;
  const prev = sae.responsable;
  sae.responsable = login;
  _logMod("SAÉ", `Responsable ${code} (${sem})`, prev || "—", login || "—");
};

window.saveSaeGH = async function () {
  if (ARCHIVE_MODE) return showToast("Archives — consultation uniquement");
  if (!isGHConfigured()) return alert("Veuillez configurer GitHub d'abord !");
  try {
    await _flushMods();
    await saveFileGH("sae_data.json", APP_DATA.sae, "Update sae_data.json via Web UI");
    showToast("SAÉ sauvegardées sur GitHub !");
  } catch (e) {
    alert("Erreur : " + e.message);
  }
};

/* ── Vue : Pilotage (chefdep uniquement) ─────────────────────────────────── */
function renderPilotage(root) {
  if (!AUTH.isAdmin()) {
    root.innerHTML = `<div class="page-header"><h1>Accès refusé</h1></div>`;
    return;
  }

  let totalCM = 0,
    totalTD = 0,
    totalTP = 0;

  const isS123 = (sem) => ["S1", "S2", "S3"].includes(sem);

  const rows = SEMESTRES.map((sem) => {
    let rawCM = 0,
      rawTD = 0,
      rawTP = 0;
    const sem_data = APP_DATA.affectations[sem] || {};
    Object.keys(sem_data).forEach((res) => {
      const data = sem_data[res];
      const entries = [{ cm: data.cm, td: data.td, tp: data.tp }];
      if (data.subrows)
        data.subrows.forEach((sub) =>
          entries.push({ cm: sub.cm, td: sub.td, tp: sub.tp }),
        );
      entries.forEach((e) => {
        rawCM += parseFloat(e.cm) || 0;
        rawTD += parseFloat(e.td) || 0;
        rawTP += parseFloat(e.tp) || 0;
      });
    });
    const coefTD = isS123(sem) ? 2 : 1;
    const coefTP = isS123(sem) ? 4 : 2;
    const cm = rawCM;
    const td = rawTD * coefTD;
    const tp = rawTP * coefTP;
    const total = 1.5 * cm + td + (2 / 3) * tp;
    totalCM += cm;
    totalTD += td;
    totalTP += tp;
    return { sem, cm, td, tp, total };
  });

  const grandTotal = 1.5 * totalCM + totalTD + (2 / 3) * totalTP;

  const fmt = (n) => (n % 1 === 0 ? n : n.toFixed(2).replace(/\.?0+$/, ""));

  let html = `
    <div class="page-header">
      <h1>Pilotage</h1>
      <p class="subtitle">Volumes horaires agrégés par semestre (répartition effectuée)</p>
    </div>
    <div class="table-wrapper">
      <table class="ressources-table pilotage-table">
        <thead>
          <tr>
            <th class="pilotage-sem-col">Semestre</th>
            <th class="pilotage-h-col">CM</th>
            <th class="pilotage-h-col">TD</th>
            <th class="pilotage-h-col">TP</th>
            <th class="pilotage-total-col">Total<br><small>1,5 CM + TD + 2/3 TP</small></th>
          </tr>
        </thead>
        <tbody>`;

  rows.forEach(({ sem, cm, td, tp, total }, i) => {
    const rowClass = i % 2 === 0 ? "group-even" : "group-odd";
    html += `
          <tr class="${rowClass}">
            <td><span class="badge-semestre" data-sem="${sem}">${sem}</span></td>
            <td class="pilotage-h-val">${fmt(cm)}</td>
            <td class="pilotage-h-val">${fmt(td)}</td>
            <td class="pilotage-h-val">${fmt(tp)}</td>
            <td class="pilotage-total-val">${fmt(total)}</td>
          </tr>`;
  });

  html += `
        </tbody>
        <tfoot>
          <tr class="pilotage-total-row">
            <td><strong>Total</strong></td>
            <td class="pilotage-h-val"><strong>${fmt(totalCM)}</strong></td>
            <td class="pilotage-h-val"><strong>${fmt(totalTD)}</strong></td>
            <td class="pilotage-h-val"><strong>${fmt(totalTP)}</strong></td>
            <td class="pilotage-total-val"><strong>${fmt(grandTotal)}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>`;

  root.innerHTML = html;
}

/* ── Vue : Journal des modifications ────────────────────────────────────── */
function renderModifications(root) {
  const mods = APP_DATA.modifications.slice().reverse();

  let html = `
    <div class="page-header journal-page-hdr" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:0;">
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

  /* Pas de .table-wrapper ici : overflow-x bloquerait position:sticky sur thead */
  html += `<table class="ressources-table" style="width:100%;">
    <thead class="journal-thead">
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

  html += `</tbody></table>`;
  root.innerHTML = html;

  /* Calcul des tops sticky après rendu (mesure réelle des hauteurs) */
  requestAnimationFrame(() => {
    const navH    = document.querySelector("header")?.offsetHeight || 54;
    const pageHdr = root.querySelector(".journal-page-hdr");
    const thead   = root.querySelector(".journal-thead");
    if (!pageHdr || !thead) return;
    pageHdr.style.cssText += `position:sticky;top:${navH}px;z-index:50;background:#fafaf8;padding-bottom:0.6rem;`;
    thead.style.cssText   += `position:sticky;top:${navH + pageHdr.offsetHeight}px;z-index:49;`;
  });
}

window.clearModificationsGH = async function () {
  if (!confirm("Vider définitivement le journal des modifications ?")) return;
  APP_DATA.modifications = [];
  if (isGHConfigured()) {
    try {
      await saveFileGH(
        "modifications.json",
        [],
        "Vider le journal des modifications via Web UI",
      );
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
  APP_DATA = {
    affectations: {},
    enseignants: [],
    maquette_overrides: {},
    modifications: [],
    volume_horaire_national: {},
  };
  currentView = "home";
  await loadData();
};

window.switchToCurrent = async function () {
  ARCHIVE_MODE = false;
  ARCHIVE_VERSION = "planifiee";
  APP_DATA = {
    affectations: {},
    enseignants: [],
    maquette_overrides: {},
    modifications: [],
    volume_horaire_national: {},
  };
  currentView = "home";
  await loadData();
};

window.switchArchiveVersion = async function () {
  ARCHIVE_VERSION = ARCHIVE_VERSION === "planifiee" ? "realisee" : "planifiee";
  APP_DATA.affectations = {};
  await loadData();
};

/* Fusionne les responsables chargés depuis sae_data.json dans la structure par défaut */
function _mergeSaeResponsables(loaded) {
  if (!loaded || !loaded.sae) return;
  Object.entries(loaded.sae).forEach(([sem, list]) => {
    if (!Array.isArray(list)) return;
    if (!APP_DATA.sae.sae[sem]) {
      APP_DATA.sae.sae[sem] = list; /* Semestre inconnu → insérer tel quel */
      if (!APP_DATA.sae.semestres.includes(sem)) APP_DATA.sae.semestres.push(sem);
      return;
    }
    list.forEach((entry) => {
      const local = APP_DATA.sae.sae[sem].find((s) => s.code === entry.code);
      if (local) local.responsable = entry.responsable || local.responsable;
    });
  });
}

async function loadData() {
  const localBase = ARCHIVE_MODE ? "archive_25-26/data" : "data";
  const ghBase = ARCHIVE_MODE ? GH_ARCHIVE_PATH : GH_BASE_PATH;
  const sfx = ARCHIVE_MODE ? "_25-26" : "";
  const affSfx =
    ARCHIVE_MODE && ARCHIVE_VERSION === "realisee" ? "_25-26_realise" : sfx;

  // 1. Charge d'abord les fichiers locaux (fallback garanti)
  try {
    const [aff, ens, maq, mods, vhn, sae] = await Promise.all([
      fetch(`${localBase}/affectations${affSfx}.json`).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch(`${localBase}/enseignants${sfx}.json`).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch(`${localBase}/maquette_overrides${sfx}.json`).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch(`${localBase}/modifications${sfx}.json`).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch(`${localBase}/volume_horaire_national.json`).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch(`${localBase}/sae_data.json`).then((r) =>
        r.ok ? r.json() : null,
      ),
    ]);
    if (aff) APP_DATA.affectations = aff;
    if (ens) APP_DATA.enseignants = ens;
    if (maq) APP_DATA.maquette_overrides = maq;
    if (mods) APP_DATA.modifications = mods;
    if (vhn) APP_DATA.volume_horaire_national = vhn;
    if (sae) _mergeSaeResponsables(sae);
  } catch (e) {
    console.warn("Local load failed (file:// ?)", e);
  }

  // 2. Si GitHub est configuré, tente de récupérer les données (priorité sur local)
  if (isGHConfigured()) {
    try {
      const [aff, ens, maq, mods, vhn, sae] = await Promise.all([
        fetchGH(`affectations${affSfx}.json`, ghBase),
        fetchGH(`enseignants${sfx}.json`, ghBase),
        fetchGH(`maquette_overrides${sfx}.json`, ghBase),
        fetchGH(`modifications${sfx}.json`, ghBase),
        fetchGH(`volume_horaire_national.json`, ghBase),
        fetchGH(`sae_data.json`, ghBase),
      ]);
      if (aff) APP_DATA.affectations = aff;
      if (ens) APP_DATA.enseignants = ens;
      if (maq) APP_DATA.maquette_overrides = maq;
      if (mods) APP_DATA.modifications = mods;
      if (vhn) APP_DATA.volume_horaire_national = vhn;
      if (sae) _mergeSaeResponsables(sae);
    } catch (e) {
      console.warn("GH load failed, données locales conservées", e);
    }
  }

  renderView();
}

document.addEventListener("DOMContentLoaded", async () => {
  // La redirection est gérée par le script inline dans index.html
  injectGHUI();
  await loadData();
  AUTH.injectBadge();
});
