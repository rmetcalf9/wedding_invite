export function initWavPlayer({
  src,
  mutedInitially = false,
  loop = true,
  volumeWhenUnmuted = 0.8,
} = {}) {
  if (!src) {
    console.warn('[music-player-wav] No src provided');
    return {
      get muted() {
        return true;
      },
      setMuted() {},
      toggleMuted() {},
      playIfNeeded() {},
    };
  }

  let muted = Boolean(mutedInitially);
  let audio = null;
  let playbackStarted = false;

  function applyVolume(overrideVolume) {
    if (!audio) return;
    const v =
      typeof overrideVolume === 'number'
        ? overrideVolume
        : muted
          ? 0
          : volumeWhenUnmuted;
    try {
      audio.volume = v;
    } catch {
      // ignore
    }
  }

  function ensureAudio() {
    if (audio) return;
    audio = new Audio(src);
    audio.loop = Boolean(loop);
    audio.preload = 'auto';

    // Do not try to play here. Only set volume.
    applyVolume();
  }

  async function startPlayback() {
    // Must be called from a user gesture.
    ensureAudio();

    if (playbackStarted) {
      applyVolume();
      return;
    }

    if (muted) {
      const tiny = Math.min(0.02, Math.max(0.001, volumeWhenUnmuted * 0.02));
      applyVolume(tiny);
    } else {
      applyVolume();
    }

    try {
      await audio.play();
      playbackStarted = true;
      applyVolume();
    } catch (err) {
      console.warn('[music-player-wav] play() blocked/rejected', err);
      playbackStarted = false;
      throw err;
    }
  }

  function setMuted(nextMuted) {
    muted = Boolean(nextMuted);
    applyVolume();

    if (!muted && !playbackStarted) {
      void startPlayback().catch(() => {});
    }
  }

  function toggleMuted() {
    setMuted(!muted);
  }

  function playIfNeeded() {
    return startPlayback();
  }

  return {
    el: null,
    get muted() {
      return muted;
    },
    setMuted,
    toggleMuted,
    playIfNeeded,
  };
}
