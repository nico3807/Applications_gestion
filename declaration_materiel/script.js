document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("materielForm");
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
      submitBtn.textContent = "Envoyer la déclaration";
    }
  });
});
