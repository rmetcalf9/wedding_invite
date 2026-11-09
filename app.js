const GUESTS_STORAGE_KEY = 'wedding_rsvps_v1';

const state = {
  event: {
    coupleLine: 'Robert & Elizabeth',
    dateLine: 'Saturday 17 July 2027',
    rsvpDeadline: '[Deadline date]',
    contactLine: '[Your contact email/phone]'
  },
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
  ]
};

function el(tag, attrs = {}, children = []){
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)){
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, String(v));
  }
  for (const child of children){
    if (child == null) continue;
    if (typeof child === 'string') node.appendChild(document.createTextNode(child));
    else node.appendChild(child);
  }
  return node;
}

function openMapLabelForVenue(venue){
  return venue.mapsUrl ? 'Open map' : 'Maps unavailable';
}

function osmEmbedUrl({lat,lng}){
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01}%2C${lat-0.01}%2C${lng+0.01}%2C${lat+0.01}&layer=mapnik&marker=${lat}%2C${lng}`;
}

function renderVenues(){
  const grid = document.getElementById('venuesGrid');
  if (!grid) return;
  grid.innerHTML = '';

  for (const v of state.venues){
    const card = el('article', { class: 'venueCard', role: 'listitem' }, [
      el('div', { class: 'venueCard__top' }, [
        el('h3', { class: 'venueCard__title' }, [v.name]),
        el('p', { class: 'venueCard__meta' }, [v.meta || '']),
        el('p', { class: 'venueCard__desc' }, [v.description || '']),
        el('div', { class: 'venueCard__actions' }, [
          el('a', {
            class: 'btn btn--primary',
            href: v.mapsUrl || '#',
            target: '_blank',
            rel: 'noopener noreferrer'
          }, [openMapLabelForVenue(v)]),
          el('span', { class: 'chip', title: 'Address' }, ['📍 ', v.address || ''])
        ])
      ])
    ]);

    if (v.coords && typeof v.coords.lat === 'number' && typeof v.coords.lng === 'number'){
      const frame = el('iframe', {
        class: 'mapFrame',
        src: osmEmbedUrl(v.coords),
        loading: 'lazy',
        referrerpolicy: 'no-referrer-when-downgrade'
      });
      frame.title = `${v.name} map`;
      card.appendChild(frame);
    }

    grid.appendChild(card);
  }
}

function loadRsvps(){
  try{
    const raw = localStorage.getItem(GUESTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch{
    return [];
  }
}

function saveRsvps(entries){
  localStorage.setItem(GUESTS_STORAGE_KEY, JSON.stringify(entries));
}

function formatISODate(d){
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

function showStatus(msg, kind = 'info'){
  const elStatus = document.getElementById('formStatus');
  if (!elStatus) return;
  elStatus.textContent = msg;
  elStatus.style.color = kind === 'error' ? '#dc2626' : (kind === 'success' ? '#16a34a' : '#6b7280');
}

function initFullpage(){
  if (!window.$ || !window.fullpage){
    console.warn('fullPage dependencies not loaded yet');
    return null;
  }

  window.$('#fullpage').fullpage({
    anchors: ['intro', 'cover', 'venues', 'rsvp', 'faq'],
    navigation: false,
    navigationTooltips: false,
    showActiveTooltip: false,

    // presentation feel
    autoScrolling: true,
    fitToSection: true,
    scrollHorizontally: false,

    // allow inner scrolling for forms/details
    scrollOverflow: true,

    // ensure touch friendliness
    touchSensitivity: 10,

    afterLoad: function(){
      // Until the envelope is opened, keep the user from moving away from the intro slide.
      if (!document.body.classList.contains('opened')){
        window.fullpage_api?.setAllowScrolling(false);
        window.fullpage_api?.setKeyboardScrolling(false);
      }
    }
  });

  // Lock immediately (best-effort; fullpage_api should exist after init)
  window.fullpage_api?.setAllowScrolling(false);
  window.fullpage_api?.setKeyboardScrolling(false);

  return window.fullpage_api;
}

let lastSubmitted = null;

document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  renderVenues();

  const fp = initFullpage();

  // Envelope open interaction
  const btn = document.getElementById('openEnvelopeBtn');
  const open = () => {
    if (document.body.classList.contains('opened')) return;
    document.body.classList.add('opened');

    fp?.setAllowScrolling(true);
    fp?.setKeyboardScrolling(true);

    // Move to cover (section 2)
    fp?.moveSectionDown();
  };

  btn?.addEventListener('click', open);
  btn?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') open();
  });

  // RSVP
  const form = document.getElementById('rsvpForm');
  const downloadBtn = document.getElementById('downloadBtn');
  const notes = document.getElementById('notes');
  const email = document.getElementById('guestEmail');
  const name = document.getElementById('guestName');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();

    const attendance = form.querySelector('input[name="attendance"]:checked')?.value;
    const guestName = name?.value?.trim();
    const guestEmail = email?.value?.trim();
    const guestNotes = notes?.value?.trim();

    if (!guestName){
      showStatus('Please enter your name.', 'error');
      name?.focus();
      return;
    }
    if (!attendance){
      showStatus('Please select your attendance.', 'error');
      return;
    }

    if (guestEmail){
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail);
      if (!ok){
        showStatus('That email doesn’t look right — or leave it blank.', 'error');
        email?.focus();
        return;
      }
    }

    const rsvp = {
      submittedAt: formatISODate(new Date()),
      guestName,
      guestEmail,
      attendance,
      notes: guestNotes
    };

    const entries = loadRsvps();
    entries.unshift(rsvp);
    saveRsvps(entries.slice(0, 50));
    lastSubmitted = rsvp;

    showStatus('Thanks! Your RSVP has been saved on this device.', 'success');
  });

  downloadBtn?.addEventListener('click', () => {
    if (!lastSubmitted){
      showStatus('Submit your RSVP first, then download it.', 'error');
      return;
    }
    const payload = buildDownloadPayload(lastSubmitted);
    downloadText(
      `rsvp-${lastSubmitted.guestName.replace(/\s+/g,'-').toLowerCase()}-${lastSubmitted.attendance}.json`,
      payload
    );
    showStatus('Downloaded your RSVP file.', 'success');
  });
});
