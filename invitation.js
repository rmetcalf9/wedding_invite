
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

  // Original animation durations, in milliseconds
  const FLIP_TIME = 950;
  const FLAP_TIME = 650;
  const PAPER_TIME = 950;

  // Apply the speed multiplier
  const flipDuration = FLIP_TIME * ANIMATION_SPEED;
  const flapDuration = FLAP_TIME * ANIMATION_SPEED;
  const paperDuration = PAPER_TIME * ANIMATION_SPEED;

  const root = document.getElementById("wedding-invitation");

  if (!root) {
    console.error("Wedding invitation root element was not found.");
    return;
  }

  const scriptUrl = document.currentScript.src;
  const baseUrl = new URL(".", scriptUrl);

  try {

    // Load the invitation stylesheet
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL("invitation.css", baseUrl).href;

    await new Promise((resolve, reject) => {
      stylesheet.onload = resolve;
      stylesheet.onerror = reject;
      document.head.appendChild(stylesheet);
    });

    // Set animation durations in the CSS
    root.style.setProperty("--flip-duration", `${flipDuration}ms`);
    root.style.setProperty("--flap-duration", `${flapDuration}ms`);
    root.style.setProperty("--paper-duration", `${paperDuration}ms`);

    // Load invitation markup
    const response = await fetch(
      new URL("invitation.html", baseUrl).href
    );

    if (!response.ok) {
      throw new Error(
        `Could not load invitation.html: ${response.status}`
      );
    }

    root.innerHTML = await response.text();

    const scene = root.querySelector("#invitation-scene");
    const envelope = root.querySelector("#envelope-open");
    const continueButton = root.querySelector("#invitation-continue");

    if (!scene || !envelope || !continueButton) {
      throw new Error("One or more invitation elements could not be found.");
    }

    let openingStarted = false;

    // ==========================================
    // OPENING SEQUENCE
    // ==========================================

    function startOpening() {

      // Prevent repeated clicks
      if (openingStarted) {
        return;
      }

      openingStarted = true;

      // Stage 1: flip the envelope to reveal the back
      scene.classList.add("is-flipping");

      // Stage 2: open the triangular flap
      window.setTimeout(() => {
        scene.classList.add("is-flap-opening");
      }, flipDuration);

      // Stage 3: slide the paper out of the envelope
      window.setTimeout(() => {
        scene.classList.add("is-revealing");
      }, flipDuration + flapDuration);
    }

    // Mouse and touch
    envelope.addEventListener("click", startOpening);

    // Keyboard accessibility
    envelope.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        startOpening();
      }
    });

    // ==========================================
    // DISMISS INVITATION
    // ==========================================

    continueButton.addEventListener("click", (event) => {
      event.stopPropagation();

      root.classList.add("is-dismissed");
      root.setAttribute("aria-hidden", "true");

      window.setTimeout(() => {
        root.remove();
      }, 1250);
    });

  } catch (error) {

    console.error("Could not initialise wedding invitation:", error);

    // Never leave visitors stuck on a white screen
    root.remove();
  }

})();
