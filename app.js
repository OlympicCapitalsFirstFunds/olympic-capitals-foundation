
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
      applicationFeedback.textContent =
        "Please wait while your application is submitted.";

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

      const button = trackForm.querySelector(
        'button[type="submit"], button:not([type])'
      );

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

        trackResult.replaceChildren();

        const heading = document.createElement("h3");
        heading.textContent = "Application Status";

        const reference = document.createElement("p");
        reference.textContent = "Reference: " + result.reference;

        const status = document.createElement("p");
        status.textContent = "Current status: " + result.status;

        const message = document.createElement("p");
        message.textContent =
          result.message || "Your application status has been updated.";

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


  // SHOW TRACKING-CODE RECOVERY FORM
  const showRecoveryButton = document.getElementById("show-recovery");
  const recoveryForm = document.getElementById("recovery-form");

  if (showRecoveryButton && recoveryForm) {
    showRecoveryButton.addEventListener("click", () => {
      recoveryForm.style.display = "block";
      showRecoveryButton.style.display = "none";
    });
  }


  // START TRACKING-CODE RECOVERY
  const recoveryFeedback = document.getElementById("recovery-feedback");
  const recoveryVerification =
    document.getElementById("recovery-verification");

  if (recoveryForm && recoveryFeedback && recoveryVerification) {
    recoveryForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!recoveryForm.reportValidity()) return;

      const sendButton = recoveryForm.querySelector(
        'button[type="submit"]'
      );

      const originalText = sendButton.textContent;

      const formData = new FormData(recoveryForm);

      const reference = String(formData.get("reference") || "").trim();
      const email = String(formData.get("email") || "").trim();

      sendButton.disabled = true;
      sendButton.textContent = "Sending...";
      recoveryFeedback.textContent =
        "Please wait while we process your request.";

      recoveryVerification.style.display = "none";

      try {
        const response = await fetch("/api/recover/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            reference,
            email
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Unable to start tracking-code recovery."
          );
        }

        recoveryFeedback.textContent =
          result.message ||
          "If your details match an application, a verification code will be sent to its registered email.";

        recoveryVerification.style.display = "block";

      } catch (error) {
        recoveryFeedback.textContent =
          error.message || "Unable to process your recovery request.";

      } finally {
        sendButton.disabled = false;
        sendButton.textContent = originalText;
      }
    });
  }


  // VERIFY RECOVERY CODE AND SEND NEW TRACKING CODE
  const verifyRecoveryButton = document.getElementById("verify-recovery");

  if (
    verifyRecoveryButton &&
    recoveryForm &&
    recoveryFeedback
  ) {
    verifyRecoveryButton.addEventListener("click", async () => {

      const referenceInput =
        recoveryForm.querySelector('[name="reference"]');

      const emailInput =
        recoveryForm.querySelector('[name="email"]');

      const codeInput =
        recoveryForm.querySelector('[name="code"]');

      const reference = referenceInput.value.trim();
      const email = emailInput.value.trim();
      const code = codeInput.value.trim();

      if (!reference || !email || !emailInput.checkValidity()) {
        recoveryFeedback.textContent =
          "Please enter your application reference and registered email address.";
        return;
      }

      if (!/^\d{6}$/.test(code)) {
        recoveryFeedback.textContent =
          "Please enter the six-digit verification code.";
        codeInput.focus();
        return;
      }

      const originalText = verifyRecoveryButton.textContent;

      verifyRecoveryButton.disabled = true;
      verifyRecoveryButton.textContent = "Verifying...";

      recoveryFeedback.textContent =
        "Verifying your code. Please wait.";

      try {
        const response = await fetch("/api/recover/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            reference,
            email,
            code
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Verification failed. Please try again."
          );
        }

        recoveryFeedback.textContent =
          result.message ||
          "Recovery successful. Please check your registered email for your new tracking code.";

        codeInput.value = "";
        recoveryVerification.style.display = "none";

      } catch (error) {
        recoveryFeedback.textContent =
          error.message || "Unable to verify your recovery code.";

      } finally {
        verifyRecoveryButton.disabled = false;
        verifyRecoveryButton.textContent = originalText;
      }
    });
  }


  // FOOTER YEAR
  const year = document.getElementById("year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

});
