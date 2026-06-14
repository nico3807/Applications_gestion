"use strict";

const VALIDATORS = ["nicolas.maurin", "sylvie.escaig", "william.bernard"];

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

// ── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const start = () => {
    if (!VALIDATORS.includes(AUTH.user())) {
      document.getElementById("denied").style.display = "";
    } else {
      document.getElementById("main").style.display = "";
      setupTabs();
      loadDemandes();
    }
  };
  if (AUTH.isAuth()) start();
  else window.addEventListener("auth-success", start, { once: true });
});

// ── Filter tabs ───────────────────────────────────────────────────────────────

let currentFilter = "en_attente";

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

let allDemandes = [];

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
  const n = allDemandes.filter((d) => d.statut === "en_attente").length;
  const el = document.getElementById("cnt-attente");
  el.textContent = n;
  el.style.display = n > 0 ? "" : "none";
}

// ── Render ────────────────────────────────────────────────────────────────────

const LABELS = { en_attente: "En attente", validee: "Validée", rejetee: "Rejetée" };
const SBADGE = { en_attente: "sbadge-attente", validee: "sbadge-validee", rejetee: "sbadge-rejetee" };

function render() {
  const list = document.getElementById("list");
  const items =
    currentFilter === "all"
      ? allDemandes
      : allDemandes.filter((d) => d.statut === currentFilter);

  if (!items.length) {
    list.innerHTML = '<div class="empty-msg">Aucune demande dans cette catégorie.</div>';
    return;
  }

  list.innerHTML = items.map((d) => cardHtml(d)).join("");

  // Bindings
  list.querySelectorAll(".btn-val").forEach((b) =>
    b.addEventListener("click", () => toggleBox(b.dataset.id, "val"))
  );
  list.querySelectorAll(".btn-rej").forEach((b) =>
    b.addEventListener("click", () => toggleBox(b.dataset.id, "rej"))
  );
  list.querySelectorAll(".btn-cancel-action").forEach((b) =>
    b.addEventListener("click", () => closeBoxes(b.dataset.id))
  );
  list.querySelectorAll(".btn-ok-val").forEach((b) =>
    b.addEventListener("click", () => decide(b.dataset.id, "valider", ""))
  );
  list.querySelectorAll(".btn-ok-rej").forEach((b) =>
    b.addEventListener("click", () => {
      const txt = document.getElementById(`rej-txt-${b.dataset.id}`);
      decide(b.dataset.id, "rejeter", txt.value);
    })
  );
}

function cardHtml(d) {
  const urgTag = d.urgence ? `<span class="urgence-tag">Urgence</span>` : "";
  const footer =
    d.statut !== "en_attente"
      ? `<div class="decision-line">
           ${d.statut === "validee" ? "✓" : "✕"}
           <strong>${LABELS[d.statut]}</strong> par
           <strong>${esc(d.decision_par)}</strong>
           le ${fmtDate(d.decision_date)}
         </div>
         ${d.justification_decision ? `<div class="decision-just">"${esc(d.justification_decision)}"</div>` : ""}`
      : `<div class="action-btns">
           <button class="btn-val" data-id="${d.id}">✓ Valider</button>
           <button class="btn-rej" data-id="${d.id}">✕ Rejeter</button>
         </div>
         <div class="confirm-box confirm-box-val" id="box-val-${d.id}">
           <p>Confirmer la validation de cette demande ?</p>
           <div class="confirm-btns">
             <button class="btn-ok-val" data-id="${d.id}">Confirmer</button>
             <button class="btn-cancel-action" data-id="${d.id}">Annuler</button>
           </div>
         </div>
         <div class="confirm-box confirm-box-rej" id="box-rej-${d.id}">
           <p>Motif du rejet (obligatoire) :</p>
           <textarea id="rej-txt-${d.id}" placeholder="Expliquez la raison du rejet…"></textarea>
           <div class="confirm-btns">
             <button class="btn-ok-rej" data-id="${d.id}">Confirmer le rejet</button>
             <button class="btn-cancel-action" data-id="${d.id}">Annuler</button>
           </div>
         </div>`;

  return `
    <div class="demande-card">
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
        <div class="dc-motif">
          <div class="dc-motif-lbl">Motif</div>
          ${esc(d.motif)}
        </div>
        ${d.urgence && d.justification_urgence
          ? `<div class="dc-motif dc-motif-urg">
               <div class="dc-motif-lbl">Justification de l'urgence</div>
               ${esc(d.justification_urgence)}
             </div>`
          : ""}
      </div>
      <div class="dc-footer">${footer}</div>
    </div>`;
}

// ── Actions ───────────────────────────────────────────────────────────────────

function closeBoxes(id) {
  document.getElementById(`box-val-${id}`)?.classList.remove("show");
  document.getElementById(`box-rej-${id}`)?.classList.remove("show");
}

function toggleBox(id, type) {
  const other = type === "val" ? "rej" : "val";
  document.getElementById(`box-${other}-${id}`)?.classList.remove("show");
  document.getElementById(`box-${type}-${id}`)?.classList.toggle("show");
}

async function decide(id, action, justification) {
  try {
    const resp = await fetch("api_demandes.php", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, justification }),
    });
    const result = await resp.json();
    if (!resp.ok) {
      alert(result.error ?? "Erreur lors de la mise à jour.");
      return;
    }
    await loadDemandes();
  } catch (e) {
    alert("Erreur réseau : " + e.message);
  }
}
