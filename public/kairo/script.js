const revealItems = document.querySelectorAll("[data-reveal]");
const screens = document.querySelectorAll(".screen-image");
const scrollMeter = document.querySelector(".scroll-meter span");
const magneticItems = document.querySelectorAll(".magnetic");
const supportLink = document.querySelector(".support-link");
const waitlistScriptUrl =
  "https://script.google.com/macros/s/AKfycbxOP0JpamQ_26ZKOL1wnE939tImNZm1iewK85ZyKbgWW_RmP27LELvjQVtPxnsUKET3HQ/exec";
const supportEmail = ["davidksng3000", "icloud.com"].join("@");

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

if (supportLink) {
  supportLink.setAttribute("href", `mailto:${supportEmail}`);
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 },
);

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index * 50, 260)}ms`;
  revealObserver.observe(item);
});

let screenIndex = 0;
window.setInterval(() => {
  if (!screens.length) return;
  screens[screenIndex].classList.remove("is-active");
  screenIndex = (screenIndex + 1) % screens.length;
  screens[screenIndex].classList.add("is-active");
}, 3200);

const updateScrollProgress = () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  scrollMeter?.style.setProperty("--scroll-progress", `${progress}%`);
};

window.addEventListener("scroll", updateScrollProgress, { passive: true });
window.addEventListener("resize", updateScrollProgress);
updateScrollProgress();

magneticItems.forEach((item) => {
  item.addEventListener("pointermove", (event) => {
    const rect = item.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    item.style.transform = `translate(${x * 0.08}px, ${y * 0.12}px)`;
  });

  item.addEventListener("pointerleave", () => {
    item.style.transform = "";
  });
});

document.querySelector(".waitlist-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const input = form.querySelector("input[type='email']");
  const button = form.querySelector("button");
  const buttonLabel = button?.querySelector("span:first-child");
  const status = form.querySelector(".waitlist-status");
  const email = input?.value.trim() ?? "";

  const setStatus = (message, state) => {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", state === "error");
    status.classList.toggle("is-success", state === "success");
  };

  if (!isValidEmail(email)) {
    setStatus("Enter a valid email address.", "error");
    input?.focus();
    return;
  }

  if (!button || !buttonLabel || !input) return;

  button.disabled = true;
  input.disabled = true;
  buttonLabel.textContent = "Joining";
  setStatus("Saving your request...", null);

  try {
    await fetch(waitlistScriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        email,
        source: "kairo",
        submittedAt: new Date().toISOString(),
      }),
    });

    form.reset();
    buttonLabel.textContent = "Requested";
    setStatus("You're on the early access list.", "success");
  } catch {
    button.disabled = false;
    input.disabled = false;
    buttonLabel.textContent = "Join";
    setStatus("Request failed. Please try again.", "error");
  }
});
