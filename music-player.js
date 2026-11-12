export function initMusicPlayer({
  src,
  mutedInitially = true,
  loop = true,
  volumeWhenUnmuted = 0.8,
} = {}) {
  const DEBUG_MUSIC = false;
  const dbg = (msg, extra) => {
    if (!DEBUG_MUSIC) return;
    try {
      // eslint-disable-next-line no-console
      console.log(`[music-player] ${msg}`, extra ?? '');
    } catch {
      // ignore
    }
  };

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

  async function loadMidiAudioPlayerLib() {
    if (player || libLoading) return libLoading;

    // UMD build. We load it on demand after a user gesture.
    const url = 'https://cdn.jsdelivr.net/npm/midi-audio-player/dist/midi-audio-player.min.js';

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
      s.onerror = () => reject(new Error(`Failed to load MidiAudioPlayer library from ${url}`));

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
      // Some versions use setVolume, others may read/write a volume property.
      if (typeof player.setVolume === 'function') player.setVolume(v);
      else player.volume = v;
    } catch (e) {
      dbg('applyVolume failed', e?.name || e);
    }
  }

  async function startPlayback() {
    if (muted) {
      // If user is muted, do not start playback/audio.
      return;
    }

    // Create player only after a user gesture to satisfy Chrome's WebAudio autoplay rules.
    await loadMidiAudioPlayerLib();

    if (!player) {
      const MidiAudioPlayer = getMidiAudioPlayerCtor();
      if (!MidiAudioPlayer) {
        throw new Error('MidiAudioPlayer constructor not found on window after loading');
      }

      // Keep options minimal for compatibility.
      player = new MidiAudioPlayer({ volume: volumeWhenUnmuted });
    }

    if (!playerConfigured) {
      playerConfigured = true;

      // Attempt loop support.
      try {
        if (typeof player.on === 'function') {
          player.on('endOfFile', () => {
            if (!loop) return;
            try {
              void player.play(src);
            } catch (e) {
              dbg('loop restart failed', e?.name || e);
            }
          });
        }
      } catch {
        // ignore
      }
    }

    applyVolume();

    dbg('starting playback', { src });
    await player.play(src);
    dbg('play() resolved');
  }

  function installOneTimeUserGesture() {
    if (installOneTimeUserGesture._installed) return;
    installOneTimeUserGesture._installed = true;

    const start = async () => {
      try {
        await startPlayback();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.info('[music-player] startPlayback blocked/failed', e?.name || e);
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

  // We only start on user gesture (and only if unmuted).
  installOneTimeUserGesture();

  function setMuted(nextMuted) {
    muted = Boolean(nextMuted);
    dbg('setMuted', { muted });
    applyVolume();

    // If the user just unmuted, start immediately (we're still in a user gesture handler).
    if (!muted) {
      void startPlayback().catch((e) => {
        // eslint-disable-next-line no-console
        console.info('[music-player] start after unmute failed', e?.name || e);
      });
    }
  }

  function toggleMuted() {
    setMuted(!muted);
  }

  function playIfNeeded() {
    // Used by sound-toggle; we rely on gesture-based activation.
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
