document.addEventListener("DOMContentLoaded", async () => {
  const nomSelect = document.getElementById("nom");

  // Charge la liste des enseignants depuis l'application répartition
  try {
    const resp = await fetch("../repartition/data/enseignants.json");
    if (resp.ok) {
      const enseignants = await resp.json();
      enseignants.sort((a, b) => a.id.localeCompare(b.id, "fr"));
      nomSelect.innerHTML =
        `<option value="">Sélectionnez un enseignant…</option>` +
        enseignants.map((e) => `<option value="${e.id}">${e.id}</option>`).join("");
    } else {
      nomSelect.innerHTML = `<option value="">Impossible de charger la liste</option>`;
    }
  } catch {
    nomSelect.innerHTML = `<option value="">Impossible de charger la liste</option>`;
  }

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
      const response = await fetch("process.php", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      messageDiv.style.display = "block";
      if (result.status === "success") {
        messageDiv.className = "success";
        messageDiv.textContent = result.message;
        form.reset();
        nomSelect.value = "";
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
