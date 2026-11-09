const ceemony_date = {
  // Single source of truth for the wedding date/time
  weekday: 'Saturday',
  day: '17',
  month: 'July',
  year: '2027',
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
  if (stampMonth) stampMonth.textContent = ceemony_date.month.toUpperCase();

  const stampYear = document.querySelector('[data-ceremony="stamp-year"]');
  if (stampYear) stampYear.textContent = ceemony_date.year;

  const ceremonyTimeEl = document.querySelector('[data-ceremony="ceremony-time"]');
  if (ceremonyTimeEl) ceremonyTimeEl.textContent = ceemony_date.timeDisplay;

  const footerEl = document.querySelector('[data-ceremony="footer-month-year"]');
  if (footerEl) footerEl.textContent = `${ceemony_date.month.toUpperCase()} ${ceemony_date.year}`;
}

renderCeremonyDate();

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
