
(async function () {

  // ==========================================
  // ANIMATION SPEED
  //
  // 1 = original speed
  // 2 = half speed
  // 3 = one third speed
  // 0.5 = twice as fast
  // ==========================================

  const ANIMATION_SPEED = 2;

  const FLIP_TIME = 950;
  const FLAP_TIME = 650;
  const PAPER_TIME = 950;

  const flipDuration = FLIP_TIME * ANIMATION_SPEED;
  const flapDuration = FLAP_TIME * ANIMATION_SPEED;
  const paperDuration = PAPER_TIME * ANIMATION_SPEED;

  const root = document.getElementById("wedding-invitation");

  if (!root) {
    console.error("Wedding invitation root element was not found.");
    return;
  }

  // Show a loading animation immediately while data + invitation assets load.
  root.setAttribute("aria-busy", "true");
  root.innerHTML = `
    <div class="invitation-loading" role="status" aria-live="polite">
      <div class="invitation-spinner" aria-hidden="true"></div>
      <div class="invitation-loading-text">Preparing a message for you…</div>
    </div>
  `;

  const scriptUrl = document.currentScript.src;
  const baseUrl = new URL(".", scriptUrl);

  try {

    // ==========================================
    // 1. Read the invitation ID from the URL
    // ==========================================

    const urlParams = new URLSearchParams(window.location.search);
    const invitationId = urlParams.get("id");

    // ==========================================
    // 2. Request the invitation data
    // ==========================================

    if (!window.WeddingInvitationData) {
      throw new Error("Invitation data layer has not been loaded.");
    }

    const dataPromise =
      window.WeddingInvitationData.getInvitationData(invitationId);

    /*
     * Expose the data promise globally so the existing
     * website script.js can also use the invitation data.
     */
    window.weddingInvitationDataReady = dataPromise.then(response => {

      if (!response || !response.body) {
        throw new Error("Invalid invitation data response.");
      }

      window.weddingInvitationData = response.body;

      return response.body;
    });

    // ==========================================
    // 3. Load the invitation stylesheet
    // ==========================================

    const stylesheet = document.createElement("link");

    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL("invitation.css", baseUrl).href;

    const stylesheetPromise = new Promise((resolve, reject) => {
      stylesheet.onload = resolve;
      stylesheet.onerror = reject;
      document.head.appendChild(stylesheet);
    });

    // Set animation durations
    root.style.setProperty("--flip-duration", `${flipDuration}ms`);
    root.style.setProperty("--flap-duration", `${flapDuration}ms`);
    root.style.setProperty("--paper-duration", `${paperDuration}ms`);

    // ==========================================
    // 4. Wait for both data and stylesheet
    // ==========================================

    const [invitationData] = await Promise.all([
      window.weddingInvitationDataReady,
      stylesheetPromise
    ]);

    // ==========================================
    // 5. Load the invitation HTML
    // ==========================================

    const response = await fetch(
      new URL("invitation.html", baseUrl).href
    );

    if (!response.ok) {
      throw new Error(
        `Could not load invitation.html: ${response.status}`
      );
    }

    root.innerHTML = await response.text();
    root.removeAttribute("aria-busy");

    // ==========================================
    // 6. Populate the invitation
    // ==========================================

    const scene = root.querySelector("#invitation-scene");
    const envelope = root.querySelector("#envelope-open");
    const frontLabel = root.querySelector("#envelope-front-label");
    const cardIntro = root.querySelector("#card-intro");
    const continueButton = root.querySelector("#invitation-continue");
    const hint = root.querySelector(".envelope-hint");

    if (!scene || !envelope || !frontLabel || !continueButton) {
      throw new Error("One or more invitation elements could not be found.");
    }

    // Set the envelope front text before revealing it
    frontLabel.textContent =
      invitationData.envelope_front || "Your Invitation";

    if (invitationData.id === 'none') {
      cardIntro.textContent = "Dear Guest,"
    } else {
      cardIntro.textContent = "Dear " + invitationData.envelope_front + ", "
    }

    // ==========================================
    // 7. Reveal the envelope
    // ==========================================

    // Allow the browser to render the envelope in its
    // initial invisible state before starting the fade.

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scene.classList.add("is-ready");
      });
    });

    // ==========================================
    // 8. Envelope opening animation
    // ==========================================
    let openingStarted = false;
    let invitationFullyOpen = false;
    let musicUnlocked = false;

    function startOpening() {
      // The *first* envelope click/tap is the user gesture required to unlock WebAudio.
      if (!musicUnlocked) {
        musicUnlocked = true;
        try {
          const musicApi = window.weddingMusic;
          if (musicApi && typeof musicApi.playIfNeeded === 'function') {
            void musicApi.playIfNeeded();
          }
        } catch {
          // ignore
        }
      }

      window.setTimeout(() => {
        invitationFullyOpen = true;
      }, flipDuration + flapDuration + paperDuration);
      if (openingStarted) return;
      openingStarted = true;
      if (hint) {
        hint.classList.add("is-hidden");
      }
      scene.classList.add("is-flipping");
      window.setTimeout(() => {
        scene.classList.add("is-flap-opening");
      }, flipDuration);
      window.setTimeout(() => {
        scene.classList.add("is-revealing");
      }, flipDuration + flapDuration);
    }

    envelope.addEventListener("click", startOpening);
    if (hint) {
      hint.style.pointerEvents = "auto";
      hint.style.cursor = "pointer";
      hint.style.zIndex = "10";
      hint.setAttribute("role", "button");
      hint.setAttribute("tabindex", "0");
      hint.setAttribute("aria-label", "Tap to open your invitation");

      hint.addEventListener("click", startOpening);

      hint.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          startOpening();
        }
      });
    }

    envelope.addEventListener("keydown", (event) => {

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        startOpening();
      }

    });

    // ==========================================
    // 9. Continue to the website
    // ==========================================

    let invitationDismissed = false;
    let lastTapTime = 0;

    function continueToWebsite(force = false) {

      // Normal single taps only work once fully open.
      // Double taps can bypass the animation.
      if ((!invitationFullyOpen && !force) || invitationDismissed) {
        return;
      }

      invitationDismissed = true;

      root.classList.add("is-dismissed");
      root.setAttribute("aria-hidden", "true");

      window.setTimeout(() => {
        root.remove();
      }, 1250);
    }

    // Detect double taps/clicks anywhere on the overlay.
    root.addEventListener("click", (event) => {

      const now = Date.now();
      const DOUBLE_TAP_DELAY = 450;

      if (now - lastTapTime < DOUBLE_TAP_DELAY) {
        event.preventDefault();
        event.stopPropagation();

        continueToWebsite(true);
        return;
      }

      lastTapTime = now;

      // A normal single tap continues once the invitation is fully open.
      continueToWebsite();

    });

    // Keep the button working too.
    continueButton.addEventListener("click", (event) => {
      event.stopPropagation();
      continueToWebsite();
    });

  } catch (error) {

    console.error("Could not initialise wedding invitation:", error);

    /*
     * Leave the overlay white if loading fails.
     * Do not reveal an invitation with missing data.
     */
  }

})();
