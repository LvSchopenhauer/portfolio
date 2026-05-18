const header = document.querySelector("[data-header]");
const hero = document.querySelector(".hero");
const heroMedia = document.querySelector("[data-hero-media]");
const homePage = document.querySelector("[data-home-page]");
const homeFooter = document.querySelector("[data-home-footer]");
const projectPage = document.querySelector("[data-project-page]");
const projectVisual = document.querySelector("[data-project-visual]");
const projectTitle = document.querySelector("[data-project-title]");
const projectService = document.querySelector("[data-project-service]");
const projectClient = document.querySelector("[data-project-client]");
const projectCopy = document.querySelector("[data-project-copy]");
const projectSecondary = document.querySelector("[data-project-secondary]");

const projects = {
  veil: {
    title: "Motion Identity",
    client: "Veil Systems",
    visual: "project-visual-a",
    copy: "A cinematic identity system built from translucent materials, slow pressure changes and a restrained typographic rhythm.",
    secondary: "The work moves like a veil opening and closing: transparent layers, quiet pressure shifts and a motion language that lets the brand feel precise without becoming cold."
  },
  artifact: {
    title: "Product Film",
    client: "Artifact One",
    visual: "project-visual-b",
    copy: "A launch sequence for a fictional hardware object, using reflective surfaces, precise macro framing and quiet interface details.",
    secondary: "Every shot is built around controlled reflections and small mechanical reveals, turning the product into something discovered rather than simply displayed."
  },
  tempo: {
    title: "Performance Study",
    client: "Tempo Lab",
    visual: "project-visual-c",
    copy: "A visual research project exploring speed, breath and athletic movement through fog, light and compressed editorial cuts.",
    secondary: "The system studies how motion feels before it becomes legible: breath, acceleration and friction are translated into a compact editorial rhythm."
  },
  glacier: {
    title: "Immersive Environment",
    client: "Glacier Index",
    visual: "project-visual-d",
    copy: "An environmental concept where glass-like terrain, data motion and spatial sound form a calm but monumental digital world.",
    secondary: "Spatial cues, reflective terrain and measured data movement give the environment a slow, monumental presence without losing its interface clarity."
  },
  signal: {
    title: "Research Prototype",
    client: "Signal Room",
    visual: "project-visual-e",
    copy: "A prototype interface for sensing weak patterns: layered gradients, pulse motion and a modular information architecture.",
    secondary: "The prototype treats information as a field of weak signals, making subtle pattern changes feel visible through pulse, density and layered color."
  },
  nocturne: {
    title: "Launch Visuals",
    client: "Nocturne",
    visual: "project-visual-f",
    copy: "A nocturnal visual package for a premium launch, balancing black-space composition with sharp metallic highlights.",
    secondary: "The launch direction leans into black space, reflection and restraint, creating a quiet premium atmosphere around a sharp reveal sequence."
  }
};

const projectSlugs = new Set(Object.keys(projects));

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
  if (document.body.classList.contains("project-active")) {
    header.classList.remove("on-paper");
    return;
  }

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

function showProjectPage(slug) {
  const project = projects[slug];
  if (!project) return false;

  homePage.hidden = true;
  homeFooter.hidden = true;
  projectPage.hidden = false;
  document.body.classList.add("project-active");
  projectClient.textContent = project.title;
  projectTitle.textContent = project.client;
  projectService.textContent = project.title;
  projectCopy.textContent = project.copy;
  projectSecondary.textContent = project.secondary;
  projectVisual.className = `project-visual ${project.visual}`;
  document.title = `${project.client} - ${project.title}`;
  window.scrollTo(0, 0);
  updateHeader();

  return true;
}

function showHomePage() {
  homePage.hidden = false;
  homeFooter.hidden = false;
  projectPage.hidden = true;
  document.body.classList.remove("project-active");
  document.title = "LvSchopenhauer - Creative Portfolio";
  updateHeader();
}

function routeFromLocation() {
  const slug = window.location.pathname.replace(/^\/+|\/+$/g, "");

  if (projectSlugs.has(slug)) {
    showProjectPage(slug);
    return;
  }

  showHomePage();
}

routeFromLocation();
