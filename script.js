
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
