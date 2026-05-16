const header = document.querySelector("[data-header]");
const hero = document.querySelector(".hero");
const heroMedia = document.querySelector("[data-hero-media]");
const caseStudy = document.querySelector("[data-case-study]");
const closeCase = document.querySelector(".case-close");
const caseTitle = document.querySelector("[data-case-title]");
const caseClient = document.querySelector("[data-case-client]");
const caseCopy = document.querySelector("[data-case-copy]");

const projects = {
  veil: {
    title: "Motion Identity",
    client: "Veil Systems",
    copy: "A cinematic identity system built from translucent materials, slow pressure changes and a restrained typographic rhythm."
  },
  artifact: {
    title: "Product Film",
    client: "Artifact One",
    copy: "A launch sequence for a fictional hardware object, using reflective surfaces, precise macro framing and quiet interface details."
  },
  tempo: {
    title: "Performance Study",
    client: "Tempo Lab",
    copy: "A visual research project exploring speed, breath and athletic movement through fog, light and compressed editorial cuts."
  },
  glacier: {
    title: "Immersive Environment",
    client: "Glacier Index",
    copy: "An environmental concept where glass-like terrain, data motion and spatial sound form a calm but monumental digital world."
  },
  signal: {
    title: "Research Prototype",
    client: "Signal Room",
    copy: "A prototype interface for sensing weak patterns: layered gradients, pulse motion and a modular information architecture."
  },
  nocturne: {
    title: "Launch Visuals",
    client: "Nocturne",
    copy: "A nocturnal visual package for a premium launch, balancing black-space composition with sharp metallic highlights."
  }
};

window.addEventListener("load", () => {
  document.body.classList.add("loaded");
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

document.querySelectorAll(".reveal").forEach((item) => revealObserver.observe(item));

function updateHeader() {
  const heroHeight = hero ? hero.offsetHeight : window.innerHeight * 0.46;
  const onPaper = window.scrollY > Math.max(40, heroHeight - 90);
  header.classList.toggle("on-paper", onPaper);

  if (heroMedia) {
    const fadeEnd = Math.max(1, heroHeight * 0.6);
    const progress = Math.min(1, Math.max(0, window.scrollY / fadeEnd));
    heroMedia.style.opacity = String(1 - progress);
    heroMedia.style.transform = `translateY(${progress * -18}px)`;
    hero.style.setProperty("--hero-overlay-opacity", String(1 - progress));
  }
}

window.addEventListener("scroll", updateHeader, { passive: true });
window.addEventListener("resize", updateHeader);
updateHeader();

document.querySelectorAll(".project-card").forEach((card) => {
  card.addEventListener("click", () => {
    const project = projects[card.dataset.project];
    if (!project) return;

    caseClient.textContent = project.client;
    caseTitle.textContent = project.title;
    caseCopy.textContent = project.copy;
    caseStudy.classList.add("open");
    caseStudy.setAttribute("aria-hidden", "false");
    document.body.classList.add("case-open");
  });
});

function hideCaseStudy() {
  caseStudy.classList.remove("open");
  caseStudy.setAttribute("aria-hidden", "true");
  document.body.classList.remove("case-open");
}

closeCase.addEventListener("click", hideCaseStudy);

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && caseStudy.classList.contains("open")) {
    hideCaseStudy();
  }
});
