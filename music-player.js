export function initMusicPlayer({
  src,
  mutedInitially = true,
  loop = true,
  volumeWhenUnmuted = 0.8
} = {}) {
  if (!src) {
    console.warn('[music-player] No src provided');
    return {
      get muted() { return true; },
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
    if (audioEl.muted) {
      audioEl.volume = 0;
    } else {
      audioEl.volume = volumeWhenUnmuted;
    }
  }

  applyMuted(mutedInitially);

  async function playIfNeeded() {
    try {
      // Some browsers require a muted state for autoplay.
      const p = audioEl.play();
      if (p && typeof p.then === 'function') await p;
    } catch (err) {
      // Autoplay may be blocked until user interaction.
      // We'll still keep the button working to unmute/play.
      console.info('[music-player] play() blocked or failed; will retry on user gesture.', err);
    }
  }

  // Attempt to start on page load.
  // If it fails due to autoplay policy, user can click the icon to start.
  void playIfNeeded();

  function setMuted(muted) {
    applyMuted(muted);
  }

  function toggleMuted() {
    setMuted(!audioEl.muted);
    // If unmuting, retry play with user gesture.
    if (!audioEl.muted) void playIfNeeded();
  }

  return {
    el: audioEl,
    get muted() {
      return audioEl.muted;
    },
    setMuted,
    toggleMuted,
    playIfNeeded
  };
}
