document.addEventListener("DOMContentLoaded", async () => {
  const nomSelect       = document.getElementById("nom");
  const parcoursSelect  = document.getElementById("parcours");
  const ressourceSelect = document.getElementById("ressource");

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
    nomSelect.innerHTML =
      `<option value="">Sélectionnez un enseignant…</option>` +
      enseignants.map((e) => `<option value="${e.id}">${e.id}</option>`).join("");
  } else {
    nomSelect.innerHTML = `<option value="">Impossible de charger la liste</option>`;
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

  function updateRessources(parcours) {
    const semestres = PARCOURS_MAP[parcours] || [];
    if (!semestres.length) {
      ressourceSelect.innerHTML = `<option value="">Sélectionnez d'abord un parcours…</option>`;
      return;
    }
    let html = `<option value="">Sélectionnez une ressource ou SAÉ…</option>`;
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
          `<optgroup label="${sem} – SAE">` +
          saes.map((s) => `<option value="${s}">${s}</option>`).join("") +
          `</optgroup>`;
      }
    }
    ressourceSelect.innerHTML = html;
  }

  updateRessources("");
  parcoursSelect.addEventListener("change", () => updateRessources(parcoursSelect.value));

  // Urgence
  const urgenceCheckbox = document.getElementById("urgence");
  const justificationContainer = document.getElementById("justification_urgence_container");
  const justificationInput = document.getElementById("justification_urgence");
  const form = document.getElementById("edtForm");
  const messageDiv = document.getElementById("formMessage");

  urgenceCheckbox.addEventListener("change", (e) => {
    if (e.target.checked) {
      justificationContainer.classList.remove("hidden");
      justificationInput.required = true;
    } else {
      justificationContainer.classList.add("hidden");
      justificationInput.required = false;
      justificationInput.value = "";
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const submitBtn = document.getElementById("submitBtn");
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
        nomSelect.value = "";
        updateRessources("");
        justificationContainer.classList.add("hidden");
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
      submitBtn.textContent = "Soumettre la demande";
    }
  });
});
