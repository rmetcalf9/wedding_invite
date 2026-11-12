export function initSoundToggle(musicApi) {
  if (!musicApi) return;

  const existing = document.getElementById('sound-toggle');
  const btn = existing || document.createElement('button');
  btn.id = 'sound-toggle';

  // If we created it, mark up content.
  if (!existing) {
    btn.type = 'button';
    btn.className = 'sound-toggle';
    btn.setAttribute('aria-label', 'Mute music');

    const label = document.createElement('span');
    label.className = 'sound-toggle-icon';
    label.textContent = '🔇';

    btn.appendChild(label);
    document.body.appendChild(btn);
  }

  function render() {
    const icon = btn.querySelector('.sound-toggle-icon');
    const isMuted = musicApi.muted;
    if (icon) icon.textContent = isMuted ? '🔇' : '🔊';
    btn.setAttribute('aria-label', isMuted ? 'Unmute music' : 'Mute music');
    btn.dataset.state = isMuted ? 'muted' : 'playing';
  }

  btn.addEventListener('click', () => {
    musicApi.toggleMuted();
    render();
  });

  // Initial render.
  render();
}
