import { initMidiPlayer } from './music-player-midi.js';
import { initWavPlayer } from './music-player-wav.js';

function getSrcExt(src) {
  if (!src || typeof src !== 'string') return '';
  // Strip query/hash if present.
  const clean = src.split('?')[0].split('#')[0];
  const parts = clean.split('.');
  return (parts[parts.length - 1] || '').toLowerCase();
}

export function initMusicPlayer(opts = {}) {
  const src = opts?.src;
  const ext = getSrcExt(src);

  const midiExts = new Set(['mid', 'midi']);
  const audioExts = new Set(['wav', 'mp3', 'ogg', 'm4a', 'aac', 'flac', 'aiff']);

  if (midiExts.has(ext)) {
    return initMidiPlayer(opts);
  }

  if (audioExts.has(ext)) {
    return initWavPlayer(opts);
  }

  // Fallback: try MIDI behaviour (keeps backward compatibility if extension
  // is missing but file is actually MIDI).
  console.warn(
    `[music-player] Unknown src extension "${ext}" for src="${src}". Falling back to MIDI player.`,
  );
  return initMidiPlayer(opts);
}
