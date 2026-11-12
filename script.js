
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

function formatICSLocalDateTime(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23'
  });

  const parts = Object.fromEntries(
    fmt.formatToParts(date).map(p => [p.type, p.value])
  );

  return `${parts.year}${parts.month}${parts.day}T${parts.hour}${parts.minute}${parts.second}`;
}

function formatICSUTCDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function buildWeddingICS({ timezone, ceremonyStart, ceremonyEnd, receptionStart, receptionEnd }) {
  const dtstamp = formatICSUTCDateTime(new Date());

  const ceremonyDtStart = formatICSLocalDateTime(ceremonyStart, timezone);
  const ceremonyDtEnd = formatICSLocalDateTime(ceremonyEnd, timezone);

  const receptionDtStart = formatICSLocalDateTime(receptionStart, timezone);
  const receptionDtEnd = formatICSLocalDateTime(receptionEnd, timezone);

  const uidBase = `wedding-invite-${ceremony_info.year}-${String(ceremony_info.month).padStart(2,'0')}-${String(ceremony_info.day).padStart(2,'0')}`;

  return (
    `BEGIN:VCALENDAR\n` +
    `VERSION:2.0\n` +
    `PRODID:-//Wedding Invite//EN\n` +
    `CALSCALE:GREGORIAN\n` +
    `METHOD:PUBLISH\n\n` +
    `BEGIN:VEVENT\n` +
    `UID:${uidBase}-ceremony@metcarob.com\n` +
    `DTSTAMP:${dtstamp}\n` +
    `SUMMARY:Wedding Ceremony\n` +
    `DTSTART;TZID=${timezone}:${ceremonyDtStart}\n` +
    `DTEND;TZID=${timezone}:${ceremonyDtEnd}\n` +
    `LOCATION:Church of St William of York, Forest Hill, 4 Brockley Park, London SE23 1PS\n` +
    `DESCRIPTION:Wedding ceremony\n` +
    `END:VEVENT\n\n` +
    `BEGIN:VEVENT\n` +
    `UID:${uidBase}-reception@metcarob.com\n` +
    `DTSTAMP:${dtstamp}\n` +
    `SUMMARY:Wedding Reception\n` +
    `DTSTART;TZID=${timezone}:${receptionDtStart}\n` +
    `DTEND;TZID=${timezone}:${receptionDtEnd}\n` +
    `LOCATION:St Laurence Church, Catford, 37 Bromley Rd, London SE6 2TS\n` +
    `DESCRIPTION:Wedding reception\n` +
    `END:VEVENT\n\n` +
    `END:VCALENDAR\n`
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

  // Add to calendar (Google + Apple) with a provider chooser
  const googleBtn = document.getElementById('calendar-google');
  const appleBtn = document.getElementById('calendar-apple');

  function formatGoogleLocalDateTime(date, timeZone) {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      hourCycle: 'h23'
    });

    const parts = Object.fromEntries(fmt.formatToParts(date).map(p => [p.type, p.value]));
    return `${parts.year}${parts.month}${parts.day}T${parts.hour}${parts.minute}${parts.second}`;
  }

  function makeCalendarStrings() {
    // Default durations (adjust later if you know exact timings)
    const ceremonyDurationMinutes = 120;
    const receptionDurationMinutes = 240;

    const ceremonyStart = ceremonyDate;
    const receptionStart = receptionDate;
    const ceremonyEnd = new Date(ceremonyStart.getTime() + ceremonyDurationMinutes * 60 * 1000);
    const receptionEnd = new Date(receptionStart.getTime() + receptionDurationMinutes * 60 * 1000);

    const description =
      'Elizabeth & Robert Wedding`\n\n' +
      `Ceremony: ${ceremonyStart.toISOString()} (Europe/London)\n` +
      `Reception: ${receptionStart.toISOString()} (Europe/London)`;

    return { ceremonyStart, ceremonyEnd, receptionStart, receptionEnd, description };
  }

  if (googleBtn && appleBtn && googleBtn.dataset.bound !== '1' && appleBtn.dataset.bound !== '1') {
    const closeDetails = () => {
      const details = googleBtn.closest('details.calendar-details');
      if (details) details.open = false;
    };

    googleBtn.addEventListener('click', () => {
      const { ceremonyStart, receptionEnd, description } = makeCalendarStrings();
      const start = formatGoogleLocalDateTime(ceremonyStart, ceremony_info.timezone);
      const end = formatGoogleLocalDateTime(receptionEnd, ceremony_info.timezone);

      const url =
        `https://calendar.google.com/calendar/render?action=TEMPLATE` +
        `&text=${encodeURIComponent('Elizabeth & Robert Wedding')}` +
        `&dates=${encodeURIComponent(`${start}/${end}`)}` +
        `&ctz=${encodeURIComponent(ceremony_info.timezone)}` +
        `&details=${encodeURIComponent(description)}` +
        `&location=${encodeURIComponent('London, UK')}` +
        `&sf=true&output=xml`;

      closeDetails();

      // Open Google Calendar. On mobile, navigating in the same tab is more reliable.
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (win) win.focus();
    });

    appleBtn.addEventListener('click', () => {
      const { ceremonyStart, ceremonyEnd, receptionStart, receptionEnd } = makeCalendarStrings();
      const icsText = buildWeddingICS({
        timezone: ceremony_info.timezone,
        ceremonyStart,
        ceremonyEnd,
        receptionStart,
        receptionEnd
      });

      const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'wedding-invite.ics';
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Clean up object URL
      setTimeout(() => URL.revokeObjectURL(url), 1500);

      closeDetails();
    });
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

  let responseReceived = Boolean(invitationData?.response_received);

  const loadedStatuses = guests.map(g => normalizeGuestStatus(g?.status));
  const loadedMessage = invitationData?.rsvp_message || '';

  const invitationId = invitationData?.id;

  // Initial button highlight rules
  // - If response_received is false: nothing is highlighted
  // - If response_received is true: highlight what was previously recorded
  let initialStatuses = responseReceived
    ? [...loadedStatuses]
    : guests.map(() => 'not_answered');

  let currentStatuses = [...initialStatuses];
  let initialMessage = loadedMessage;

  messageEl.value = loadedMessage;

  const textSpan = sendBtn.querySelector('span:not([aria-hidden])') || sendBtn.querySelector('span');
  function setBtnText(text){
    if (textSpan) textSpan.textContent = text;
    else sendBtn.textContent = text;
  }

  function showThankYouToast(){
    const toast = document.createElement('div');
    toast.className = 'rsvp-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = 'Thank you for your response';
    document.body.appendChild(toast);

    window.setTimeout(() => {
      toast.classList.add('is-exit');
      window.setTimeout(() => toast.remove(), 250);
    }, 3200);
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
    const allAnswered = hasAllAnswered();

    // When response_received is false, never show "Update RSVP".
    // Only enable once ALL guests have been set, then show "Send RSVP".
    if (!responseReceived) {
      if (!allAnswered) {
        sendBtn.disabled = true;
        setBtnText('Enter RSVP above');
        return;
      }
      sendBtn.disabled = false;
      setBtnText('Send RSVP');
      return;
    }

    // response_received === true
    // Enable when anything changes; otherwise keep disabled.
    const changedButtons = !arraysEqual(currentStatuses, initialStatuses);
    const changedMessage = messageEl.value !== initialMessage;
    const anyChange = changedButtons || changedMessage;

    if (!anyChange) {
      sendBtn.disabled = true;
      setBtnText('Change your RSVP above');
      return;
    }

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

  sendBtn.addEventListener('click', async () => {
    if (sendBtn.disabled) return;

    if (currentStatuses.some(s => s === 'not_answered')) {
      console.warn('RSVP not complete for all guests');
      updateSendButton();
      return;
    }

    const payload = {
      id: invitationId,
      response_message: messageEl.value,
      guests: guests.map((g, idx) => ({
        name: g?.name,
        status: currentStatuses[idx]
      }))
    };

    try {
      // Optimistically disable while submitting.
      sendBtn.disabled = true;

      const res = await fetch('https://api2.metcarob.com/post_wedding_invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`RSVP submit failed: ${res.status} ${text}`);
      }

      // Mark as received in the UI.
      responseReceived = true;
      initialStatuses = [...currentStatuses];
      initialMessage = messageEl.value;

      applyGuestActiveStates();
      updateSendButton();

      showThankYouToast();
      console.log('send RSVP successful');
    } catch (err) {
      console.error(err);
      updateSendButton();
    }
  });

  updateSendButton();
}

function setupAddToCalendarChooser() {
  const googleBtn = document.getElementById('calendar-google');
  const appleBtn = document.getElementById('calendar-apple');

  if (!googleBtn || !appleBtn) return;
  if (googleBtn.dataset.bound === '1' && appleBtn.dataset.bound === '1') return;
  googleBtn.dataset.bound = '1';
  appleBtn.dataset.bound = '1';

  function pad2(n){ return String(n).padStart(2,'0'); }

  function formatGoogleUTCDateTime(date) {
    return (
      `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}` +
      `T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`
    );
  }

  function makeTimes() {
    const ceremonyStart = ceremonyTargetDate();
    const receptionStart = receptionTargetDate();
    const ceremonyDurationMinutes = 120;
    const receptionDurationMinutes = 240;
    const ceremonyEnd = new Date(ceremonyStart.getTime() + ceremonyDurationMinutes * 60 * 1000);
    const receptionEnd = new Date(receptionStart.getTime() + receptionDurationMinutes * 60 * 1000);
    return { ceremonyStart, ceremonyEnd, receptionStart, receptionEnd };
  }

  function closeDetails() {
    const details = googleBtn.closest('details.calendar-details');
    if (details) details.open = false;
  }

  googleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const { ceremonyStart, ceremonyEnd, receptionStart, receptionEnd } = makeTimes();
    const startUTC = formatGoogleUTCDateTime(ceremonyStart);
    const endUTC = formatGoogleUTCDateTime(receptionEnd);

    const description =
      `Ceremony: ${ceremonyStart.toISOString()}\n` +
      `Reception: ${receptionStart.toISOString()}`;

    const url =
      'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent('Elizabeth & Robert Wedding') +
      '&dates=' + encodeURIComponent(`${startUTC}/${endUTC}`) +
      '&details=' + encodeURIComponent(description) +
      '&location=' + encodeURIComponent('London, UK') +
      '&ctz=' + encodeURIComponent(ceremony_info.timezone);

    closeDetails();
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (win) win.focus();
  });

  appleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const { ceremonyStart, ceremonyEnd, receptionStart, receptionEnd } = makeTimes();

    const icsText = buildWeddingICS({
      timezone: ceremony_info.timezone,
      ceremonyStart,
      ceremonyEnd,
      receptionStart,
      receptionEnd
    });

    const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'wedding-invite.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1500);
    closeDetails();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupAddToCalendarChooser);
} else {
  setupAddToCalendarChooser();
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
