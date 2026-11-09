/* Wedding invite fullpage implementation (vanilla fullpage API)
   Fix: avoid jQuery plugin usage ($().fullpage), which may not be available on production.
*/

const state = {
  venues: [
    {
      id: 'ceremony',
      name: 'Ceremony Venue',
      meta: '[Time] • [Day]',
      address: '[Full address]',
      description: 'Add a short description (arrival time, doors open, ceremony start).',
      mapsUrl: 'https://www.google.com/maps?q=51.5074,-0.1278',
      coords: null
    },
    {
      id: 'reception',
      name: 'Reception Venue',
      meta: '[Time] • [Day]',
      address: '[Full address]',
      description: 'Add reception details (drinks, meal, parking, etc.).',
      mapsUrl: 'https://www.google.com/maps?q=51.515,-0.09',
      coords: null
    }
  ],
  backgrounds: {
    intro: 'https://source.unsplash.com/1920x1080/?wedding,flowers',
    cover: 'https://source.unsplash.com/1920x1080/?wedding,rings',
    venues: 'https://source.unsplash.com/1920x1080/?wedding,venue',
    rsvp: 'https://source.unsplash.com/1920x1080/?wedding,champagne',
    faq: 'https://source.unsplash.com/1920x1080/?wedding,romantic'
  }
};

let fp = null;
let lastSubmitted = null;

function setBackgrounds(){
  const anchors = ['intro','cover','venues','rsvp','faq'];
  for (const a of anchors){
    const section = document.querySelector(`[data-anchor="${a}"]`);
    const bg = section?.querySelector('.bg');
    if (section && bg){
      const url = state.backgrounds[a];
      bg.style.setProperty('--bg-image', `url('${url}')`);
      bg.style.backgroundImage = `url('${url}')`;
    }
  }
}

function osmEmbedUrl({lat,lng}){
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01}%2C${lat-0.01}%2C${lng+0.01}%2C${lat+0.01}&layer=mapnik&marker=${lat}%2C${lng}`;
}

function openMapLabelForVenue(v){
  return v.mapsUrl ? 'Open map' : 'Maps unavailable';
}

function renderVenues(){
  const grid = document.getElementById('venuesGrid');
  if (!grid) return;
  grid.innerHTML = '';

  for (const v of state.venues){
    const card = document.createElement('article');
    card.className = 'venueCard';

    const h = document.createElement('h3');
    h.textContent = v.name;

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = v.meta || '';

    const desc = document.createElement('p');
    desc.className = 'desc';
    desc.textContent = v.description || '';

    const actions = document.createElement('div');
    actions.className = 'venueActions';

    const mapBtn = document.createElement('a');
    mapBtn.className = 'primary';
    mapBtn.href = v.mapsUrl || '#';
    mapBtn.target = '_blank';
    mapBtn.rel = 'noopener noreferrer';
    mapBtn.style.padding = '10px 14px';
    mapBtn.style.textDecoration = 'none';
    mapBtn.style.display = 'inline-flex';
    mapBtn.style.alignItems = 'center';
    mapBtn.style.gap = '10px';
    mapBtn.textContent = openMapLabelForVenue(v);

    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = `📍 ${v.address || ''}`;

    actions.appendChild(mapBtn);
    actions.appendChild(chip);

    card.appendChild(h);
    card.appendChild(meta);
    card.appendChild(desc);
    card.appendChild(actions);

    if (v.coords && typeof v.coords.lat === 'number' && typeof v.coords.lng === 'number'){
      const frame = document.createElement('iframe');
      frame.className = 'mapFrame';
      frame.src = osmEmbedUrl(v.coords);
      frame.loading = 'lazy';
      frame.title = `${v.name} map`;
      card.appendChild(frame);
    }

    grid.appendChild(card);
  }
}

function showStatus(msg, kind='info'){
  const el = document.getElementById('formStatus');
  if (!el) return;
  el.textContent = msg;
  el.style.color = kind === 'error' ? '#dc2626' : (kind === 'success' ? '#16a34a' : '#6b7280');
}

function validateEmail(email){
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatISODate(d){
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function loadRsvps(){
  const key = 'wedding_rsvps_v1';
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  }catch{
    return [];
  }
}

function saveRsvps(entries){
  localStorage.setItem('wedding_rsvps_v1', JSON.stringify(entries));
}

function buildDownloadPayload(rsvp){
  return JSON.stringify({
    submittedAt: rsvp.submittedAt,
    guestName: rsvp.guestName,
    guestEmail: rsvp.guestEmail || null,
    attendance: rsvp.attendance,
    notes: rsvp.notes || null
  }, null, 2);
}

function downloadText(filename, text){
  const blob = new Blob([text], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  setBackgrounds();
  renderVenues();

  // fullpage.js instance (vanilla)
  if (typeof window.fullpage !== 'function'){
    console.error('fullpage constructor not found. fullpage.js may not be loading.');
    return;
  }

  fp = new window.fullpage('#fullpage', {
    autoScrolling: true,
    fitToSection: true,
    scrollHorizontally: false,
    scrollOverflow: true,
    keyboardScrolling: true,

    navigation: false,
    anchors: ['intro','cover','venues','rsvp','faq'],

    afterLoad: function(){
      if (!document.body.classList.contains('fp-opened')){
        fp.setAllowScrolling(false);
        fp.setKeyboardScrolling(false);
      }
    }
  });

  // Start locked
  fp.setAllowScrolling(false);
  fp.setKeyboardScrolling(false);

  // Envelope open + navigation
  const openBtn = document.getElementById('openBtn');
  const exploreBtn = document.getElementById('exploreBtn');
  const rsvpBtn = document.getElementById('rsvpBtn');

  const open = () => {
    if (document.body.classList.contains('fp-opened')) return;
    document.body.classList.add('fp-opened');

    fp.setAllowScrolling(true);
    fp.setKeyboardScrolling(true);
    fp.moveTo(2); // cover
  };

  openBtn?.addEventListener('click', open);

  exploreBtn?.addEventListener('click', () => fp.moveTo(3));
  rsvpBtn?.addEventListener('click', () => fp.moveTo(4));

  // RSVP handling
  const form = document.getElementById('rsvpForm');
  if (form){
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const guestName = document.getElementById('guestName')?.value?.trim();
      const guestEmail = document.getElementById('guestEmail')?.value?.trim();
      const attendance = form.querySelector('input[name="attendance"]:checked')?.value;
      const guestNotes = document.getElementById('notes')?.value?.trim();

      if (!guestName){
        showStatus('Please enter your name.', 'error');
        document.getElementById('guestName')?.focus();
        return;
      }
      if (!attendance){
        showStatus('Please select your attendance.', 'error');
        return;
      }
      if (!validateEmail(guestEmail)){
        showStatus('That email doesn’t look right — or leave it blank.', 'error');
        document.getElementById('guestEmail')?.focus();
        return;
      }

      const rsvp = {
        submittedAt: formatISODate(new Date()),
        guestName,
        guestEmail: guestEmail || null,
        attendance,
        notes: guestNotes || null
      };

      const entries = loadRsvps();
      entries.unshift(rsvp);
      saveRsvps(entries.slice(0, 50));
      lastSubmitted = rsvp;

      showStatus('Thanks! RSVP saved on this device (demo).', 'success');
    });
  }
});
