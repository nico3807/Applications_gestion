"use strict";

/* Correspondance login → nom affiché dans le JSON de souhaits */
const _LOGIN_TO_NOM = {
  "nicolas.maurin":   "MAURIN Nicolas",
  "damien.marill":    "MARILL Damien",
  "sandy.blanco":     "BLANCO Sandy",
  "william.bernard":  "BERNARD William",
  "emmanuel.therond": "THEROND Emmanuel",
  "luc.jaeckle":      "JAECKLE Luc",
  "benoit.darties":   "DARTIES Benoit",
  "sophie.de-velder": "DE VELDER Sophie",
  "davide.di-pierro": "DI PIERRO Davide",
  "chrysta.pelissier":"PELISSIER Chrysta",
  "caroline.surribas":"SURRIBAS Caroline",
  "laeticia.tournie": "TOURNIE Laetitia",
  "jerome.aze":       "AZE Jérome",
  "sylvie.escaig":    "ESCAIG Sylvie",
};

let _souhaitsFilter = "S1";

function _souhaitNom()   { return _LOGIN_TO_NOM[AUTH.user()] || AUTH.user(); }
function _souhaitLsKey() { return `souhaits_${AUTH.user()}`; }
function _souhaitLoad()  {
  try { return JSON.parse(localStorage.getItem(_souhaitLsKey())) || {}; }
  catch { return {}; }
}

window.renderSouhaits = function (root) {
  if (!semestres().includes(_souhaitsFilter)) _souhaitsFilter = semestres()[0];

  const saved      = _souhaitLoad();
  const semSaved   = (saved.souhaits && saved.souhaits[_souhaitsFilter]) || [];

  const aff     = (APP_DATA.affectations && APP_DATA.affectations[_souhaitsFilter]) || {};
  const ressources = Object.keys(aff).filter(r => !r.toLowerCase().includes("saé"));
  const saeList    = (APP_DATA.sae?.sae?.[_souhaitsFilter]) || [];

  const semBtns = semestres().map(s =>
    `<button class="sem-btn ${s === _souhaitsFilter ? "active" : ""}" data-sem="${s}"
       onclick="setSouhaitsFilter('${s}')">${s}</button>`
  ).join("");

  let rows = "";
  let idx  = 0;

  ressources.forEach(r => {
    const checked = semSaved.includes(r) ? "checked" : "";
    rows += `<tr class="${idx % 2 === 0 ? "group-even" : "group-odd"}">
      <td style="font-size:13px;">${r}</td>
      <td style="text-align:center;">
        <span style="display:inline-block;background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;
          border-radius:4px;padding:1px 7px;font-size:11px;">Ressource</span>
      </td>
      <td style="text-align:center;">
        <input type="checkbox" class="souhait-cb" data-code="${r.replace(/"/g, '&quot;')}" ${checked}>
      </td>
    </tr>`;
    idx++;
  });

  saeList.forEach(sae => {
    const checked = semSaved.includes(sae.code) ? "checked" : "";
    const [codeRef, codeName] = sae.code.includes(" | ")
      ? sae.code.split(" | ")
      : [sae.code, sae.intitule || ""];
    rows += `<tr class="${idx % 2 === 0 ? "group-even" : "group-odd"}">
      <td style="font-size:13px;">
        <span style="color:#14532d;font-size:11px;font-weight:600;margin-right:5px;">${codeRef}</span>${codeName}
      </td>
      <td style="text-align:center;">
        <span style="display:inline-block;background:#bbf7d0;color:#14532d;border:1px solid #4ade80;
          border-radius:4px;padding:1px 7px;font-size:11px;">SAÉ</span>
      </td>
      <td style="text-align:center;">
        <input type="checkbox" class="souhait-cb" data-code="${sae.code.replace(/"/g, '&quot;')}" ${checked}>
      </td>
    </tr>`;
    idx++;
  });

  const nom       = _souhaitNom();
  const lastSaved = saved.date
    ? ` — Sauvegardé le ${new Date(saved.date).toLocaleDateString("fr-FR",
        { day: "2-digit", month: "2-digit", year: "numeric" })} à ${new Date(saved.date).toLocaleTimeString("fr-FR",
        { hour: "2-digit", minute: "2-digit" })}`
    : "";

  const totalChecked = Object.values(saved.souhaits || {}).reduce((acc, arr) => acc + arr.length, 0);
  const summaryChips = totalChecked > 0
    ? semestres().map(s => {
        const n = ((saved.souhaits || {})[s] || []).length;
        return n > 0
          ? `<span style="display:inline-block;background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;
              border-radius:4px;padding:1px 8px;font-size:11px;font-weight:600;">${s} : ${n}</span>`
          : "";
      }).filter(Boolean).join(" ")
    : `<span style="color:#9ca3af;font-size:12px;">Aucun souhait enregistré pour l'instant</span>`;

  root.innerHTML = `
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;
      flex-wrap:wrap;gap:10px;">
      <div>
        <h1 style="margin:0;">Mes souhaits d'enseignement</h1>
        <div style="font-size:13px;color:#6b7280;margin-top:3px;">${nom}${lastSaved}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="btn-save" onclick="saveSouhaits()">💾 Valider ce semestre</button>
        <button class="btn-pdf-action" onclick="exportSouhaitsXLSX()">⬇ Export XLSX</button>
      </div>
    </div>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;
      padding:10px 14px;margin-bottom:1.25rem;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <span style="font-size:12px;font-weight:600;color:#374151;">Récapitulatif :</span>
      ${summaryChips}
    </div>

    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:1.25rem;">
      ${semBtns}
    </div>

    <div class="table-wrapper">
      <table class="ressources-table">
        <colgroup><col><col style="width:110px;"><col style="width:90px;"></colgroup>
        <thead>
          <tr>
            <th>Intitulé</th>
            <th style="text-align:center;">Type</th>
            <th style="text-align:center;">Souhait</th>
          </tr>
        </thead>
        <tbody>${rows ||
          `<tr><td colspan="3" style="text-align:center;color:#9ca3af;padding:2rem;">
            Aucune ressource pour ce semestre</td></tr>`}
        </tbody>
      </table>
    </div>

    <div style="display:flex;justify-content:flex-end;margin-top:1rem;">
      <button class="btn-save" onclick="saveSouhaits()">💾 Valider ce semestre</button>
    </div>`;
};

/* helpers */
function semestres() { return typeof SEMESTRES !== "undefined" ? SEMESTRES : []; }

window.setSouhaitsFilter = function (sem) {
  _souhaitsFilter = sem;
  renderView();
};

window.saveSouhaits = function () {
  const data = _souhaitLoad();
  if (!data.souhaits) data.souhaits = {};

  data.souhaits[_souhaitsFilter] =
    [...document.querySelectorAll(".souhait-cb:checked")].map(cb => cb.dataset.code);
  data.nom   = _souhaitNom();
  data.login = AUTH.user();
  data.date  = new Date().toISOString();

  localStorage.setItem(_souhaitLsKey(), JSON.stringify(data));
  showToast(`Souhaits pour ${_souhaitsFilter} enregistrés !`);
  renderView();
};

window.exportSouhaitsXLSX = function () {
  if (typeof XLSX === "undefined") { alert("Bibliothèque XLSX non chargée."); return; }
  const data    = _souhaitLoad();
  const souhaits = data.souhaits || {};
  const semsAvec = semestres().filter(s => (souhaits[s] || []).length > 0);
  if (!semsAvec.length) { showToast("Aucun souhait à exporter."); return; }

  const rows = [["Semestre", "Code / Intitulé", "Type"]];
  semsAvec.forEach(sem => {
    const saeList = (APP_DATA?.sae?.sae?.[sem]) || [];
    (souhaits[sem] || []).forEach(code => {
      const isSae = saeList.some(s => s.code === code);
      rows.push([sem, code, isSae ? "SAÉ" : "Ressource"]);
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 12 }, { wch: 60 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Souhaits");
  XLSX.writeFile(wb, `souhaits_${(data.login || AUTH.user()).replace(/\./g, "_")}.xlsx`);
};
