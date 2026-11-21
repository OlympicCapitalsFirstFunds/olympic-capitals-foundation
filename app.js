document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("application-form");
  const feedback = document.getElementById("form-feedback");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const button = form.querySelector('button[type="submit"]');
    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = "Submitting...";
    feedback.textContent = "Please wait while your application is submitted.";

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.consent = form.querySelector('[name="consent"]').checked;

    try {
      const response = await fetch("/api/application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Application submission failed.");
      }

      feedback.textContent =
        "Your application was received. Reference: " +
        result.reference +
        ". Please keep your tracking code safe: " +
        result.trackingCode;

      form.reset();
    } catch (error) {
      feedback.textContent = error.message ||
        "Unable to submit your application. Please try again.";
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  });
});