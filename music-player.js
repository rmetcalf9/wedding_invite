export function initMusicPlayer({
  src,
  mutedInitially = false,
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

  const MIDI_AUDIO_PLAYER_URL =
    'https://cdn.jsdelivr.net/npm/midi-audio-player/dist/midi-audio-player.min.js';

  function applyVolume(overrideVolume) {
    if (!player) return;

    const v =
      typeof overrideVolume === 'number'
        ? overrideVolume
        : muted
          ? 0
          : volumeWhenUnmuted;

    try {
      if (typeof player.setVolume === 'function') player.setVolume(v);
      else player.volume = v;
    } catch {
      // ignore
    }
  }

  function getMidiAudioPlayerCtor() {
    return window.MidiAudioPlayer?.default ?? window.MidiAudioPlayer;
  }

  function loadMidiAudioPlayerLib() {
    if (player) return Promise.resolve();
    if (libLoading) return libLoading;

    libLoading = new Promise((resolve, reject) => {
      // If already present, resolve immediately.
      if (window.MidiAudioPlayer || window.MidiAudioPlayer?.default) {
        resolve();
        return;
      }

      const s = document.createElement('script');
      s.src = MIDI_AUDIO_PLAYER_URL;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () =>
        reject(
          new Error(`Failed to load midi-audio-player from ${MIDI_AUDIO_PLAYER_URL}`),
        );
      document.head.appendChild(s);
    });

    return libLoading;
  }

  async function startPlayback() {
    // Must be called from a user gesture.
    await loadMidiAudioPlayerLib();

    if (!player) {
      const MidiAudioPlayer = getMidiAudioPlayerCtor();
      if (!MidiAudioPlayer) {
        throw new Error(
          'MidiAudioPlayer constructor not found on window after loading',
        );
      }
      player = new MidiAudioPlayer({ volume: volumeWhenUnmuted });
    }

    if (!playerConfigured) {
      playerConfigured = true;
      try {
        if (typeof player.on === 'function' && loop) {
          player.on('endOfFile', () => {
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

    // If we already started, just apply volume and return.
    if (playbackStarted) {
      applyVolume();
      return;
    }

    // If currently muted, set a *tiny* volume briefly before play() so the
    // underlying audio graph actually gets activated.
    if (muted) {
      const tiny = Math.min(0.02, Math.max(0.001, volumeWhenUnmuted * 0.02));
      applyVolume(tiny);
    } else {
      applyVolume();
    }

    await player.play(src);

    playbackStarted = true;

    // Finally apply the intended mute volume.
    applyVolume();
  }

  function setMuted(nextMuted) {
    muted = Boolean(nextMuted);
    applyVolume();

    // If unmuted before playback has started, attempt to start.
    if (!muted && !playbackStarted) {
      // Typically called from a user gesture (sound button click), but
      // we still guard by not awaiting.
      void startPlayback().catch(() => {});
    }
  }

  function toggleMuted() {
    setMuted(!muted);
  }

  function playIfNeeded() {
    // Invitation.js will call this from the envelope gesture.
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
