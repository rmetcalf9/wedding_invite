const ceemony_date = {
  // Single source of truth for the wedding date/time
  weekday: 'Saturday',
  day: '17',
  month: 'July',
  year: '2027',
  // Also used for the compact circle stamp (MM DD YY)
  monthTwoDigit: '07',
  yearTwoDigit: '27',

  // Requested: 3pm (display as 3:00 PM)
  timeDisplay: '3:00 PM'
};

function renderCeremonyDate(){
  const heroDate = document.querySelector('[data-ceremony="hero-date"]');
  if (heroDate){
    heroDate.textContent = `${ceemony_date.weekday.toUpperCase()} · ${ceemony_date.day} ${ceemony_date.month.toUpperCase()} ${ceemony_date.year}`;
  }

  const stampDay = document.querySelector('[data-ceremony="stamp-day"]');
  if (stampDay) stampDay.textContent = ceemony_date.day;

  const stampMonth = document.querySelector('[data-ceremony="stamp-month"]');
  if (stampMonth) stampMonth.textContent = ceemony_date.monthTwoDigit;

  const stampYear = document.querySelector('[data-ceremony="stamp-year"]');
  if (stampYear) stampYear.textContent = ceemony_date.yearTwoDigit;

  const ceremonyTimeEl = document.querySelector('[data-ceremony="ceremony-time"]');
  if (ceremonyTimeEl) ceremonyTimeEl.textContent = ceemony_date.timeDisplay;

  const footerEl = document.querySelector('[data-ceremony="footer-month-year"]');
  if (footerEl) footerEl.textContent = `${ceemony_date.month.toUpperCase()} ${ceemony_date.year}`;
}

renderCeremonyDate();

function monthNameToIndex(monthName){
  const map = {
    January: 0,
    February: 1,
    March: 2,
    April: 3,
    May: 4,
    June: 5,
    July: 6,
    August: 7,
    September: 8,
    October: 9,
    November: 10,
    December: 11
  };
  return map[monthName];
}

function ceremonyTargetDate(){
  // ceemony_date.timeDisplay is currently always 3:00 PM; we compute using fixed 24h time
  const monthIndex = monthNameToIndex(ceemony_date.month);
  return new Date(
    Number(ceemony_date.year),
    monthIndex,
    Number(ceemony_date.day),
    15, // 3pm
    0,
    0,
    0
  );
}

function startCountdown(){
  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minutesEl = document.getElementById('cd-minutes');
  const secondsEl = document.getElementById('cd-seconds');
  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  const target = ceremonyTargetDate();

  const pad2 = (n) => String(n).padStart(2, '0');

  function tick(){
    const now = new Date();
    const diffMs = target - now;

    if (diffMs <= 0){
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

const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".site-nav");

menuButton?.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
  navigation.classList.toggle("is-open", !isOpen);
});

navigation?.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    navigation.classList.remove("is-open");
    menuButton?.setAttribute("aria-expanded", "false");
    menuButton?.setAttribute("aria-label", "Open navigation");
  });
});

const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealItems.forEach(item => observer.observe(item));
} else {
  revealItems.forEach(item => item.classList.add("is-visible"));
}

// Static GitHub Pages has no server to receive RSVP submissions.
// Until a Formspree endpoint is configured, create an email for the couple.
document.querySelector("#rsvp-form")?.addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const recipient = form.dataset.email || "hello@example.com";
  const subject = encodeURIComponent(`Wedding RSVP — ${data.get("name")}`);
  const body = encodeURIComponent(
    `Name: ${data.get("name")}\nEmail: ${data.get("email")}\nAttendance: ${data.get("attendance")}\nNotes: ${data.get("notes") || "None"}`
  );
  document.querySelector("#form-message").textContent =
    "Your email app should open with your RSVP. Please send the email to complete your reply.";
  window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
});
