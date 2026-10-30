import { renderTypography } from './typography.js';
import { blockRowSpacing, normalizeBlockSpacing } from './block-spacing.js';

if (window.__sphrStartup) window.__sphrStartup.stage = 'module-evaluating';

const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const siteNav = document.querySelector("[data-site-nav]");
const hero = document.querySelector(".hero");
const heroMedia = document.querySelector("[data-hero-media]");
const introCopy = document.querySelector(".intro p");
const homePage = document.querySelector("[data-home-page]");
const homeFooter = document.querySelector("[data-home-footer]");
const homeVideo = document.querySelector('.hero video');
const homeVideoSource = homeVideo?.querySelector('source[data-src]');
const homePlay = document.querySelector('[data-hero-play]');
let homePosterReady;
const originPage = document.querySelector("[data-origin-page]");
const infoPage = document.querySelector("[data-info-page]");
const adminPage = document.querySelector("[data-admin-page]");
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
const projectVideo = document.querySelector("[data-project-video]");
const projectBlocks = document.querySelector("[data-project-blocks]");
const projects = {
  eqlz: {
    title: "Multidimensional",
    client: "EQLZ",
    visual: "project-visual-a",
    image: "/assets/covers/cover_1.png",
    video: "https://player.vimeo.com/video/1022825186?h=a8ec0282e8&title=0&byline=0&portrait=0&badge=0",
    copy: "A close product study built around texture, compression and a controlled flash of green.",
    secondary: "The direction holds the object at a monumental scale, letting material detail and light gradients carry the rhythm before the wider brand system opens up."
  },
  supernova: {
    title: "Supernova 2024",
    client: "Adidas",
    visual: "project-visual-b",
    image: "/assets/covers/cover_2.png",
    video: "https://player.vimeo.com/video/1078557961?h=a8ec0282e8&title=0&byline=0&portrait=0&badge=0",
    copy: "A floating footwear composition set against an impossible landscape, balancing product clarity with a surreal environmental read.",
    secondary: "The frame keeps the silhouette legible while the reflected terrain adds a sense of movement, depth and outdoor performance without becoming literal."
  },
  kolon: {
    title: "MOVE ALPHA",
    client: "KOLON",
    visual: "project-visual-c",
    image: "/assets/projects/kolon/10-board.webp",
    video: "https://player.vimeo.com/video/1074185659?title=0&byline=0&portrait=0&badge=0",
    copy: "KOLON MOVE ALPHA 是一支以自然能量为主题的登山鞋 CG 宣传片。影片从鞋款的三种配色出发，构建森林矩阵、沙漠与火山熔岩三个幻想空间，将产品外观与自然环境中的形态、材质和运动相结合，呈现充满想象力的户外世界。",
    secondary: "我负责沙漠篇大部分镜头的 CG 制作，依据既定分镜完成场景搭建、摄像机动画、特效模拟、灯光材质、渲染及后期合成，并参与箭头标识与微粒交互效果的前期视觉开发。"
  },
  auto: {
    title: "ID. CODE",
    client: "Volkswagen",
    visual: "project-visual-d",
    image: "/assets/covers/cover_4.png",
    video: "https://player.vimeo.com/video/1079755480?h=b0377a1ee5&title=0&byline=0&portrait=0&badge=0",
    copy: "本项目为大众 ID. CODE 概念车在 2024 北京车展的展示制作数字艺术影像。作品以粒子、液体与金属三种视觉语言，呈现材料的流动、形态变化与光泽，并与现场的实体车辆和 LED 展陈空间相结合，形成围绕产品展开的动态视觉体验。",
    secondary: "我参与了粒子与液体部分的制作，完成其中大部分粒子模拟、动画和摄像机工作，并负责材质、灯光、Redshift 渲染，以及 AE 中的剪辑与合成。摄像机动画依据既定分镜完成。"
  },
  helena: {
    title: "Countdown Gift Box",
    client: "Helena Rubinstein",
    visual: "project-visual-e",
    image: "/assets/covers/cover_5.png",
    video: "https://player.vimeo.com/video/1079682226?h=1d4e238bca&title=0&byline=0&portrait=0&badge=0",
    copy: "这是为赫莲娜限量倒数礼盒制作的节日宣传影片。画面以白色层叠形态、金色流体与黑金礼盒构成视觉基调，通过蜡烛、护肤产品和礼盒展开的镜头，呈现节日礼赠的仪式感。",
    secondary: "我负责片中的金属流体与蜡烛火焰 Pyro 模拟，并依据既定分镜完成礼盒展开动画、Hero 镜头的布置和渲染。主要制作工具为 Houdini、Redshift 与 After Effects。"
  },
  361: {
    title: "Breathing underwater",
    client: "361",
    visual: "project-visual-f",
    image: "/assets/covers/cover_6.png",
    video: "https://player.vimeo.com/video/1076680357?title=0&byline=0&portrait=0&badge=0",
    copy: "本项目为 361° 第八代防水跑鞋制作数字影像，以“水下呼吸”为视觉概念，将鞋款置于悬浮的水立方中，通过水体包裹与破水亮相的过程，呈现产品兼顾防水与透气的特性。",
    secondary: "我负责雨滴落在鞋面的相关镜头制作，涵盖雨滴模拟、材质、灯光、渲染与合成。主要使用 Houdini、Redshift 和 After Effects，重点控制雨滴的真实质感，以及落点与溅落节奏。"
  }
};

const projectSlugs = new Set(Object.keys(projects));
const appRoutes = new Set(["", "origin", "info", "admin", ...projectSlugs]);
const editableProjectSlugs = ["eqlz", "supernova", "kolon", "auto", "helena", "361"];
const editableProjectData = {};
const projectRequests = new Map();
const localEditorHost = ['127.0.0.1', 'localhost'].includes(location.hostname);
const routeStatus = document.querySelector('[data-route-status]');
const routeStatusMessage = document.querySelector('[data-route-status-message]');
const routeRetry = document.querySelector('[data-route-retry]');
let navigationVersion = 0;
let lastViewedProjectSlug = editableProjectSlugs[0];

function rememberViewedProject(slug) {
  lastViewedProjectSlug = slug;
  try {
    window.sessionStorage.setItem("sphr.lastProjectSlug", slug);
  } catch {
    // The in-memory slug still keeps same-session navigation aligned.
  }
}

function getLastViewedProjectSlug() {
  try {
    return window.sessionStorage.getItem("sphr.lastProjectSlug") || lastViewedProjectSlug;
  } catch {
    return lastViewedProjectSlug;
  }
}

function getEditableProjectStorageKey(slug) {
  return `sphr.project.${slug}`;
}

function getEditableProjectApi(slug = "") {
  return slug ? `/api/projects/${slug}` : "/api/projects";
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error('Project data request failed');
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) throw new Error('Project data response was not JSON');
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function loadEditableProject(slug) {
  if (!projectSlugs.has(slug)) throw new Error('Unknown project');
  if (editableProjectData[slug]) return editableProjectData[slug];
  if (projectRequests.has(slug)) return projectRequests.get(slug);

  const request = (async () => {
    let project;
    if (localEditorHost) {
      try {
        project = await fetchJson(getEditableProjectApi(slug));
      } catch { /* A local static preview may not provide the editor API. */ }
    }
    if (!project) project = await fetchJson(`/data/${slug}.json`);
    if (!project || typeof project !== 'object' || Array.isArray(project) || !Object.keys(project).length) {
      throw new Error('Project data was empty or invalid');
    }
    // A newer editor preview/save arriving during this request takes precedence.
    if (!editableProjectData[slug]) editableProjectData[slug] = project;
    return editableProjectData[slug];
  })();
  projectRequests.set(slug, request);
  try {
    return await request;
  } catch (error) {
    if (editableProjectData[slug]) return editableProjectData[slug];
    throw error;
  } finally {
    if (projectRequests.get(slug) === request) projectRequests.delete(slug);
  }
}

function readEditableProject(slug) {
  if (editableProjectData[slug]) return editableProjectData[slug];

  try {
    const stored = window.localStorage.getItem(getEditableProjectStorageKey(slug));
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function getProject(slug) {
  const project = { ...projects[slug], ...readEditableProject(slug) };
  if (typeof project.image === "string") {
    project.image = project.image.replace(/^https?:\/\/(?:127\.0\.0\.1|localhost):\d+(\/assets\/)/, "$1");
  }
  return project;
}

function getMediaLayout(block) {
  if (block.type !== "image" && block.type !== "video") return "full";
  return block.layout === "half" ? "half" : "full";
}

function getBlockSpan(block) {
  return (block.type === "image" || block.type === "video") && getMediaLayout(block) === "half" ? 1 : 2;
}

function getBlockWidth(block) {
  if (block.type !== "image" && block.type !== "video") return "100%";
  return `${Math.min(100, Math.max(50, Number(block.size) || 50))}%`;
}

function shouldCenterHalfImage(block, index, blocks) {
  if ((block.type !== "image" && block.type !== "video") || getBlockSpan(block) !== 1) return false;
  const halfImagesBefore = blocks
    .slice(0, index)
    .filter((candidate) => (candidate.type === "image" || candidate.type === "video") && getBlockSpan(candidate) === 1).length;
  const halfImagesAfter = blocks
    .slice(index + 1)
    .filter((candidate) => (candidate.type === "image" || candidate.type === "video") && getBlockSpan(candidate) === 1).length;
  return halfImagesAfter === 0 && halfImagesBefore % 2 === 0;
}

function getTextFontSize(block) {
  return Math.min(72, Math.max(14, Number(block.fontSize) || 24));
}

function getTextFontWeight(block) {
  return Math.min(700, Math.max(300, Number(block.fontWeight) || 400));
}

function getImageRatio(block) {
  return block.ratio || "16 / 9";
}

let renderedBlocksSnapshot = null;
function renderProjectBlocks(blocks = []) {
  if (!projectBlocks) return;
  const snapshot = JSON.stringify(blocks);
  if (snapshot === renderedBlocksSnapshot) return;
  renderedBlocksSnapshot = snapshot;
  projectBlocks.innerHTML = "";

  const visibleBlocks = blocks.filter((block) => block.content);
  projectBlocks.hidden = visibleBlocks.length === 0;
  projectBlocks.classList.toggle('has-custom-spacing', visibleBlocks.some(block => normalizeBlockSpacing(block.spacingAfter) !== undefined));
  const rowSpacing = blockRowSpacing(visibleBlocks.map((block, index) => ({
    span: shouldCenterHalfImage(block, index, visibleBlocks) ? 2 : getBlockSpan(block), spacingAfter: block.spacingAfter
  })));
  const mobileSpacing = blockRowSpacing(visibleBlocks.map(block => ({ span: 2, spacingAfter: block.spacingAfter })));

  visibleBlocks.forEach((block, index) => {
    const item = document.createElement("article");
    item.className = `project-custom-block ${block.type}`;
    if (block.type === "text") {
      item.classList.add(getTextFontSize(block) >= 24 ? "is-heading" : "is-body");
    }
    if ((block.type === "image" || block.type === "video") && getMediaLayout(block) === "full") item.classList.add("wide-image");
    if (shouldCenterHalfImage(block, index, visibleBlocks)) item.classList.add("centered-image");
    item.style.setProperty("--block-span", String(getBlockSpan(block)));
    item.style.setProperty("--block-width", getBlockWidth(block));
    item.style.setProperty("--text-size", `${getTextFontSize(block)}px`);
    item.style.setProperty("--text-weight", String(getTextFontWeight(block)));
    item.style.setProperty("--image-ratio", getImageRatio(block));
    if (rowSpacing[index].gap !== undefined) item.style.setProperty('--block-gap-after', `${rowSpacing[index].gap}px`);
    if (mobileSpacing[index].gap !== undefined) item.style.setProperty('--block-gap-after-mobile', `${mobileSpacing[index].gap}px`);
    item.classList.toggle('has-custom-spacing-after', rowSpacing[index].custom);
    if (block.type === 'text' && block.textStyle === 'custom') {
      item.style.fontSize = `clamp(14px, ${getTextFontSize(block) / 12}vw, ${getTextFontSize(block)}px)`;
      item.style.fontWeight = String(getTextFontWeight(block));
    }

    if (block.type === "text") {
      const paragraph = document.createElement("p");
      item.append(paragraph);
      projectBlocks.append(item);
      renderTypography(paragraph, block.content, block.typography);
    }

    if (block.type === "image") {
      const image = document.createElement("img");
      image.src = block.content;
      image.alt = block.alt || "";
      item.append(image);
    }

    if (block.type === "video") {
      const video = document.createElement("video");
      video.src = block.content;
      video.muted = true;
      video.loop = block.loop !== false;
      video.autoplay = block.autoplay !== false;
      video.playsInline = true;
      video.controls = block.controls === true;
      video.preload = "metadata";
      item.append(video);
    }

    if (block.caption) {
      const caption = document.createElement('p');
      caption.className = 'project-media-caption';
      caption.textContent = block.caption;
      item.append(caption);
      renderTypography(caption, block.caption);
    }

    projectBlocks.append(item);
  });
}

function getSlugFromPath(pathname = window.location.pathname) {
  return pathname.replace(/^\/+|\/+$/g, "");
}

function scrollToHash(hash) {
  if (!hash) {
    window.scrollTo(0, 0);
    return;
  }

  const target = document.querySelector(hash);
  if (!target) return;
  requestAnimationFrame(() => target.scrollIntoView());
}

function setMenuOpen(open) {
  if (window.innerWidth >= 1024) open = false;
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

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (!link || event.defaultPrevented) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (link.target && link.target !== "_self") return;

  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return;

  const slug = getSlugFromPath(url.pathname);
  if (!appRoutes.has(slug)) return;

  event.preventDefault();
  setMenuOpen(false);

  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    window.history.pushState({}, "", next);
  }

  initRoute();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenuOpen(false);
});



let resizeAnimationFrame = null;

window.addEventListener("resize", () => {
  if (resizeAnimationFrame) cancelAnimationFrame(resizeAnimationFrame);
  resizeAnimationFrame = requestAnimationFrame(() => {
    resizeAnimationFrame = null;
    setMenuOpen(false);
  });
});

function revealPage() {
  document.body.classList.add("loaded");
  requestAnimationFrame(showRepeatRevealsInsideViewport);
}

// The module runs after HTML parsing. Slow media must not keep the whole page invisible.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", revealPage, { once: true });
} else {
  revealPage();
}

window.addEventListener("load", showRepeatRevealsInsideViewport, { once: true });

const repeatRevealSelector = '[data-reveal="repeat-from-top"]';
const revealViewportPadding = 8;

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      if (!entry.target.matches(repeatRevealSelector)) {
        revealObserver.unobserve(entry.target);
      }
    }
  });
}, { threshold: 0.08, rootMargin: "0px 0px -4% 0px" });

document.querySelectorAll(".reveal").forEach((item) => revealObserver.observe(item));

const coverObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-cover-ready');
    coverObserver.unobserve(entry.target);
  });
}, { rootMargin: '200px 0px', threshold: 0 });
document.querySelectorAll('.work-grid .thumb').forEach(thumb => coverObserver.observe(thumb));

function playHomeVideo() {
  if (!homeVideo || homePage.hidden) return;
  if (homePlay) homePlay.hidden = true;
  try {
    const playback = homeVideo.play();
    playback?.catch(() => { if (homePlay) homePlay.hidden = false; });
  } catch { if (homePlay) homePlay.hidden = false; }
}

function startHomeVideo() {
  if (!homeVideo || !homeVideoSource) return;
  if (homeVideoSource.src) { playHomeVideo(); return; }
  if (!homePosterReady) {
    homePosterReady = new Promise(resolve => {
      const image = new Image();
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(finish, 6000);
      image.onload = image.onerror = finish;
      image.src = homeVideo.poster;
      if (image.complete && image.naturalWidth) finish();
    });
  }
  homePosterReady.then(() => {
    if (homePage.hidden) return;
    if (!homeVideoSource.src) { homeVideoSource.src = homeVideoSource.dataset.src; homeVideo.load(); }
    playHomeVideo();
  });
}
homePlay?.addEventListener('click', playHomeVideo);
homeVideo?.addEventListener('playing', () => { if (homePlay) homePlay.hidden = true; });

function isTopEdgeInsideCurrentViewport(item) {
  const rect = item.getBoundingClientRect();
  return rect.top >= revealViewportPadding && rect.top <= window.innerHeight - revealViewportPadding;
}

function showRepeatRevealsInsideViewport() {
  document.querySelectorAll(repeatRevealSelector).forEach((item) => {
    if (isTopEdgeInsideCurrentViewport(item)) item.classList.add("visible");
  });
}

function resetRepeatRevealsAtTop() {
  if (document.body.classList.contains("project-active") || window.scrollY > 12) return;

  document.querySelectorAll(`${repeatRevealSelector}.visible`).forEach((item) => {
    if (!isTopEdgeInsideCurrentViewport(item)) item.classList.remove("visible");
  });
}

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
  showRepeatRevealsInsideViewport();
  resetRepeatRevealsAtTop();

  if (document.body.classList.contains("origin-active")) {
    header.classList.add("on-paper");
    return;
  }

  if (document.body.classList.contains("info-active")) {
    header.classList.add("on-paper");
    return;
  }

  if (document.body.classList.contains("admin-active")) {
    header.classList.add("on-paper");
    return;
  }

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
  const project = getProject(slug);
  if (!project) return false;
  rememberViewedProject(slug);

  setMenuOpen(false);
  homePage.hidden = true;
  if (homeFooter) homeFooter.hidden = true;
  if (originPage) originPage.hidden = true;
  if (infoPage) infoPage.hidden = true;
  if (adminPage) adminPage.hidden = true;
  projectPage.hidden = false;
  document.body.classList.add("project-active");
  document.body.classList.remove("origin-active");
  document.body.classList.remove("info-active");
  document.body.classList.remove("admin-active");
  if (projectClient) projectClient.textContent = project.title;
  renderTypography(projectTitle, project.client, project.typography?.client);
  renderTypography(projectService, project.title, project.typography?.title);
  renderTypography(projectCopy, project.copy, project.typography?.copy);
  renderTypography(projectSecondary, project.secondary, project.typography?.secondary);
  if (projectImage && project.image) projectImage.src = project.image;
  if (projectVideo) {
    const videoSource = project.video || 'about:blank';
    if (projectVideo.getAttribute('src') !== videoSource) projectVideo.src = videoSource;
    projectVideo.closest('.project-video').hidden = !project.video;
  }
  renderProjectBlocks(project.blocks);
  projectVisual.className = `project-visual ${project.visual}`;
  projectVisual.removeAttribute("style");
  projectHero?.style.removeProperty("--project-overlay-opacity");
  if (projectScroll) projectScroll.removeAttribute("style");
  document.title = `${project.client} - ${project.title}`;
  window.scrollTo(0, 0);
  updateHeader();

  return true;
}

function showOriginPage() {
  setMenuOpen(false);
  homePage.hidden = true;
  if (homeFooter) homeFooter.hidden = true;
  projectPage.hidden = true;
  if (infoPage) infoPage.hidden = true;
  if (adminPage) adminPage.hidden = true;
  if (originPage) originPage.hidden = false;
  document.body.classList.remove("project-active");
  document.body.classList.remove("info-active");
  document.body.classList.remove("admin-active");
  document.body.classList.add("origin-active");
  projectVisual?.removeAttribute("style");
  projectHero?.style.removeProperty("--project-overlay-opacity");
  if (projectScroll) projectScroll.removeAttribute("style");
  if (projectVideo) projectVideo.src = "about:blank";
  renderProjectBlocks();
  if (heroMedia) heroMedia.style.removeProperty("--hero-media-opacity");
  document.title = "sphr";
  window.scrollTo(0, 0);
  updateHeader();
}

function showInfoPage() {
  setMenuOpen(false);
  document.querySelector('.hero video')?.pause();
  homePage.hidden = true;
  if (homeFooter) homeFooter.hidden = true;
  if (originPage) originPage.hidden = true;
  if (adminPage) adminPage.hidden = true;
  projectPage.hidden = true;
  if (infoPage) infoPage.hidden = false;
  document.body.classList.remove("project-active");
  document.body.classList.remove("origin-active");
  document.body.classList.remove("admin-active");
  document.body.classList.add("info-active");
  projectVisual?.removeAttribute("style");
  projectHero?.style.removeProperty("--project-overlay-opacity");
  if (projectScroll) projectScroll.removeAttribute("style");
  if (projectVideo) projectVideo.src = "about:blank";
  renderProjectBlocks();
  if (heroMedia) heroMedia.style.removeProperty("--hero-media-opacity");
  document.title = "Info · sphr";
  window.scrollTo(0, 0);
  updateHeader();
}

async function showAdminPage() {
  setMenuOpen(false);
  [homePage, homeFooter, originPage, infoPage, projectPage].forEach(node => { if (node) node.hidden = true; });
  adminPage.hidden = false;
  document.body.classList.remove('project-active', 'origin-active', 'info-active');
  document.body.classList.add('admin-active');
  if (projectVideo) projectVideo.src = 'about:blank';
  document.querySelector('.hero video')?.pause();
  document.title = '作品编辑器 · sphr';
  const editor = await import('/js/editor.js?v=20261027');
  await editor.mountEditor(adminPage, { projects, initialSlug: new URLSearchParams(location.search).get('project') || getLastViewedProjectSlug() });
  updateHeader();
}

function showHomePage() {
  setMenuOpen(false);
  homePage.hidden = false;
  if (homeFooter) homeFooter.hidden = false;
  if (originPage) originPage.hidden = true;
  if (infoPage) infoPage.hidden = true;
  if (adminPage) adminPage.hidden = true;
  projectPage.hidden = true;
  document.body.classList.remove("project-active");
  document.body.classList.remove("origin-active");
  document.body.classList.remove("info-active");
  document.body.classList.remove("admin-active");
  projectVisual?.removeAttribute("style");
  projectHero?.style.removeProperty("--project-overlay-opacity");
  if (projectScroll) projectScroll.removeAttribute("style");
  if (projectVideo) projectVideo.src = "about:blank";
  renderProjectBlocks();
  document.title = "sphr";
  updateHeader();
  startHomeVideo();
}

function showProjectLoadState(failed = false) {
  setMenuOpen(false);
  [homePage, homeFooter, originPage, infoPage, adminPage, projectPage].forEach(node => { if (node) node.hidden = true; });
  document.body.classList.remove('origin-active', 'info-active', 'admin-active');
  document.body.classList.add('project-active');
  document.querySelector('.hero video')?.pause();
  if (projectVideo) projectVideo.src = 'about:blank';
  header.classList.remove('on-paper');
  routeStatus.hidden = false;
  routeStatusMessage.textContent = failed ? '作品暂时未能加载，请重试。' : '正在加载作品…';
  routeRetry.hidden = !failed;
  window.scrollTo(0, 0);
}

async function routeFromLocation() {
  const version = ++navigationVersion;
  const slug = getSlugFromPath();
  routeStatus.hidden = true;

  if (slug === "origin") {
    showOriginPage();
    return true;
  }

  if (slug === "info") {
    showInfoPage();
    return true;
  }

  if (slug === "admin") {
    await showAdminPage();
    return version === navigationVersion;
  }

  if (projectSlugs.has(slug)) {
    if (window.__sphrStartup) window.__sphrStartup.stage = 'project-loading';
    if (!editableProjectData[slug]) showProjectLoadState();
    try {
      await loadEditableProject(slug);
    } catch {
      if (version !== navigationVersion || getSlugFromPath() !== slug) return false;
      showProjectLoadState(true);
      if (window.__sphrStartup) window.__sphrStartup.stage = 'route-error';
      return false;
    }
    if (version !== navigationVersion || getSlugFromPath() !== slug) return false;
    routeStatus.hidden = true;
    showProjectPage(slug);
    return true;
  }

  showHomePage();
  scrollToHash(window.location.hash);
  return true;
}

async function initRoute() {
  const ready = await routeFromLocation();
  if (!ready) return;
  if (window.__sphrStartup) window.__sphrStartup.stage = 'route-ready';
  if (window.parent !== window && new URLSearchParams(location.search).has('editor-preview')) window.parent.postMessage({ type: 'sphr:preview-ready' }, location.origin);
}

window.addEventListener("popstate", initRoute);
routeRetry?.addEventListener('click', initRoute);
initRoute();

// Preview renders the same public components, with drafts supplied only by its same-origin parent.
const isEditorPreview = new URLSearchParams(location.search).has('editor-preview') && window.parent !== window;
if (isEditorPreview) {
  document.documentElement.classList.add('editor-preview');
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== window.parent || event.data?.type !== 'sphr:editor-preview') return;
    const { slug, project } = event.data;
    if (!projectSlugs.has(slug) || slug !== getSlugFromPath() || !project || typeof project !== 'object') return;
    const scrollY = window.scrollY;
    editableProjectData[slug] = project;
    showProjectPage(slug);
    window.scrollTo(0, scrollY);
  });
}
window.addEventListener('sphr:project-saved', event => { editableProjectData[event.detail.slug] = event.detail.data; });

if (['127.0.0.1', 'localhost'].includes(location.hostname) && !isEditorPreview) {
  const editLink = document.createElement('a');
  editLink.className = 'local-edit-link'; editLink.textContent = '编辑此项目';
  document.body.append(editLink);
  const syncEditLink = () => {
    const slug = getSlugFromPath(); editLink.hidden = !projectSlugs.has(slug); editLink.href = `/admin?project=${slug}`;
  };
  syncEditLink();
  window.addEventListener('popstate', syncEditLink);
  document.addEventListener('click', () => queueMicrotask(syncEditLink));
}
