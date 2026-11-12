
const ceremony_info = {
  // Single source of truth for the wedding date/time
  year: 2027,
  month: 7,
  day: 17,
  time_hour: 14,
  time_minute: 0,
  timezone: 'Europe/London'
};

const reception_info = {
  time_hour: 16,
  time_minute: 0
};

// Derive date information from the numeric configuration
function ceremonyDateInfo() {
  const date = new Date(Date.UTC(
    ceremony_info.year,
    ceremony_info.month - 1,
    ceremony_info.day
  ));

  return {
    weekday: new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      timeZone: 'UTC'
    }).format(date),

    monthName: new Intl.DateTimeFormat('en-GB', {
      month: 'long',
      timeZone: 'UTC'
    }).format(date),

    monthTwoDigit: String(ceremony_info.month).padStart(2, '0'),
    yearTwoDigit: String(ceremony_info.year).slice(-2)
  };
}

// Convert a London local date/time into an absolute Date
function makeDate(source) {
  const { year, month, day, timezone } = ceremony_info;
  const hour = source.time_hour;
  const minute = source.time_minute;

  // Initial UTC approximation
  const utcDate = new Date(Date.UTC(
    year, month - 1, day, hour, minute
  ));

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(utcDate)
      .map(part => [part.type, part.value])
  );

  const representedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );

  return new Date(
    utcDate.getTime() + (utcDate.getTime() - representedAsUtc)
  );
}

function ceremonyTargetDate() {
  return makeDate(ceremony_info);
}

function receptionTargetDate() {
  return makeDate(reception_info);
}

async function renderAllInfo() {

  // Only render after we have got the invite data
  const [invitationData] = await Promise.all([
    window.weddingInvitationDataReady
  ]);


  const ceremonyDate = ceremonyTargetDate();
  const receptionDate = receptionTargetDate();
  const dateInfo = ceremonyDateInfo();

  const heroDate = document.querySelector('[data-ceremony="hero-date"]');
  if (heroDate) {
    heroDate.textContent =
      `${dateInfo.weekday.toUpperCase()} · ${ceremony_info.day} ${dateInfo.monthName.toUpperCase()} ${ceremony_info.year}`;
  }

  const stampDay = document.querySelector('[data-ceremony="stamp-day"]');
  if (stampDay) stampDay.textContent = String(ceremony_info.day);

  const stampMonth = document.querySelector('[data-ceremony="stamp-month"]');
  if (stampMonth) stampMonth.textContent = dateInfo.monthTwoDigit;

  const stampYear = document.querySelector('[data-ceremony="stamp-year"]');
  if (stampYear) stampYear.textContent = dateInfo.yearTwoDigit;

  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ceremony_info.timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const ceremonyTimeEl = document.querySelector('[data-ceremony="ceremony-time"]');
  if (ceremonyTimeEl) {
    ceremonyTimeEl.textContent = timeFormatter.format(ceremonyDate);
  }

  const footerEl = document.querySelector('[data-ceremony="footer-month-year"]');
  if (footerEl) {
    footerEl.textContent =
      `${dateInfo.monthName.toUpperCase()} ${ceremony_info.year}`;
  }

  const receptionTimeEl = document.querySelector('[data-ceremony="reception-time"]');
  if (receptionTimeEl) {
    receptionTimeEl.textContent = timeFormatter.format(receptionDate);
  }

  const showRsvp = invitationData.guests.length > 0
  // console.log('showRsvp', showRsvp)

  const rsvpSection = document.querySelector('#rsvp');
  const rsvpNavLink = document.querySelector('.nav-rsvp');

  if (rsvpSection) {
    rsvpSection.hidden = !showRsvp;
  }

  if (rsvpNavLink) {
    rsvpNavLink.hidden = !showRsvp;
  }

  if (showRsvp) {
    setupRsvp(invitationData);
  }
}

function normalizeGuestStatus(status){
  if (status === 'accept') return 'accept';
  if (status === 'decline') return 'decline';
  return 'not_answered';
}

function setupRsvp(invitationData){
  const guests = Array.isArray(invitationData?.guests) ? invitationData.guests : [];
  const guestsRoot = document.getElementById('rsvp-guests');
  const messageEl = document.getElementById('rsvp-message');
  const sendBtn = document.getElementById('send-rsvp');

  if (!guestsRoot || !messageEl || !sendBtn) return;

  const responseReceived = Boolean(invitationData?.response_received);

  const loadedStatuses = guests.map(g => normalizeGuestStatus(g?.status));
  const loadedMessage = invitationData?.rsvp_message || '';

  // Initial button highlight rules
  // - If response_received is false: nothing is highlighted
  // - If response_received is true: highlight what was previously recorded
  const initialStatuses = responseReceived
    ? [...loadedStatuses]
    : guests.map(() => 'not_answered');

  let currentStatuses = [...initialStatuses];
  const initialMessage = loadedMessage;

  messageEl.value = loadedMessage;

  const textSpan = sendBtn.querySelector('span:not([aria-hidden])') || sendBtn.querySelector('span');
  function setBtnText(text){
    if (textSpan) textSpan.textContent = text;
    else sendBtn.textContent = text;
  }

  function arraysEqual(a, b){
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  function hasAllAnswered(){
    return currentStatuses.every(s => s === 'accept' || s === 'decline');
  }

  function updateSendButton(){
    const changedButtons = !arraysEqual(currentStatuses, initialStatuses);
    const changedMessage = messageEl.value !== initialMessage;
    const anyChange = changedButtons || changedMessage;

    if (!responseReceived) {
      // Requirement 1
      if (!anyChange) {
        sendBtn.disabled = true;
        setBtnText('Enter RSVP above');
        return;
      }

      // Requirement 2
      if (hasAllAnswered()) {
        sendBtn.disabled = false;
        setBtnText('Send RSVP');
        return;
      }

      // Requirement 4 (before all guests have answered)
      sendBtn.disabled = false;
      setBtnText('Update RSVP');
      return;
    }

    // response_received === true
    // Requirement 3
    if (!anyChange) {
      sendBtn.disabled = true;
      setBtnText('Change your RSVP above');
      return;
    }

    // Requirement 4
    sendBtn.disabled = false;
    setBtnText('Update RSVP');
  }

  function applyGuestActiveStates(){
    guestsRoot.querySelectorAll('.rsvp-guest-line').forEach(line => {
      const idx = Number(line.getAttribute('data-guest-index'));
      const acceptBtn = line.querySelector('.rsvp-toggle-btn[data-status="accept"]');
      const declineBtn = line.querySelector('.rsvp-toggle-btn[data-status="decline"]');
      acceptBtn?.classList.toggle('is-active', currentStatuses[idx] === 'accept');
      declineBtn?.classList.toggle('is-active', currentStatuses[idx] === 'decline');
    });
  }

  // Render all buttons
  guestsRoot.innerHTML = '';

  if (guests.length > 1) {
    const allActions = document.createElement('div');
    allActions.className = 'rsvp-all-actions';

    const btnAllAccept = document.createElement('button');
    btnAllAccept.type = 'button';
    btnAllAccept.textContent = 'All accept';
    btnAllAccept.addEventListener('click', () => {
      currentStatuses = currentStatuses.map(() => 'accept');
      applyGuestActiveStates();
      updateSendButton();
    });

    const btnAllDecline = document.createElement('button');
    btnAllDecline.type = 'button';
    btnAllDecline.textContent = 'All decline';
    btnAllDecline.addEventListener('click', () => {
      currentStatuses = currentStatuses.map(() => 'decline');
      applyGuestActiveStates();
      updateSendButton();
    });

    allActions.appendChild(btnAllAccept);
    allActions.appendChild(btnAllDecline);
    guestsRoot.appendChild(allActions);
  }

  // Guest lines
  guests.forEach((g, idx) => {
    const line = document.createElement('div');
    line.className = 'rsvp-guest-line';
    line.setAttribute('data-guest-index', String(idx));

    const name = document.createElement('div');
    name.className = 'rsvp-guest-name';
    name.textContent = g?.name || `Guest ${idx + 1}`;

    const actions = document.createElement('div');
    actions.className = 'rsvp-guest-actions';

    const btnAccept = document.createElement('button');
    btnAccept.type = 'button';
    btnAccept.className = 'rsvp-toggle-btn';
    btnAccept.dataset.status = 'accept';
    btnAccept.textContent = 'Attending';

    const btnDecline = document.createElement('button');
    btnDecline.type = 'button';
    btnDecline.className = 'rsvp-toggle-btn';
    btnDecline.dataset.status = 'decline';
    btnDecline.textContent = 'Not Attending';

    function setStatus(newStatus){
      currentStatuses[idx] = newStatus;
      btnAccept.classList.toggle('is-active', newStatus === 'accept');
      btnDecline.classList.toggle('is-active', newStatus === 'decline');
      updateSendButton();
    }

    btnAccept.addEventListener('click', () => setStatus('accept'));
    btnDecline.addEventListener('click', () => setStatus('decline'));

    // Apply initial active states
    const initial = currentStatuses[idx];
    btnAccept.classList.toggle('is-active', initial === 'accept');
    btnDecline.classList.toggle('is-active', initial === 'decline');

    actions.appendChild(btnAccept);
    actions.appendChild(btnDecline);

    line.appendChild(name);
    line.appendChild(actions);
    guestsRoot.appendChild(line);
  });

  messageEl.addEventListener('input', updateSendButton);

  sendBtn.addEventListener('click', () => {
    console.log('send RSVP not implemented');
  });

  updateSendButton();
}

renderAllInfo();

function startCountdown() {
  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minutesEl = document.getElementById('cd-minutes');
  const secondsEl = document.getElementById('cd-seconds');

  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  const target = ceremonyTargetDate();

  const pad2 = (n) => String(n).padStart(2, '0');

  function tick() {
    const now = new Date();
    const diffMs = target - now;

    if (diffMs <= 0) {
      daysEl.textContent = '0';
      hoursEl.textContent = '00';
      minutesEl.textContent = '00';
      secondsEl.textContent = '00';
      return;
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    daysEl.textContent = String(days);
    hoursEl.textContent = pad2(hours);
    minutesEl.textContent = pad2(minutes);
    secondsEl.textContent = pad2(seconds);
  }

  tick();
  setInterval(tick, 1000);
}

startCountdown();

// Mobile navigation
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';

  menuButton.setAttribute('aria-expanded', String(!isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');

  navigation?.classList.toggle('is-open', !isOpen);
});

navigation?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navigation.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Open navigation');
  });
});

// Scroll reveal animations
const revealItems = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealItems.forEach(item => observer.observe(item));
} else {
  revealItems.forEach(item => item.classList.add('is-visible'));
}

// RSVP form
// Static GitHub Pages has no server to receive submissions.
// Until a Formspree endpoint is configured, create an email for the couple.
document.querySelector('#rsvp-form')?.addEventListener('submit', event => {
  event.preventDefault();

  const form = event.currentTarget;
  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const recipient = form.dataset.email || 'hello@example.com';

  const subject = encodeURIComponent(`Wedding RSVP — ${data.get('name')}`);

  const body = encodeURIComponent(
    `Name: ${data.get('name')}\nEmail: ${data.get('email')}\nAttendance: ${data.get('attendance')}\nNotes: ${data.get('notes') || 'None'}`
  );

  const messageEl = document.querySelector('#form-message');

  if (messageEl) {
    messageEl.textContent =
      'Your email app should open with your RSVP. Please send the email to complete your reply.';
  }

  window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
});
