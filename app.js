
document.addEventListener("DOMContentLoaded", () => {

  // APPLICATION SUBMISSION
  const applicationForm = document.getElementById("application-form");
  const applicationFeedback = document.getElementById("form-feedback");

  if (applicationForm && applicationFeedback) {
    applicationForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!applicationForm.reportValidity()) return;

      const button = applicationForm.querySelector('button[type="submit"]');
      const originalText = button.textContent;

      button.disabled = true;
      button.textContent = "Submitting...";
      applicationFeedback.textContent = "Please wait while your application is submitted.";

      const formData = new FormData(applicationForm);
      const data = Object.fromEntries(formData.entries());
      data.consent = applicationForm.querySelector('[name="consent"]').checked;

      try {
        const response = await fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Application submission failed.");
        }

        applicationFeedback.textContent =
          "Your application was received. Reference: " +
          result.reference +
          ". Tracking code: " +
          result.trackingCode;

        applicationForm.reset();

      } catch (error) {
        applicationFeedback.textContent =
          error.message || "Unable to submit your application. Please try again.";

      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    });
  }

  // APPLICATION STATUS TRACKING
  const trackForm = document.getElementById("track-form");
  const trackResult = document.getElementById("track-result");

  if (trackForm && trackResult) {
    trackForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!trackForm.reportValidity()) return;

      const button = trackForm.querySelector('button[type="submit"], button:not([type])');
      const originalText = button ? button.textContent : "Check status";

      if (button) {
        button.disabled = true;
        button.textContent = "Checking...";
      }

      trackResult.textContent = "Checking your application. Please wait.";

      try {
        const formData = new FormData(trackForm);

        const response = await fetch("/api/track", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            reference: formData.get("reference"),
            trackingCode: formData.get("trackingCode")
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Unable to find your application."
          );
        }

        // Display the result safely without inserting HTML from the server.
        trackResult.replaceChildren();

        const heading = document.createElement("h3");
        heading.textContent = "Application Status";

        const reference = document.createElement("p");
        reference.textContent = "Reference: " + result.reference;

        const status = document.createElement("p");
        status.textContent = "Current status: " + result.status;

        const message = document.createElement("p");
        message.textContent = result.message || "Your application status has been updated.";

        trackResult.append(heading, reference, status, message);

        if (result.updatedAt) {
          const updated = document.createElement("p");
          updated.textContent = "Last updated: " + result.updatedAt;
          trackResult.appendChild(updated);
        }

      } catch (error) {
        trackResult.textContent =
          error.message || "Unable to check your application. Please try again.";

      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = originalText;
        }
      }
    });
  }

  // FOOTER YEAR
  const year = document.getElementById("year");
  if (year) {
    year.textContent = new Date().getFullYear();
  }

});
