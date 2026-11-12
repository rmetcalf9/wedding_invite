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

  let midi = null;
  let midiDurationSeconds = 0;

  let audioCtx = null;
  let masterGain = null;

  let started = false;
  let autoplayBlocked = false;

  let scheduledTimeout = null;

  const scheduledNoteStops = [];

  let applyGain = (muted) => {
    // If context isn't ready yet, we'll store desired state.
    if (!masterGain) return;
    masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
    if (!muted) {
      masterGain.gain.linearRampToValueAtTime(volumeWhenUnmuted, audioCtx.currentTime + 0.03);
    }
  };

  let muted = Boolean(mutedInitially);

  function ensureAudioGraph() {
    if (audioCtx) return;

    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();

    masterGain = audioCtx.createGain();
    masterGain.gain.value = muted ? 0 : volumeWhenUnmuted;
    masterGain.connect(audioCtx.destination);
  }

  async function loadMidi() {
    if (midi) return;

    // Load MIDI parser (ESM) from CDN.
    // We intentionally use a dynamic import so it only happens if/when music is initialized.
    const mod = await import('https://cdn.jsdelivr.net/npm/@tonejs/midi@2.0.28/+esm');
    const Midi = mod.Midi;

    const res = await fetch(src);
    if (!res.ok) {
      throw new Error(`Failed to fetch MIDI: ${res.status} ${res.statusText}`);
    }

    const buf = await res.arrayBuffer();
    midi = new Midi(buf);
    midiDurationSeconds = Number(midi.duration || 0);
  }

  function midiNoteToFreq(noteNumber) {
    return 440 * Math.pow(2, (noteNumber - 69) / 12);
  }

  function allNotes() {
    if (!midi) return [];
    // @tonejs/midi represents notes in tracks.
    return midi.tracks.flatMap((t) => t.notes || []);
  }

  function scheduleOnce(startAtSeconds) {
    if (!audioCtx || !masterGain || !midi) return;

    const notes = allNotes();
    const now = audioCtx.currentTime;

    // Safety: don't schedule in the far past.
    const base = Math.max(startAtSeconds, now + 0.01);

    for (const n of notes) {
      const t0 = base + n.time;
      const t1 = t0 + Math.max(0.01, n.duration || 0.3);

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(midiNoteToFreq(n.midi), t0);

      // Envelope to avoid clicks.
      const attack = 0.005;
      const release = 0.03;
      const peak = Math.min(0.9, (n.velocity ?? 0.8));

      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(peak, t0 + attack);
      gain.gain.setValueAtTime(peak, Math.max(t0 + attack, t1 - release));
      gain.gain.linearRampToValueAtTime(0, t1);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(t0);
      osc.stop(t1 + 0.05);

      // Track stop callbacks (for potential cleanup)
      scheduledNoteStops.push({ osc, t1 });
    }
  }

  function clearLoopTimeout() {
    if (scheduledTimeout) {
      clearTimeout(scheduledTimeout);
      scheduledTimeout = null;
    }
  }

  async function startPlayback() {
    if (started) return;
    started = true;

    ensureAudioGraph();

    // Some browsers keep the context suspended until a gesture.
    try {
      await audioCtx.resume();
    } catch {
      // ignore
    }

    applyGain(muted);

    await loadMidi();

    const startAt = audioCtx.currentTime + 0.05;
    scheduleOnce(startAt);

    if (loop && midiDurationSeconds > 0) {
      clearLoopTimeout();
      const periodMs = Math.max(1000, midiDurationSeconds * 1000);
      // Reschedule slightly after each loop boundary.
      scheduledTimeout = setTimeout(function tick() {
        if (!started) return;
        if (muted) {
          // Still schedule so it stays in sync.
          applyGain(true);
        } else {
          applyGain(false);
        }
        const startAgain = audioCtx.currentTime + 0.05;
        scheduleOnce(startAgain);
        scheduledTimeout = setTimeout(tick, periodMs);
      }, periodMs + 50);
    }
  }

  async function playIfNeeded() {
    try {
      await startPlayback();
    } catch (err) {
      // If autoplay policy blocks resuming the context.
      autoplayBlocked = true;
      console.info('[music-player] Playback blocked; waiting for user gesture.', err?.name || err);
      // We'll rely on user interaction for starting.
    }
  }

  function installOneTimeUserGesture() {
    if (installOneTimeUserGesture._installed) return;
    installOneTimeUserGesture._installed = true;

    const start = async () => {
      try {
        await playIfNeeded();
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

  // Attempt to start immediately, but many browsers will require interaction.
  void (async () => {
    try {
      await playIfNeeded();
    } catch (err) {
      // ignore; gesture handler will take over
      autoplayBlocked = true;
    }
    if (autoplayBlocked) installOneTimeUserGesture();
  })();

  function setMuted(nextMuted) {
    muted = Boolean(nextMuted);
    if (!masterGain || !audioCtx) return;
    applyGain(muted);
  }

  function toggleMuted() {
    setMuted(!muted);
    // If user is unmuting and playback hasn't started yet, try to start.
    if (!muted) {
      void playIfNeeded();
    }
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
