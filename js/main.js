const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const siteNav = document.querySelector("[data-site-nav]");
const hero = document.querySelector(".hero");
const heroMedia = document.querySelector("[data-hero-media]");
const introCopy = document.querySelector(".intro p");
const homePage = document.querySelector("[data-home-page]");
const homeFooter = document.querySelector("[data-home-footer]");
const projectPage = document.querySelector("[data-project-page]");
const projectHero = document.querySelector(".project-hero");
const projectVisual = document.querySelector("[data-project-visual]");
const projectImage = document.querySelector("[data-project-image]");
const projectScroll = document.querySelector(".project-scroll");
const projectTitle = document.querySelector("[data-project-title]");
const projectService = document.querySelector("[data-project-service]");
const projectClient = document.querySelector("[data-project-client]");
const projectCopy = document.querySelector("[data-project-copy]");
const projectSecondary = document.querySelector("[data-project-secondary]");

const projects = {
  veil: {
    title: "Supernova Rise",
    client: "Adidas",
    visual: "project-visual-a",
    image: "/assets/covers/cover_1.png",
    copy: "A close product study built around texture, compression and a controlled flash of green.",
    secondary: "The direction holds the object at a monumental scale, letting material detail and light gradients carry the rhythm before the wider brand system opens up."
  },
  artifact: {
    title: "Material Flight",
    client: "Terrain",
    visual: "project-visual-b",
    image: "/assets/covers/cover_2.png",
    copy: "A floating footwear composition set against an impossible landscape, balancing product clarity with a surreal environmental read.",
    secondary: "The frame keeps the silhouette legible while the reflected terrain adds a sense of movement, depth and outdoor performance without becoming literal."
  },
  tempo: {
    title: "Replasty",
    client: "Helena Rubinstein",
    visual: "project-visual-c",
    image: "/assets/covers/cover_3.png",
    copy: "A premium beauty still exploring black gloss, soft refraction and luminous product staging.",
    secondary: "The composition leans on contrast rather than decoration: pale liquid forms, sharp packaging edges and small spark highlights create a clean luxury atmosphere."
  },
  glacier: {
    title: "Particle Field",
    client: "Glacier Index",
    visual: "project-visual-d",
    image: "/assets/covers/cover_4.png",
    copy: "An abstract frozen system where particles gather into a circular field and dissolve back into depth.",
    secondary: "The image works as an atmospheric counterpoint to the product-led pieces, adding a colder research note to the homepage rhythm."
  },
  signal: {
    title: "Performance Film",
    client: "Waterform",
    visual: "project-visual-e",
    image: "/assets/covers/cover_5.png",
    copy: "A monochrome performance detail built from water, texture and high-contrast product material.",
    secondary: "Small droplets and dark negative space give the frame an editorial charge while still keeping the surface detail readable."
  },
  nocturne: {
    title: "Launch Visuals",
    client: "Nocturne",
    visual: "project-visual-f",
    image: "/assets/covers/cover_6.png",
    copy: "A nocturnal visual package for a premium launch, balancing black-space composition with sharp metallic highlights.",
    secondary: "The launch direction leans into black space, reflection and restraint, creating a quiet premium atmosphere around a sharp reveal sequence."
  }
};

const projectSlugs = new Set(Object.keys(projects));

function setMenuOpen(open) {
  header.classList.toggle("menu-open", open);
  menuToggle?.setAttribute("aria-expanded", String(open));
  document.documentElement.classList.toggle("menu-open", open);
  document.body.classList.toggle("menu-open", open);
}

menuToggle?.addEventListener("click", () => {
  setMenuOpen(!header.classList.contains("menu-open"));
});

siteNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenuOpen(false));
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenuOpen(false);
});

window.addEventListener("resize", () => {
  if (window.innerWidth >= 1024) setMenuOpen(false);
});

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
}, { threshold: 0.08, rootMargin: "0px 0px -4% 0px" });

document.querySelectorAll(".reveal").forEach((item) => revealObserver.observe(item));

function updateProjectHero() {
  if (!projectHero || !projectVisual) return;

  const fadeEnd = window.innerWidth > 1024 ? 300 : Math.max(1, projectHero.offsetHeight * 0.72);
  const opacity = Math.max(0, 1 - window.scrollY / fadeEnd);
  const progress = 1 - opacity;

  projectVisual.style.opacity = String(opacity);
  projectHero.style.setProperty("--project-overlay-opacity", String(opacity));

  if (projectScroll) {
    projectScroll.style.opacity = String(Math.max(0, 1 - progress * 1.6));
    projectScroll.style.transform = `translateX(-50%) translateY(${progress * 12}px) rotate(45deg)`;
  }
}

let projectScrollAnimation = null;

function swing(progress) {
  return 0.5 - Math.cos(progress * Math.PI) / 2;
}

function scrollToProjectStory(event) {
  const hash = projectScroll?.getAttribute("href");
  const target = hash ? document.querySelector(hash) : null;
  if (!target) return;

  event.preventDefault();
  if (projectScrollAnimation) cancelAnimationFrame(projectScrollAnimation);

  const start = window.scrollY;
  const end = target.getBoundingClientRect().top + window.scrollY;
  const distance = end - start;
  const duration = 700;
  const startedAt = performance.now();
  const htmlScrollBehavior = document.documentElement.style.scrollBehavior;
  const bodyScrollBehavior = document.body.style.scrollBehavior;

  document.documentElement.style.scrollBehavior = "auto";
  document.body.style.scrollBehavior = "auto";

  function tick(now) {
    const progress = Math.min(1, (now - startedAt) / duration);
    window.scrollTo(0, start + distance * swing(progress));

    if (progress < 1) {
      projectScrollAnimation = requestAnimationFrame(tick);
      return;
    }

    projectScrollAnimation = null;
    document.documentElement.style.scrollBehavior = htmlScrollBehavior;
    document.body.style.scrollBehavior = bodyScrollBehavior;
    window.location.hash = hash;
  }

  projectScrollAnimation = requestAnimationFrame(tick);
}

projectScroll?.addEventListener("click", scrollToProjectStory);

function updateHeader() {
  if (document.body.classList.contains("project-active")) {
    header.classList.remove("on-paper");
    updateProjectHero();
    return;
  }

  const heroHeight = hero ? hero.offsetHeight : window.innerHeight * 0.46;
  const onPaper = window.scrollY > Math.max(40, heroHeight - 90);
  header.classList.toggle("on-paper", onPaper);

  if (heroMedia) {
    const introCopyBottom = introCopy
      ? introCopy.getBoundingClientRect().bottom + window.scrollY
      : heroHeight * 1.85;
    const fadeEnd = Math.max(1, introCopyBottom - heroHeight);
    const opacity = Math.max(0, 1 - window.scrollY / fadeEnd);
    heroMedia.style.setProperty("--hero-media-opacity", String(opacity));
  }
}

window.addEventListener("scroll", updateHeader, { passive: true });
window.addEventListener("resize", updateHeader);
updateHeader();

function showProjectPage(slug) {
  const project = projects[slug];
  if (!project) return false;

  setMenuOpen(false);
  homePage.hidden = true;
  homeFooter.hidden = true;
  projectPage.hidden = false;
  document.body.classList.add("project-active");
  projectClient.textContent = project.title;
  projectTitle.textContent = project.client;
  projectService.textContent = project.title;
  projectCopy.textContent = project.copy;
  projectSecondary.textContent = project.secondary;
  if (projectImage && project.image) projectImage.src = project.image;
  projectVisual.className = `project-visual ${project.visual}`;
  projectVisual.removeAttribute("style");
  projectHero?.style.removeProperty("--project-overlay-opacity");
  if (projectScroll) projectScroll.removeAttribute("style");
  document.title = `${project.client} - ${project.title}`;
  window.scrollTo(0, 0);
  updateHeader();

  return true;
}

function showHomePage() {
  setMenuOpen(false);
  homePage.hidden = false;
  homeFooter.hidden = false;
  projectPage.hidden = true;
  document.body.classList.remove("project-active");
  projectVisual?.removeAttribute("style");
  projectHero?.style.removeProperty("--project-overlay-opacity");
  if (projectScroll) projectScroll.removeAttribute("style");
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
