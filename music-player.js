export function initMusicPlayer({
  src,
  mutedInitially = true,
  loop = true,
  volumeWhenUnmuted = 0.8
} = {}) {
  if (!src) {
    console.warn('[music-player] No src provided');
    return {
      get muted() {
        return true;
      },
      setMuted() {},
      toggleMuted() {},
      playIfNeeded() {},
    };
  }

  let audioEl = document.getElementById('bg-music');
  if (!audioEl) {
    audioEl = document.createElement('audio');
    audioEl.id = 'bg-music';
    audioEl.preload = 'auto';
    audioEl.loop = Boolean(loop);
    audioEl.src = src;
    audioEl.playsInline = true;
    audioEl.style.display = 'none';
    document.body.appendChild(audioEl);
  }

  audioEl.loop = Boolean(loop);

  function applyMuted(muted) {
    audioEl.muted = Boolean(muted);
    audioEl.volume = audioEl.muted ? 0 : volumeWhenUnmuted;
  }

  applyMuted(mutedInitially);

  let started = false;
  let autoplayBlocked = false;

  function tryPlay() {
    if (started) return Promise.resolve();

    const p = audioEl.play();
    if (p && typeof p.then === 'function') {
      return p
        .then(() => {
          started = true;
        })
        .catch((err) => {
          autoplayBlocked = true;
          // Likely autoplay policy. Don't spam console on every attempt.
          // We'll start on the first user gesture instead.
          console.info('[music-player] Autoplay blocked; waiting for user gesture.', err?.name || err);
        });
    }

    // Older browsers: best effort.
    return Promise.resolve().then(() => {
      started = true;
    });
  }

  function installOneTimeUserGestureToStart() {
    if (installOneTimeUserGestureToStart._installed) return;
    installOneTimeUserGestureToStart._installed = true;

    const start = async () => {
      try {
        audioEl.muted = audioEl.muted; // ensure property is set
        await tryPlay();
      } finally {
        window.removeEventListener('pointerdown', start, true);
        window.removeEventListener('touchstart', start, true);
        window.removeEventListener('keydown', start, true);
        window.removeEventListener('click', start, true);
      }
    };

    window.addEventListener('pointerdown', start, true);
    window.addEventListener('touchstart', start, true);
    window.addEventListener('keydown', start, true);
    window.addEventListener('click', start, true);
  }

  // Attempt autoplay when metadata is ready (more reliable than immediate play()).
  const onCanPlay = () => {
    void tryPlay();
    if (autoplayBlocked) installOneTimeUserGestureToStart();
    audioEl.removeEventListener('canplay', onCanPlay);
    audioEl.removeEventListener('loadedmetadata', onCanPlay);
  };

  audioEl.addEventListener('canplay', onCanPlay, { once: true });
  audioEl.addEventListener('loadedmetadata', onCanPlay, { once: true });

  // Fallback: also try soon after load.
  setTimeout(() => {
    if (!started) {
      void tryPlay().then(() => {
        if (autoplayBlocked) installOneTimeUserGestureToStart();
      });
    }
  }, 400);

  function setMuted(muted) {
    applyMuted(muted);
    // If user unmuted via toggle, many browsers require a user gesture; we call play
    // only during toggle click (user gesture). So here we just update state.
  }

  function toggleMuted() {
    const nextMuted = !audioEl.muted;
    setMuted(nextMuted);
    // Called from a click handler, so it's safe to try starting audio here.
    if (!audioEl.muted) {
      void tryPlay();
    }
  }

  async function playIfNeeded() {
    await tryPlay();
    if (autoplayBlocked) installOneTimeUserGestureToStart();
  }

  return {
    el: audioEl,
    get muted() {
      return audioEl.muted;
    },
    setMuted,
    toggleMuted,
    playIfNeeded,
  };
}
