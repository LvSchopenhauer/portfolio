const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const siteNav = document.querySelector("[data-site-nav]");
const hero = document.querySelector(".hero");
const heroMedia = document.querySelector("[data-hero-media]");
const introCopy = document.querySelector(".intro p");
const homePage = document.querySelector("[data-home-page]");
const homeFooter = document.querySelector("[data-home-footer]");
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
const adminForm = document.querySelector("[data-admin-form]");
const adminClient = document.querySelector("[data-admin-client]");
const adminTitle = document.querySelector("[data-admin-title]");
const adminCopy = document.querySelector("[data-admin-copy]");
const adminSecondary = document.querySelector("[data-admin-secondary]");
const adminImage = document.querySelector("[data-admin-image]");
const adminPreview = document.querySelector("[data-admin-preview]");
const adminHeroTrigger = document.querySelector("[data-admin-hero-trigger]");
const adminLiveClient = document.querySelector("[data-admin-live-client]");
const adminLiveTitle = document.querySelector("[data-admin-live-title]");
const adminLiveCopy = document.querySelector("[data-admin-live-copy]");
const adminLiveSecondary = document.querySelector("[data-admin-live-secondary]");
const adminCanvas = document.querySelector(".admin-canvas");
const adminBlockList = document.querySelector("[data-admin-block-list]");
const adminEditorTitle = document.querySelector("[data-admin-editor-title]");
const adminProjectTabs = document.querySelector("[data-admin-project-tabs]");
const adminAddText = document.querySelector("[data-admin-add-text]");
const adminAddImage = document.querySelector("[data-admin-add-image]");
const adminAddVideo = document.querySelector("[data-admin-add-video]");
const adminReset = document.querySelector("[data-admin-reset]");
const adminStatus = document.querySelector("[data-admin-status]");

let adminBlocks = [];
let pendingBlockType = null;
let draggedBlockId = null;
let placementGhost = null;

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
    title: "Replasty",
    client: "Helena Rubinstein",
    visual: "project-visual-c",
    image: "/assets/covers/cover_3.png",
    video: "https://player.vimeo.com/video/1074185659?h=14f6fb727c&title=0&byline=0&portrait=0&badge=0",
    copy: "A premium beauty still exploring black gloss, soft refraction and luminous product staging.",
    secondary: "The composition leans on contrast rather than decoration: pale liquid forms, sharp packaging edges and small spark highlights create a clean luxury atmosphere."
  },
  auto: {
    title: "ID.CODE",
    client: "Auto China",
    visual: "project-visual-d",
    image: "/assets/covers/cover_4.png",
    video: "https://player.vimeo.com/video/1079755480?h=a8ec0282e8&title=0&byline=0&portrait=0&badge=0",
    copy: "An abstract frozen system where particles gather into a circular field and dissolve back into depth.",
    secondary: "The image works as an atmospheric counterpoint to the product-led pieces, adding a colder research note to the homepage rhythm."
  },
  helena: {
    title: "Countdown Gift Box",
    client: "Helena Rubinstein",
    visual: "project-visual-e",
    image: "/assets/covers/cover_5.png",
    video: "https://player.vimeo.com/video/1079682226?title=0&byline=0&portrait=0&badge=0",
    copy: "A monochrome performance detail built from water, texture and high-contrast product material.",
    secondary: "Small droplets and dark negative space give the frame an editorial charge while still keeping the surface detail readable."
  },
  361: {
    title: "Breathing underwater",
    client: "361",
    visual: "project-visual-f",
    image: "/assets/covers/cover_6.png",
    video: "https://player.vimeo.com/video/1076680357?title=0&byline=0&portrait=0&badge=0",
    copy: "A nocturnal visual package for a premium launch, balancing black-space composition with sharp metallic highlights.",
    secondary: "The launch direction leans into black space, reflection and restraint, creating a quiet premium atmosphere around a sharp reveal sequence."
  }
};

const projectSlugs = new Set(Object.keys(projects));
const appRoutes = new Set(["", "origin", "info", "admin", ...projectSlugs]);
const editableProjectSlugs = ["eqlz", "supernova", "kolon", "auto", "helena", "361"];
const editableProjectData = {};
let activeAdminProjectSlug = editableProjectSlugs[0];
let lastViewedProjectSlug = activeAdminProjectSlug;

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
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Project data request failed");

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    throw new Error("Project data response was not JSON");
  }

  return response.json();
}

async function loadStaticProjectFiles() {
  const entries = await Promise.all(
    editableProjectSlugs.map(async (slug) => {
      try {
        return [slug, await fetchJson(`/data/${slug}.json`)];
      } catch {
        return [slug, {}];
      }
    })
  );

  entries.forEach(([slug, project]) => {
    if (project && Object.keys(project).length) editableProjectData[slug] = project;
  });
}

async function loadEditableProject() {
  try {
    const data = await fetchJson(getEditableProjectApi());
    Object.keys(editableProjectData).forEach((slug) => delete editableProjectData[slug]);
    if (data && typeof data === "object") {
      Object.entries(data).forEach(([slug, project]) => {
        if (project && Object.keys(project).length) editableProjectData[slug] = project;
      });
    }
  } catch {
    Object.keys(editableProjectData).forEach((slug) => delete editableProjectData[slug]);
    await loadStaticProjectFiles();
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

async function saveEditableProject(slug, data) {
  const response = await fetch(getEditableProjectApi(slug), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  if (!response.ok) throw new Error("Project save failed");
  editableProjectData[slug] = await response.json();
  return editableProjectData[slug];
}

function renderAdminProjectTabs() {
  if (!adminProjectTabs) return;
  adminProjectTabs.innerHTML = "";

  editableProjectSlugs.forEach((slug) => {
    const project = getProject(slug);
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.adminProject = slug;
    button.className = slug === activeAdminProjectSlug ? "active" : "";
    button.textContent = project.client || projects[slug].client || slug;
    adminProjectTabs.append(button);
  });
}

function populateAdminForm() {
  if (!adminForm) return;
  const project = getProject(activeAdminProjectSlug);
  renderAdminProjectTabs();
  if (adminEditorTitle) {
    adminEditorTitle.textContent = `${project.client || projects[activeAdminProjectSlug].client || activeAdminProjectSlug} editor`;
  }
  adminClient.value = project.client || "";
  adminTitle.value = project.title || "";
  adminCopy.value = project.copy || "";
  adminSecondary.value = project.secondary || "";
  if (adminLiveClient) adminLiveClient.textContent = project.client || "";
  if (adminLiveTitle) adminLiveTitle.textContent = project.title || "";
  if (adminLiveCopy) adminLiveCopy.textContent = project.copy || "";
  if (adminLiveSecondary) adminLiveSecondary.textContent = project.secondary || "";
  if (adminPreview) adminPreview.src = project.image || projects[activeAdminProjectSlug].image;
  if (adminImage) adminImage.value = "";
  adminBlocks = Array.isArray(project.blocks) ? project.blocks.map((block) => ({ ...block })) : [];
  renderAdminBlocks();
  const viewLink = document.querySelector(".admin-toolbox a[href]");
  if (viewLink) viewLink.href = `/${activeAdminProjectSlug}`;
  if (adminStatus) adminStatus.textContent = "";
}

function syncAdminFieldsFromCanvas() {
  if (adminLiveClient) adminClient.value = adminLiveClient.textContent.trim();
  if (adminLiveTitle) adminTitle.value = adminLiveTitle.textContent.trim();
  if (adminLiveCopy) adminCopy.value = adminLiveCopy.textContent.trim();
  if (adminLiveSecondary) adminSecondary.value = adminLiveSecondary.textContent.trim();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.addEventListener("load", () => {
      URL.revokeObjectURL(url);
      resolve(image);
    });
    image.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    });
    image.src = url;
  });
}

async function fileToDataUrl(file) {
  if (!file.type?.startsWith("image/")) return readFileAsDataUrl(file);

  try {
    const image = await loadImageFromFile(file);
    const maxEdge = 1800;
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return readFileAsDataUrl(file);
  }
}

async function uploadImageFile(file) {
  const response = await fetch("/api/uploads/image", {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-File-Name": file.name || "image.gif"
    },
    body: file
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Image upload failed");
  return data;
}

function isGifFile(file) {
  return file.type === "image/gif" || /\.gif$/i.test(file.name || "");
}

async function prepareImageFile(file) {
  if (isGifFile(file)) {
    return (await uploadImageFile(file)).url;
  }

  return fileToDataUrl(file);
}

async function prepareMediaBlockFile(block, file) {
  if (block.type === "video" || isGifFile(file)) {
    const upload = await uploadVideoFile(file);
    return {
      content: upload.url,
      compressed: upload.compressed,
      type: "video"
    };
  }

  return {
    content: await prepareImageFile(file),
    compressed: false,
    type: "image"
  };
}

function createBlock(type) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    content: "",
    size: 100,
    fontSize: 24,
    fontWeight: 400,
    layout: type === "image" || type === "video" ? "full" : "full",
    ratio: "16 / 9"
  };
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

function getRatioOptions(block) {
  const options = [
    ["16 / 9", "16:9"],
    ["4 / 3", "4:3"],
    ["1 / 1", "1:1"],
    ["3 / 4", "3:4"],
    ["9 / 16", "9:16"]
  ];

  return block.type === "image" ? [["auto", "Original"], ...options] : options;
}

async function uploadVideoFile(file) {
  const response = await fetch("/api/uploads/video", {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-File-Name": file.name || "video.mp4"
    },
    body: file
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Video upload failed");
  return data;
}

function setPendingBlockType(type) {
  pendingBlockType = type;
  adminCanvas?.classList.toggle("placing", Boolean(type));
  adminAddText?.classList.toggle("active", type === "text");
  adminAddImage?.classList.toggle("active", type === "image");
  adminAddVideo?.classList.toggle("active", type === "video");
  placementGhost?.remove();
  placementGhost = null;

  if (type) {
    placementGhost = document.createElement("div");
    placementGhost.className = `admin-placement-ghost ${type}`;
    placementGhost.textContent = type === "text" ? "Text" : type === "image" ? "Image" : "Video";
    document.body.append(placementGhost);
  }

  if (adminStatus) {
    adminStatus.textContent = type
      ? `Click the canvas to place a ${type} block.`
      : "";
  }
}

function movePlacementGhost(event) {
  if (!placementGhost) return;
  placementGhost.style.transform = `translate(${event.clientX + 14}px, ${event.clientY + 14}px)`;
}

function getInsertionIndex(clientY) {
  if (!adminBlockList) return adminBlocks.length;
  const items = [...adminBlockList.querySelectorAll("[data-block-id]")];
  const target = items.find((item) => clientY < item.getBoundingClientRect().top + item.offsetHeight / 2);
  if (!target) return adminBlocks.length;
  return Math.max(0, adminBlocks.findIndex((block) => block.id === target.dataset.blockId));
}

function renderAdminBlocks() {
  if (!adminBlockList) return;
  adminBlockList.innerHTML = "";

  adminBlocks.forEach((block, index) => {
    const item = document.createElement("article");
    item.className = `admin-block ${block.type}`;
    if ((block.type === "image" || block.type === "video") && getMediaLayout(block) === "full") item.classList.add("wide-image");
    if (shouldCenterHalfImage(block, index, adminBlocks)) item.classList.add("centered-image");
    item.dataset.blockId = block.id;
    item.draggable = true;
    item.style.setProperty("--block-span", String(getBlockSpan(block)));
    item.style.setProperty("--block-width", getBlockWidth(block));
    item.style.setProperty("--text-size", `${getTextFontSize(block)}px`);
    item.style.setProperty("--text-weight", String(getTextFontWeight(block)));
    item.style.setProperty("--image-ratio", getImageRatio(block));

    const remove = document.createElement("button");
    remove.className = "admin-block-remove";
    remove.type = "button";
    remove.dataset.blockAction = "remove";
    remove.setAttribute("aria-label", "Remove block");
    remove.textContent = "x";
    item.append(remove);

    if (block.type === "text") {
      const text = document.createElement("div");
      text.className = "admin-block-text";
      text.contentEditable = "true";
      text.dataset.blockField = "content";
      text.dataset.placeholder = "Type text here";
      text.textContent = block.content || "";
      item.append(text);

      const controls = document.createElement("div");
      controls.className = "admin-block-controls";

      const sizeLabel = document.createElement("label");
      sizeLabel.textContent = "Size";
      const sizeInput = document.createElement("input");
      sizeInput.type = "number";
      sizeInput.min = "14";
      sizeInput.max = "72";
      sizeInput.step = "1";
      sizeInput.value = String(getTextFontSize(block));
      sizeInput.dataset.blockField = "fontSize";
      sizeLabel.append(sizeInput);

      const weightLabel = document.createElement("label");
      weightLabel.textContent = "Weight";
      const weightSelect = document.createElement("select");
      weightSelect.dataset.blockField = "fontWeight";
      [300, 400, 500, 700].forEach((weight) => {
        const option = document.createElement("option");
        option.value = String(weight);
        option.textContent = String(weight);
        option.selected = getTextFontWeight(block) === weight;
        weightSelect.append(option);
      });
      weightLabel.append(weightSelect);

      controls.append(sizeLabel, weightLabel);
      item.append(controls);
    }

    if (block.type === "image" || block.type === "video") {
      const label = document.createElement("label");
      label.className = "admin-upload";
      const labelText = document.createElement("span");
      labelText.textContent = block.type === "image" ? "Image" : "Video";
      const input = document.createElement("input");
      input.type = "file";
      input.accept = block.type === "image" ? "image/*" : "video/*";
      input.dataset.blockField = block.type;
      label.append(labelText, input);
      item.append(label);

      if (block.type === "image" && block.content) {
        const image = document.createElement("img");
        image.src = block.content;
        image.alt = "";
        item.append(image);
      }

      if (block.type === "video" && block.content) {
        const video = document.createElement("video");
        video.src = block.content;
        video.muted = true;
        video.loop = true;
        video.autoplay = true;
        video.playsInline = true;
        video.controls = true;
        item.append(video);
      }

      const layoutLabel = document.createElement("label");
      layoutLabel.className = "admin-size-control";
      const layoutText = document.createElement("span");
      layoutText.textContent = "Layout";
      const layoutSelect = document.createElement("select");
      layoutSelect.dataset.blockField = "layout";
      [
        ["full", "Full row"],
        ["half", "Half row"]
      ].forEach(([value, labelText]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = labelText;
        option.selected = getMediaLayout(block) === value;
        layoutSelect.append(option);
      });
      layoutLabel.append(layoutText, layoutSelect);
      item.append(layoutLabel);

      const sizeLabel = document.createElement("label");
      sizeLabel.className = "admin-size-control";
      const sizeText = document.createElement("span");
      sizeText.textContent = "Width";
      const sizeInput = document.createElement("input");
      sizeInput.type = "range";
      sizeInput.min = "50";
      sizeInput.max = "100";
      sizeInput.step = "1";
      sizeInput.value = String(block.size || 50);
      sizeInput.dataset.blockField = "size";
      sizeLabel.append(sizeText, sizeInput);
      item.append(sizeLabel);

      const ratioLabel = document.createElement("label");
      ratioLabel.className = "admin-size-control";
      const ratioText = document.createElement("span");
      ratioText.textContent = "Ratio";
      const ratioSelect = document.createElement("select");
      ratioSelect.dataset.blockField = "ratio";
      getRatioOptions(block).forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        option.selected = getImageRatio(block) === value;
        ratioSelect.append(option);
      });
      ratioLabel.append(ratioText, ratioSelect);
      item.append(ratioLabel);
    }

    adminBlockList.append(item);
  });
}

function resetAdminBlockDragging() {
  adminBlockList?.querySelectorAll("[data-block-id]").forEach((item) => {
    item.draggable = true;
  });
}

function syncAdminBlocksFromDom() {
  if (!adminBlockList) return;
  adminBlockList.querySelectorAll("[data-block-id]").forEach((item) => {
    const block = adminBlocks.find((candidate) => candidate.id === item.dataset.blockId);
    if (!block) return;
    const content = item.querySelector("[data-block-field='content']");
    if (content) block.content = content.textContent.trim();
  });
}

function renderProjectBlocks(blocks = []) {
  if (!projectBlocks) return;
  projectBlocks.innerHTML = "";

  const visibleBlocks = blocks.filter((block) => block.content);
  projectBlocks.hidden = visibleBlocks.length === 0;

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

    if (block.type === "text") {
      const paragraph = document.createElement("p");
      paragraph.textContent = block.content;
      item.append(paragraph);
    }

    if (block.type === "image") {
      const image = document.createElement("img");
      image.src = block.content;
      image.alt = "";
      item.append(image);
    }

    if (block.type === "video") {
      const video = document.createElement("video");
      video.src = block.content;
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      item.append(video);
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

  routeFromLocation();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && pendingBlockType) setPendingBlockType(null);
  if (event.key === "Escape") setMenuOpen(false);
});

window.addEventListener("mousemove", movePlacementGhost);

let resizeAnimationFrame = null;

window.addEventListener("resize", () => {
  if (resizeAnimationFrame) cancelAnimationFrame(resizeAnimationFrame);
  resizeAnimationFrame = requestAnimationFrame(() => {
    resizeAnimationFrame = null;
    setMenuOpen(false);
  });
});

window.addEventListener("load", () => {
  document.body.classList.add("loaded");
  showRepeatRevealsInsideViewport();
});

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

adminHeroTrigger?.addEventListener("click", () => {
  adminImage?.click();
});

adminImage?.addEventListener("change", async () => {
  const file = adminImage.files?.[0];
  if (!file) return;

  try {
    const image = await prepareImageFile(file);
    if (adminPreview) adminPreview.src = image;
    if (adminStatus) adminStatus.textContent = "Image ready. Save to apply it.";
  } catch {
    if (adminStatus) adminStatus.textContent = "Could not read that image.";
  }
});

[adminLiveClient, adminLiveTitle, adminLiveCopy, adminLiveSecondary].forEach((field) => {
  field?.addEventListener("input", syncAdminFieldsFromCanvas);
});

adminAddText?.addEventListener("click", () => {
  setPendingBlockType(pendingBlockType === "text" ? null : "text");
});

adminAddImage?.addEventListener("click", () => {
  setPendingBlockType(pendingBlockType === "image" ? null : "image");
});

adminAddVideo?.addEventListener("click", () => {
  setPendingBlockType(pendingBlockType === "video" ? null : "video");
});

adminProjectTabs?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-admin-project]");
  if (!button) return;
  syncAdminBlocksFromDom();
  activeAdminProjectSlug = button.dataset.adminProject;
  setPendingBlockType(null);
  populateAdminForm();
});

adminCanvas?.addEventListener("click", (event) => {
  if (!pendingBlockType) return;
  if (event.target.closest("button, input")) return;

  syncAdminBlocksFromDom();
  const block = createBlock(pendingBlockType);
  adminBlocks.splice(getInsertionIndex(event.clientY), 0, block);
  renderAdminBlocks();
  setPendingBlockType(null);

  requestAnimationFrame(() => {
    const item = adminBlockList.querySelector(`[data-block-id="${block.id}"]`);
    const editable = item?.querySelector("[contenteditable='true']");
    editable?.focus();
    item?.querySelector("input[type='file']")?.click();
  });
});

adminCanvas?.addEventListener("pointerdown", (event) => {
  if (pendingBlockType) return;
  if (event.target.closest("[contenteditable='true'], button, input, label")) return;
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
});

function updateAdminBlockField(event) {
  const item = event.target.closest("[data-block-id]");
  if (!item) return;
  const block = adminBlocks.find((candidate) => candidate.id === item.dataset.blockId);
  if (!block) return;

    if (event.target.dataset.blockField === "content") block.content = event.target.textContent;
    if (event.target.dataset.blockField === "size") {
      block.size = Number(event.target.value);
      item.style.setProperty("--block-width", getBlockWidth(block));
    }
    if (event.target.dataset.blockField === "layout") {
      block.layout = getMediaLayout({ type: block.type, layout: event.target.value });
      renderAdminBlocks();
    }
    if (event.target.dataset.blockField === "fontSize") {
      block.fontSize = getTextFontSize({ fontSize: event.target.value });
      item.style.setProperty("--text-size", `${block.fontSize}px`);
    }
    if (event.target.dataset.blockField === "fontWeight") {
      block.fontWeight = getTextFontWeight({ fontWeight: event.target.value });
      item.style.setProperty("--text-weight", String(block.fontWeight));
    }
    if (event.target.dataset.blockField === "ratio") {
      block.ratio = event.target.value;
      item.style.setProperty("--image-ratio", getImageRatio(block));
    }
}

adminBlockList?.addEventListener("input", updateAdminBlockField);

adminBlockList?.addEventListener("pointerdown", (event) => {
  if (!event.target.closest("input, select, button, label")) return;
  event.stopPropagation();
  const item = event.target.closest("[data-block-id]");
  if (item) item.draggable = false;
});

window.addEventListener("pointerup", resetAdminBlockDragging);
window.addEventListener("blur", resetAdminBlockDragging);

adminBlockList?.addEventListener("change", async (event) => {
  updateAdminBlockField(event);
  if (event.target.dataset.blockField !== "image" && event.target.dataset.blockField !== "video") return;
  const item = event.target.closest("[data-block-id]");
  const block = adminBlocks.find((candidate) => candidate.id === item?.dataset.blockId);
  const file = event.target.files?.[0];
  if (!block || !file) return;

  try {
    if (event.target.dataset.blockField === "video" || isGifFile(file)) {
      if (adminStatus) {
        adminStatus.textContent = file.size > 25 * 1024 * 1024
          ? "Converting media to an MP4 under 25MB..."
          : "Uploading media...";
      }
      const media = await prepareMediaBlockFile(block, file);
      block.type = media.type;
      block.content = media.content;
      if (adminStatus) {
        adminStatus.textContent = media.compressed || isGifFile(file)
          ? "Media converted below 25MB. Save to apply it."
          : "Media uploaded. Save to apply it.";
      }
    } else {
      if (adminStatus) {
        adminStatus.textContent = isGifFile(file)
          ? "Uploading GIF..."
          : "Preparing image...";
      }
      block.content = await prepareImageFile(file);
      if (adminStatus) adminStatus.textContent = "Image block ready. Save to apply it.";
    }
    renderAdminBlocks();
  } catch {
    if (adminStatus) adminStatus.textContent = "Could not process that media block.";
  }
});

adminBlockList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-block-action]");
  const item = event.target.closest("[data-block-id]");
  if (!button || !item) return;

  syncAdminBlocksFromDom();
  const index = adminBlocks.findIndex((block) => block.id === item.dataset.blockId);
  if (index < 0) return;

  if (button.dataset.blockAction === "remove") {
    adminBlocks.splice(index, 1);
  }

  renderAdminBlocks();
});

adminBlockList?.addEventListener("dragstart", (event) => {
  if (event.target.closest("input, select, button, label")) {
    event.preventDefault();
    return;
  }
  const item = event.target.closest("[data-block-id]");
  if (!item) return;
  syncAdminBlocksFromDom();
  draggedBlockId = item.dataset.blockId;
  item.classList.add("dragging");
});

adminBlockList?.addEventListener("dragend", (event) => {
  event.target.closest("[data-block-id]")?.classList.remove("dragging");
  draggedBlockId = null;
});

adminBlockList?.addEventListener("dragover", (event) => {
  if (!draggedBlockId) return;
  event.preventDefault();
  const from = adminBlocks.findIndex((block) => block.id === draggedBlockId);
  const to = getInsertionIndex(event.clientY);
  if (from < 0 || to < 0 || from === to) return;

  const [block] = adminBlocks.splice(from, 1);
  adminBlocks.splice(to > from ? to - 1 : to, 0, block);
  renderAdminBlocks();
});

adminForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  syncAdminFieldsFromCanvas();
  syncAdminBlocksFromDom();
  const slug = activeAdminProjectSlug;
  const existing = readEditableProject(slug);
  let image = adminPreview?.src || existing.image || projects[slug].image;

  if (adminImage?.files?.[0]) {
    image = await prepareImageFile(adminImage.files[0]);
  }

  const data = {
    client: adminClient.value.trim(),
    title: adminTitle.value.trim(),
    copy: adminCopy.value.trim(),
    secondary: adminSecondary.value.trim(),
    image,
    blocks: adminBlocks
      .filter((block) => block.type === "text" || block.type === "image" || block.type === "video")
      .map((block) => ({
        id: block.id,
        type: block.type,
        content: block.content || "",
        size: block.size || (block.type === "image" ? 50 : 100),
        fontSize: getTextFontSize(block),
        fontWeight: getTextFontWeight(block),
        layout: getMediaLayout(block),
        ratio: getImageRatio(block)
      }))
  };

  try {
    await saveEditableProject(slug, data);
    try {
      window.localStorage.setItem(getEditableProjectStorageKey(slug), JSON.stringify(data));
    } catch {
      // The JSON file is the source of truth; localStorage is only a fallback for static hosting.
    }
    populateAdminForm();
    if (adminStatus) adminStatus.textContent = `Saved to data/${slug}.json. Open /${slug} to preview it.`;
  } catch {
    if (adminStatus) {
      adminStatus.textContent = "Save failed. Restart the local server if this page was already open.";
    }
  }
});

adminReset?.addEventListener("click", async () => {
  const slug = activeAdminProjectSlug;
  const defaults = { ...projects[slug], blocks: [] };

  try {
    await saveEditableProject(slug, defaults);
    window.localStorage.removeItem(getEditableProjectStorageKey(slug));
    populateAdminForm();
    if (adminStatus) adminStatus.textContent = `Reset data/${slug}.json to default content.`;
  } catch {
    if (adminStatus) adminStatus.textContent = "Reset failed. Restart the local server and try again.";
  }
});

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
  projectTitle.textContent = project.client;
  projectService.textContent = project.title;
  projectCopy.textContent = project.copy;
  projectSecondary.textContent = project.secondary;
  if (projectImage && project.image) projectImage.src = project.image;
  if (projectVideo && project.video) projectVideo.src = project.video;
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
  document.title = "sphr";
  window.scrollTo(0, 0);
  updateHeader();
}

async function showAdminPage() {
  const recentProjectSlug = getLastViewedProjectSlug();
  if (editableProjectSlugs.includes(recentProjectSlug)) {
    activeAdminProjectSlug = recentProjectSlug;
  }
  await loadEditableProject();
  setMenuOpen(false);
  homePage.hidden = true;
  if (homeFooter) homeFooter.hidden = true;
  if (originPage) originPage.hidden = true;
  if (infoPage) infoPage.hidden = true;
  projectPage.hidden = true;
  if (adminPage) adminPage.hidden = false;
  populateAdminForm();
  document.body.classList.remove("project-active");
  document.body.classList.remove("origin-active");
  document.body.classList.remove("info-active");
  document.body.classList.add("admin-active");
  projectVisual?.removeAttribute("style");
  projectHero?.style.removeProperty("--project-overlay-opacity");
  if (projectScroll) projectScroll.removeAttribute("style");
  if (projectVideo) projectVideo.src = "about:blank";
  renderProjectBlocks();
  if (heroMedia) heroMedia.style.removeProperty("--hero-media-opacity");
  document.title = "sphr admin";
  window.scrollTo(0, 0);
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
}

async function routeFromLocation() {
  const slug = getSlugFromPath();

  if (slug === "origin") {
    showOriginPage();
    return;
  }

  if (slug === "info") {
    showInfoPage();
    return;
  }

  if (slug === "admin") {
    await showAdminPage();
    return;
  }

  if (projectSlugs.has(slug)) {
    showProjectPage(slug);
    return;
  }

  showHomePage();
  scrollToHash(window.location.hash);
}

async function initRoute() {
  await loadEditableProject();
  await routeFromLocation();
}

window.addEventListener("popstate", initRoute);
initRoute();
