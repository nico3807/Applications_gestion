"use strict";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  const dt = new Date(iso);
  return dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
    + " à " + dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

const LABELS = { en_attente: "En attente", validee: "Validée", rejetee: "Rejetée" };
const SBADGE = { en_attente: "sbadge-attente", validee: "sbadge-validee", rejetee: "sbadge-rejetee" };

// ── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const start = () => { setupTabs(); loadDemandes(); };
  if (AUTH.isAuth()) start();
  else window.addEventListener("auth-success", start, { once: true });
});

// ── Filter tabs ───────────────────────────────────────────────────────────────

let currentFilter = "en_attente";
let allDemandes   = [];

function setupTabs() {
  document.querySelectorAll(".filter-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.f;
      render();
    });
  });
}

// ── Data ──────────────────────────────────────────────────────────────────────

async function loadDemandes() {
  document.getElementById("list").innerHTML = '<div class="load-msg">Chargement…</div>';
  try {
    const resp = await fetch("api_demandes.php", { credentials: "include" });
    if (!resp.ok) throw new Error(`Erreur ${resp.status}`);
    allDemandes = await resp.json();
    allDemandes.sort((a, b) => new Date(b.soumis_le) - new Date(a.soumis_le));
    updateCnt();
    render();
  } catch (e) {
    document.getElementById("list").innerHTML =
      `<div class="empty-msg">Erreur de chargement : ${esc(e.message)}</div>`;
  }
}

function updateCnt() {
  const n  = allDemandes.filter((d) => d.statut === "en_attente").length;
  const el = document.getElementById("cnt-attente");
  el.textContent  = n;
  el.style.display = n > 0 ? "" : "none";
}

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
  const list  = document.getElementById("list");
  const items = currentFilter === "all"
    ? allDemandes
    : allDemandes.filter((d) => d.statut === currentFilter);

  if (!items.length) {
    list.innerHTML = '<div class="empty-msg">Aucune demande dans cette catégorie.</div>';
    return;
  }
  list.innerHTML = items.map(cardHtml).join("");
}

function cardHtml(d) {
  const urgTag = d.urgence ? `<span class="urgence-tag">Urgence</span>` : "";

  let footer = "";
  if (d.statut === "en_attente") {
    footer = `<div class="decision-attente">⏳ En attente de validation par l'équipe pédagogique</div>`;
  } else if (d.statut === "validee") {
    footer = `<div class="decision-ok">✓ Demande validée par <strong>${esc(d.decision_par)}</strong> le ${fmtDate(d.decision_date)}</div>`;
    if (d.justification_decision)
      footer += `<div class="decision-just">"${esc(d.justification_decision)}"</div>`;
  } else {
    footer = `<div class="decision-rej">✕ Demande rejetée par <strong>${esc(d.decision_par)}</strong> le ${fmtDate(d.decision_date)}</div>`;
    if (d.justification_decision)
      footer += `<div class="decision-just">Motif : ${esc(d.justification_decision)}</div>`;
  }

  return `
    <div class="dc-card">
      <div class="dc-header">
        <span class="sbadge ${SBADGE[d.statut]}">${LABELS[d.statut]}</span>
        <strong>${esc(d.nom)}</strong>
        <span style="color:#d1d5db">·</span>
        <span style="font-size:.84rem">${esc(d.parcours)}</span>
        ${urgTag}
        <span class="dc-meta">Soumis le ${fmtDateTime(d.soumis_le)}</span>
      </div>
      <div class="dc-body">
        ${d.ressource ? `<div class="dc-ressource">${esc(d.ressource)}</div>` : ""}
        <div class="dc-bloc dc-bloc-o">
          <div class="dc-bloc-row">
            <div class="dc-field"><span>Date du cours</span><strong>${fmtDate(d.date_cours)}</strong></div>
            <div class="dc-field"><span>Créneau</span><strong>${esc(d.heure_cours)}</strong></div>
          </div>
        </div>
        <div class="dc-bloc dc-bloc-g">
          <div class="dc-bloc-row">
            <div class="dc-field"><span>Nouvelle date</span><strong>${fmtDate(d.date_souhaite)}</strong></div>
            <div class="dc-field"><span>Nouveau créneau</span><strong>${esc(d.heure_souhaitee)}</strong></div>
          </div>
        </div>
      </div>
      <div class="dc-footer">${footer}</div>
    </div>`;
}
