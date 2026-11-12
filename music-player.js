export function initMusicPlayer({
  src,
  mutedInitially = true,
  loop = true,
  volumeWhenUnmuted = 0.8,
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

  let muted = Boolean(mutedInitially);
  let player = null;
  let libLoading = null;
  let playerConfigured = false;
  let playbackStarted = false;

  async function loadMidiAudioPlayerLib() {
    if (player || libLoading) return libLoading;

    const url =
      'https://cdn.jsdelivr.net/npm/midi-audio-player/dist/midi-audio-player.min.js';

    libLoading = new Promise((resolve, reject) => {
      // If already present, resolve immediately.
      if (window.MidiAudioPlayer || window.MidiAudioPlayer?.default) {
        resolve();
        return;
      }

      const s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () =>
        reject(new Error(`Failed to load midi-audio-player from ${url}`));
      document.head.appendChild(s);
    });

    return libLoading;
  }

  function getMidiAudioPlayerCtor() {
    return window.MidiAudioPlayer?.default ?? window.MidiAudioPlayer;
  }

  function applyVolume() {
    if (!player) return;
    const v = muted ? 0 : volumeWhenUnmuted;
    try {
      if (typeof player.setVolume === 'function') player.setVolume(v);
      else player.volume = v;
    } catch {
      // ignore
    }
  }

  async function startPlayback() {
    // Called from a user gesture (envelope click / sound button click).
    // If we've already started playback once, just re-apply volume.
    if (playbackStarted && player) {
      applyVolume();
      return;
    }

    await loadMidiAudioPlayerLib();

    const MidiAudioPlayer = getMidiAudioPlayerCtor();
    if (!MidiAudioPlayer) {
      throw new Error(
        'MidiAudioPlayer constructor not found on window after loading',
      );
    }

    if (!player) {
      player = new MidiAudioPlayer({ volume: volumeWhenUnmuted });
    }

    if (!playerConfigured) {
      playerConfigured = true;
      try {
        if (typeof player.on === 'function' && loop) {
          player.on('endOfFile', () => {
            // Loop restart.
            try {
              void player.play(src);
            } catch {
              // ignore
            }
          });
        }
      } catch {
        // ignore
      }
    }

    // Even if muted, we start to unlock WebAudio on mobile/Chrome.
    applyVolume();

    await player.play(src);
    playbackStarted = true;
  }

  function setMuted(nextMuted) {
    muted = Boolean(nextMuted);
    applyVolume();

    // If unmuting, attempt to start (we're typically inside a user gesture already).
    if (!muted) {
      void startPlayback().catch(() => {
        // ignore (user gesture may have been insufficient)
      });
    }
  }

  function toggleMuted() {
    setMuted(!muted);
  }

  function playIfNeeded() {
    // Invitation.js will call this from the *first* envelope click.
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
