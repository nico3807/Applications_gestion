document.addEventListener("DOMContentLoaded", async () => {
  const enseignantSelect = document.getElementById("enseignant");
  const groupeSelect     = document.getElementById("groupe");
  const matiereSelect    = document.getElementById("matiere");
  const dateCoursInput   = document.getElementById("date_cours");

  // Date du jour par défaut
  dateCoursInput.value = new Date().toISOString().split("T")[0];

  // Chargement parallèle des données
  let vhn = {}, saeData = { sae: {} };
  const [rEns, rVhn, rSae] = await Promise.allSettled([
    fetch("../repartition/data/enseignants.json"),
    fetch("../repartition/data/volume_horaire_national.json"),
    fetch("../repartition/data/sae_data.json"),
  ]);

  // Enseignants
  if (rEns.status === "fulfilled" && rEns.value.ok) {
    const enseignants = await rEns.value.json();
    enseignants.sort((a, b) => a.id.localeCompare(b.id, "fr"));
    enseignantSelect.innerHTML =
      `<option value="">Sélectionnez un enseignant…</option>` +
      enseignants.map((e) => `<option value="${e.id}">${e.id}</option>`).join("");
  } else {
    enseignantSelect.innerHTML = `<option value="">Impossible de charger la liste</option>`;
  }

  // Ressources et SAÉs
  if (rVhn.status === "fulfilled" && rVhn.value.ok) vhn = await rVhn.value.json();
  if (rSae.status === "fulfilled" && rSae.value.ok) saeData = await rSae.value.json();

  const PARCOURS_MAP = {
    "MMI1":      ["S1", "S2"],
    "MMI2 Créa": ["S3", "S4 crea"],
    "MMI2 Dev":  ["S3", "S4 dev"],
    "MMI3 Créa": ["S5 crea", "S6 crea"],
    "MMI3 Dev":  ["S5 dev", "S6 dev"],
  };

  function updateMatieres(parcours) {
    const semestres = PARCOURS_MAP[parcours] || [];
    if (!semestres.length) {
      matiereSelect.innerHTML = `<option value="">Sélectionnez d'abord un parcours…</option>`;
      return;
    }
    let html = `<option value="">Sélectionnez une matière…</option>`;
    for (const sem of semestres) {
      const ressources = Object.keys(vhn[sem] || {}).filter((k) => k.startsWith("R"));
      const saes = (saeData.sae[sem] || []).map((e) => e.code);
      if (ressources.length) {
        html +=
          `<optgroup label="${sem} – Ressources">` +
          ressources.map((r) => `<option value="${r}">${r}</option>`).join("") +
          `</optgroup>`;
      }
      if (saes.length) {
        html +=
          `<optgroup label="${sem} – SAÉ">` +
          saes.map((s) => `<option value="${s}">${s}</option>`).join("") +
          `</optgroup>`;
      }
    }
    matiereSelect.innerHTML = html;
  }

  function applyGroupeRestriction() {
    const login = (AUTH.user() ?? "").toLowerCase();
    if (login.startsWith("mmi1")) {
      groupeSelect.innerHTML = `<option value="MMI1">MMI1</option>`;
      updateMatieres("MMI1");
    } else if (login.startsWith("mmi2")) {
      groupeSelect.innerHTML =
        `<option value="">Sélectionnez un parcours…</option>` +
        `<option value="MMI2 Créa">MMI2 Créa</option>` +
        `<option value="MMI2 Dev">MMI2 Dev</option>`;
      updateMatieres("");
    } else if (login.startsWith("mmi3")) {
      groupeSelect.innerHTML =
        `<option value="">Sélectionnez un parcours…</option>` +
        `<option value="MMI3 Créa">MMI3 Créa</option>` +
        `<option value="MMI3 Dev">MMI3 Dev</option>`;
      updateMatieres("");
    } else {
      updateMatieres("");
    }
  }

  applyGroupeRestriction();
  groupeSelect.addEventListener("change", () => updateMatieres(groupeSelect.value));

  const form       = document.getElementById("absenceForm");
  const messageDiv = document.getElementById("formMessage");
  const submitBtn  = document.getElementById("submitBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    submitBtn.disabled = true;
    submitBtn.textContent = "Envoi en cours…";
    messageDiv.style.display = "none";

    try {
      const response = await fetch("process.php", { method: "POST", body: formData });
      const result = await response.json();
      messageDiv.style.display = "block";

      if (result.status === "success") {
        messageDiv.className = "success";
        messageDiv.textContent = result.message;
        form.reset();
        enseignantSelect.value = "";
        dateCoursInput.value = new Date().toISOString().split("T")[0];
        applyGroupeRestriction();
      } else {
        messageDiv.className = "error";
        messageDiv.textContent = result.message;
      }
    } catch {
      messageDiv.style.display = "block";
      messageDiv.className = "error";
      messageDiv.textContent = "Une erreur serveur est survenue.";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Envoyer le signalement";
    }
  });
});
