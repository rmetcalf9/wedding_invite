export function initMusicPlayer({
  src,
  mutedInitially = true,
  loop = true,
  volumeWhenUnmuted = 0.8
} = {}) {
  const DEBUG_MUSIC = true;
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

  let midi = null;
  let midiDurationSeconds = 0;

  let audioCtx = null;
  let masterGain = null;

  let started = false;

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

    dbg('Loading MIDI', { src });

    // Load MIDI parser (ESM) from CDN.
    const mod = await import('https://cdn.jsdelivr.net/npm/@tonejs/midi@2.0.28/+esm');
    const Midi = mod.Midi;
    dbg('Loaded @tonejs/midi');

    const res = await fetch(src);
    dbg('Fetched MIDI', { ok: res.ok, status: res.status, contentLength: res.headers.get('content-length') });
    if (!res.ok) {
      throw new Error(`Failed to fetch MIDI: ${res.status} ${res.statusText}`);
    }

    const buf = await res.arrayBuffer();
    midi = new Midi(buf);
    midiDurationSeconds = Number(midi.duration || 0);

    const tracksCount = Array.isArray(midi.tracks) ? midi.tracks.length : 0;
    const notesCount = allNotes().length;
    dbg('Parsed MIDI', { midiDurationSeconds, tracksCount, notesCount });
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

    const base = Math.max(startAtSeconds, now + 0.01);

    const sample = notes[0];
    dbg('Scheduling notes', {
      noteCount: notes.length,
      base,
      startAtSeconds,
      now,
      muted,
      sample: sample
        ? {
            midi: sample.midi,
            noteNumber: sample.noteNumber,
            time: sample.time,
            duration: sample.duration,
            velocity: sample.velocity,
          }
        : null,
    });

    let midiMin = Infinity;
    let midiMax = -Infinity;

    for (const n of notes) {
      const midiNumber =
        (typeof n.midi === 'number' ? n.midi : null) ??
        (typeof n.noteNumber === 'number' ? n.noteNumber : null);

      if (typeof midiNumber !== 'number' || !Number.isFinite(midiNumber)) continue;

      midiMin = Math.min(midiMin, midiNumber);
      midiMax = Math.max(midiMax, midiNumber);

      const t0 = base + n.time;
      const t1 = t0 + Math.max(0.01, n.duration || 0.3);

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(midiNoteToFreq(midiNumber), t0);

      // Envelope to avoid clicks.
      const attack = 0.005;
      const release = 0.03;
      const peak = Math.min(1.2, (n.velocity ?? 0.8) * 1.1);

      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(peak, t0 + attack);
      gain.gain.setValueAtTime(peak, Math.max(t0 + attack, t1 - release));
      gain.gain.linearRampToValueAtTime(0, t1);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(t0);
      osc.stop(t1 + 0.05);

      scheduledNoteStops.push({ osc, t1 });
    }

    if (midiMin !== Infinity) {
      dbg('MIDI range in notes', { midiMin, midiMax });
    } else {
      dbg('No valid MIDI noteNumber found in notes');
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

    dbg('startPlayback: initial audioCtx state', audioCtx?.state);

    // Some browsers keep the context suspended until a gesture.
    try {
      await audioCtx.resume();
      dbg('startPlayback: audioCtx resumed', audioCtx?.state);
    } catch (err) {
      dbg('startPlayback: audioCtx.resume() failed', err?.name || err);
    }

    applyGain(muted);

    await loadMidi();

    dbg('startPlayback: before scheduling', {
      audioCtxState: audioCtx?.state,
      audioCtxCurrentTime: audioCtx?.currentTime,
      muted,
      midiDurationSeconds,
    });

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
      // Autoplay policy can prevent starting on load; we'll start on first user gesture.
      console.info('[music-player] Playback blocked; waiting for user gesture.', err?.name || err);
      // We'll rely on user gesture to call playIfNeeded.
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


  // Start playback the first time the user interacts with the page.
  installOneTimeUserGesture();

  function setMuted(nextMuted) {
    muted = Boolean(nextMuted);
    dbg('setMuted', { muted });
    if (!masterGain || !audioCtx) return;
    applyGain(muted);
    dbg('setMuted applied', {
      audioCtxState: audioCtx.state,
      currentGain: masterGain.gain.value,
    });
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
