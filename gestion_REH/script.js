"use strict";

if (!AUTH.isAuth() || !AUTH.isAdmin()) location.href = '../index.html';

const GH_OWNER  = "nico3807";
const GH_REPO   = "Applications_gestion";
const GH_BRANCH = "main";

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

/* ── GitHub fetch ─────────────────────────────────────────────────────── */
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

/* ── Vue Portfolio ────────────────────────────────────────────────────── */
// donnees_pf.json est contaminé par les données stages (même préfixe
// localStorage sout_v1_). On utilise horaires_pf.json pour reconstruire
// exactement les clés que l'app portfolio génère (même logique que
// renderJuries() dans app_pf.js), puis on lit seulement celles-ci.
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

function renderPortfolio(root, pfData, horairesData) {
  const validKeys = buildValidPortfolioKeys(horairesData);
  const counts = {};
  for (const key of validKeys) {
    const val = pfData[key];
    if (val) counts[val] = (counts[val] || 0) + 1;
  }

  const rows = Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b, "fr"));

  const totalJurys = rows.reduce((s, [, n]) => s + n, 0);
  const totalREH   = totalJurys * 3;

  const tableRows = rows.map(([nom, nbre], i) => `
    <tr class="${i % 2 === 0 ? "group-even" : "group-odd"}">
      <td>${nom}</td>
      <td><strong>${nbre}</strong></td>
      <td><strong>${nbre * 3}</strong></td>
    </tr>`).join("");

  root.innerHTML = `
    <div class="page-header">
      <h1>Portfolio</h1>
      <p class="subtitle">REH Portfolio — participation aux jurys de soutenances portfolio</p>
    </div>
    <div class="table-wrapper reh-table">
      <table class="ressources-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Nbre de jurys</th>
            <th>REH Portfolio</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
        <tfoot>
          <tr class="reh-total-row">
            <td><strong>Total</strong></td>
            <td><strong>${totalJurys}</strong></td>
            <td><strong>${totalREH}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>`;
}

/* ── Rendu principal ──────────────────────────────────────────────────── */
async function renderView(view) {
  const root = document.getElementById("app-root");
  if (view === "portfolio") {
    root.innerHTML = `<div style="padding:3rem;text-align:center;color:#6b7280;">Chargement…</div>`;
    try {
      const [pfData, horairesData] = await Promise.all([
        fetchGHJson("soutenances_portfolio/donnees_pf.json"),
        fetchGHJson("soutenances_portfolio/horaires_pf.json"),
      ]);
      renderPortfolio(root, pfData, horairesData);
    } catch (e) {
      root.innerHTML = `<div class="alert alert-danger" style="margin-top:1rem;">
        Erreur de chargement : ${e.message}</div>`;
    }
  }
}

/* ── Init ─────────────────────────────────────────────────────────────── */
AUTH.injectBadge();
navigate("portfolio");
