document.addEventListener("DOMContentLoaded", async () => {
  const enseignantSelect = document.getElementById("enseignant");

  try {
    const resp = await fetch("../repartition/data/enseignants.json");
    if (resp.ok) {
      const enseignants = await resp.json();
      enseignants.sort((a, b) => a.id.localeCompare(b.id, "fr"));
      enseignantSelect.innerHTML =
        `<option value="">Sélectionnez un enseignant…</option>` +
        enseignants.map((e) => `<option value="${e.id}">${e.id}</option>`).join("");
    } else {
      enseignantSelect.innerHTML = `<option value="">Impossible de charger la liste</option>`;
    }
  } catch {
    enseignantSelect.innerHTML = `<option value="">Impossible de charger la liste</option>`;
  }

  const form = document.getElementById("absenceForm");
  const messageDiv = document.getElementById("formMessage");
  const submitBtn = document.getElementById("submitBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
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
        enseignantSelect.value = "";
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
