/* Fullpage + invitation logic */

const state = {
  venues: [
    {
      id: 'ceremony',
      name: 'Ceremony Venue',
      meta: '[Time] • [Day]',
      address: '[Full address]',
      description: 'Add a short description (arrival time, doors open, ceremony start).',
      mapsUrl: 'https://www.google.com/maps?q=51.5074,-0.1278',
      coords: null // { lat: 51.5074, lng: -0.1278 }
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

const $ = window.jQuery;
let fp = null;
let lastSubmitted = null;

function setBackgrounds(){
  const anchors = ['intro','cover','venues','rsvp','faq'];
  for (const a of anchors){
    const section = document.querySelector(`[data-anchor="${a}"]`);
    const bg = section?.querySelector('.bg');
    if (section && bg){
      bg.style.setProperty('--bg-image', `url('${state.backgrounds[a]}')`);
      // also set as background-image for safety
      bg.style.backgroundImage = `url('${state.backgrounds[a]}')`;
    }
  }
}

function osmEmbedUrl({lat, lng}){
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
    mapBtn.style.padding = '10px 14px';
    mapBtn.style.textDecoration = 'none';
    mapBtn.style.display = 'inline-flex';
    mapBtn.style.alignItems = 'center';
    mapBtn.style.gap = '10px';
    mapBtn.href = v.mapsUrl || '#';
    mapBtn.target = '_blank';
    mapBtn.rel = 'noopener noreferrer';
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
  const key = 'wedding_rsvps_v1';
  localStorage.setItem(key, JSON.stringify(entries));
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year') && (document.getElementById('year').textContent = String(new Date().getFullYear()));

  setBackgrounds();
  renderVenues();

  // Initialize fullpage after deps are ready
  if (!window.fullpage_api){
    // no-op
  }

  // fullpage_api set via callback below
  fp = window.fullpage_api;
});

// fullpage initialization is global because fullpage.js registers jQuery plugin
$(document).ready(function(){
  // lock scrolling until envelope opened
  fp = $('#fullpage').fullpage({
    autoScrolling: true,
    fitToSection: true,
    scrollHorizontally: false,
    scrollOverflow: true,
    keyboardScrolling: true,
    touchSensitivity: 10,

    navigation: false,
    anchors: ['intro','cover','venues','rsvp','faq'],

    // start locked
    onLeave: function(){
      // prevent navigation while locked
      if (!document.body.classList.contains('fp-opened')){
        window.fullpage_api?.setAllowScrolling(false);
      }
    },

    afterLoad: function(origin, destination, direction){
      // If not opened yet, lock.
      if (!document.body.classList.contains('fp-opened')){
        window.fullpage_api?.setAllowScrolling(false);
        window.fullpage_api?.setKeyboardScrolling(false);
      }
    }
  }).data('fullpage');

  // ensure initial lock
  window.fullpage_api?.setAllowScrolling(false);
  window.fullpage_api?.setKeyboardScrolling(false);

  const openBtn = document.getElementById('openBtn');
  const exploreBtn = document.getElementById('exploreBtn');
  const rsvpBtn = document.getElementById('rsvpBtn');
  const faqBtn = document.getElementById('faqBtn');
  const open = () => {
    document.body.classList.add('fp-opened');
    window.fullpage_api?.setAllowScrolling(true);
    window.fullpage_api?.setKeyboardScrolling(true);

    // move from intro (1) -> cover (2)
    window.fullpage_api?.moveTo(2);
  };

  openBtn?.addEventListener('click', open);

  exploreBtn?.addEventListener('click', () => window.fullpage_api?.moveTo(3));
  rsvpBtn?.addEventListener('click', () => window.fullpage_api?.moveTo(4));
  faqBtn?.addEventListener('click', () => window.fullpage_api?.moveTo(5));

  const form = document.getElementById('rsvpForm');
  if (form){
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const guestName = document.getElementById('guestName').value.trim();
      const guestEmail = document.getElementById('guestEmail').value.trim();
      const attendance = form.querySelector('input[name="attendance"]:checked')?.value;
      const guestNotes = document.getElementById('notes').value.trim();

      if (!guestName){
        showStatus('Please enter your name.', 'error');
        document.getElementById('guestName').focus();
        return;
      }
      if (!attendance){
        showStatus('Please select your attendance.', 'error');
        return;
      }
      if (!validateEmail(guestEmail)){
        showStatus('That email doesn’t look right — or leave it blank.', 'error');
        document.getElementById('guestEmail').focus();
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

      showStatus('Thanks! RSVP saved on this device (demo). Next we’ll wire real submissions.', 'success');
    });
  }
});
