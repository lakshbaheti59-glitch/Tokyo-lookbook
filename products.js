const productsStorageKey = "mumma-lookbook-products-v2";
const productsDbName = "mumma-lookbook";
const productsDbVersion = 3;
const productsMediaStore = "product-media";
const productMediaSlots = ["front", "back"];
const productTemplateNumber = 1;
const productImageExtensions = ["jpeg", "jpg", "png", "webp", "avif", "svg"];
const productVideoExtensions = ["mp4", "webm", "mov"];
const defaultProductSeeds = [
  {
    title: "DRESS",
    note: "Printed everyday silhouettes with export-ready finishing.",
    mediaBase: "product-01",
  },
  {
    title: "SHORT DRESS",
    note: "Soft daywear shapes designed for easy buyer review.",
    mediaBase: "product-02",
  },
  {
    title: "TOP",
    note: "Lightweight tops with clean trims and commercial styling.",
    mediaBase: "product-03",
  },
  {
    title: "CO-ORD SET",
    note: "Matched separates for relaxed resort and retail programs.",
    mediaBase: "product-04",
  },
  {
    title: "DRESS",
    note: "Fresh floral dresses with balanced proportion and movement.",
    mediaBase: "product-05",
  },
  {
    title: "SHORT DRESS",
    note: "Compact silhouettes with soft volume and precise finishing.",
    mediaBase: "product-06",
  },
  {
    title: "DRESS",
    note: "Neutral embroidered dresses with a calm black-and-ivory language.",
    mediaBase: "product-07",
  },
  {
    title: "TOP / PALAZZO",
    note: "Separates for modular merchandising across seasonal ranges.",
    mediaBase: "product-08",
  },
  {
    title: "CO-ORD SET",
    note: "Summer-ready cotton sets with light embroidery and comfort fit.",
    mediaBase: "product-09",
  },
  {
    title: "KURTA",
    note: "Printed longline styles for contemporary ethnic export programs.",
    mediaBase: "product-10",
  },
  {
    title: "BOTTOMS",
    note: "Clean bottoms and shorts styled for coordinated assortment planning.",
    mediaBase: "product-11",
  },
];

const productsList = document.querySelector("#productsList");
const addProductButton = document.querySelector("#addProductButton");
const addProductButtonBottom = document.querySelector("#addProductButtonBottom");
const objectUrls = new Map();

let products = [];
let activeSlot = null;
let dbPromise = null;

const filePicker = document.createElement("input");
filePicker.type = "file";
filePicker.hidden = true;
document.body.append(filePicker);

const createId = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `product-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const padNumber = (value) => String(value).padStart(2, "0");

const templateNumberForIndex = () => productTemplateNumber;

const normalizeTemplateNumber = () => productTemplateNumber;

const fallbackBaseForProduct = (product, index) => product.mediaBase || `product-${padNumber(index + 1)}`;

const productFallbackName = (product, index, slotName) =>
  `${fallbackBaseForProduct(product, index)}-${slotName}`;

const escapeHtml = (value = "") =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const createProduct = (seed = {}, template = 1) => ({
  id: createId(),
  title: seed.title || "DRESS",
  note: seed.note || "",
  mediaBase: seed.mediaBase || "",
  template: normalizeTemplateNumber(seed.template ?? template) || 1,
});

const normalizeProduct = (seed = {}, index = 0) => ({
  id: seed.id || createId(),
  title: seed.title || "DRESS",
  note: seed.note || "",
  mediaBase: seed.mediaBase || "",
  template: normalizeTemplateNumber(seed.template) || templateNumberForIndex(index),
});

const createDefaultProducts = () =>
  defaultProductSeeds.map((seed, index) => createProduct(seed, templateNumberForIndex(index)));

const loadProducts = () => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(productsStorageKey) || "[]");

    if (!Array.isArray(stored) || stored.length === 0) {
      return createDefaultProducts();
    }

    return stored.map((item, index) => normalizeProduct(item, index));
  } catch {
    return createDefaultProducts();
  }
};

const saveProducts = () => {
  window.localStorage.setItem(productsStorageKey, JSON.stringify(products));
};

const getProduct = (productId) => products.find((product) => product.id === productId);

const slotKey = (productId, slotName) => `${productId}-${slotName}`;

const getDatabase = () => {
  if (!("indexedDB" in window)) {
    return Promise.resolve(null);
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      const request = window.indexedDB.open(productsDbName, productsDbVersion);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains("slot-media")) {
          db.createObjectStore("slot-media", { keyPath: "slotName" });
        }

        if (!db.objectStoreNames.contains(productsMediaStore)) {
          db.createObjectStore(productsMediaStore, { keyPath: "mediaKey" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }

  return dbPromise;
};

const readMedia = async (mediaKey) => {
  const db = await getDatabase();

  if (!db) {
    return null;
  }

  return new Promise((resolve) => {
    const request = db
      .transaction(productsMediaStore, "readonly")
      .objectStore(productsMediaStore)
      .get(mediaKey);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
};

const saveMedia = async (mediaKey, file) => {
  const db = await getDatabase();

  if (!db) {
    return false;
  }

  return new Promise((resolve) => {
    const transaction = db.transaction(productsMediaStore, "readwrite");

    transaction.objectStore(productsMediaStore).put({
      mediaKey,
      blob: file,
      type: file.type,
      name: file.name,
      updatedAt: Date.now(),
    });

    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => resolve(false);
  });
};

const removeMedia = async (mediaKey) => {
  const db = await getDatabase();

  if (!db) {
    return false;
  }

  return new Promise((resolve) => {
    const transaction = db.transaction(productsMediaStore, "readwrite");
    transaction.objectStore(productsMediaStore).delete(mediaKey);
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => resolve(false);
  });
};

const cloneProductMedia = async (sourceId, targetId) => {
  for (const slotName of productMediaSlots) {
    const currentMedia = await readMedia(slotKey(sourceId, slotName));

    if (currentMedia?.blob) {
      const clonedBlob = currentMedia.blob.slice(
        0,
        currentMedia.blob.size,
        currentMedia.blob.type
      );

      await saveMedia(slotKey(targetId, slotName), clonedBlob);
    }
  }
};

const removeProductMedia = async (productId) => {
  for (const slotName of productMediaSlots) {
    await removeMedia(slotKey(productId, slotName));
    revokeObjectUrl(slotKey(productId, slotName));
  }
};

const revokeObjectUrl = (mediaKey) => {
  const currentUrl = objectUrls.get(mediaKey);

  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    objectUrls.delete(mediaKey);
  }
};

const revokeAllObjectUrls = () => {
  objectUrls.forEach((url) => {
    URL.revokeObjectURL(url);
  });

  objectUrls.clear();
};

const mediaCandidates = (baseName, preferredType = "image") => {
  const primary = preferredType === "video" ? productVideoExtensions : productImageExtensions;
  const secondary = preferredType === "video" ? productImageExtensions : productVideoExtensions;
  const primaryType = preferredType === "video" ? "video" : "image";
  const secondaryType = preferredType === "video" ? "image" : "video";

  return [
    ...primary.flatMap((extension) => ({
      src: [`media/${baseName}.${extension}`, `${baseName}.${extension}`],
      type: primaryType,
    })),
    ...secondary.flatMap((extension) => ({
      src: [`media/${baseName}.${extension}`, `${baseName}.${extension}`],
      type: secondaryType,
    })),
  ].flatMap((candidate) =>
    candidate.src.map((src) => ({
      src,
      type: candidate.type,
    }))
  );
};

const tryLoadImage = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const tryLoadVideo = (src) =>
  new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };

    video.onloadeddata = () => {
      cleanup();
      resolve(src);
    };

    video.onerror = () => {
      cleanup();
      resolve(null);
    };

    video.src = src;
  });

const resolveFallbackMedia = async (slot) => {
  const fallbackName = slot.dataset.fallbackName;

  if (!fallbackName) {
    return null;
  }

  const sources = mediaCandidates(fallbackName, slot.dataset.preferredType || "image");

  for (const candidate of sources) {
    const src =
      candidate.type === "video"
        ? await tryLoadVideo(candidate.src)
        : await tryLoadImage(candidate.src);

    if (src) {
      return { src, type: candidate.type };
    }
  }

  return null;
};

const controlsMarkup = (hasMedia) => `
  <div class="slot-controls">
    <button type="button" class="slot-button" data-slot-action="upload">
      ${hasMedia ? "Replace" : "Add Media"}
    </button>
    ${
      hasMedia
        ? '<button type="button" class="slot-button is-secondary" data-slot-action="clear">Clear</button>'
        : ""
    }
  </div>
`;

const placeholderMarkup = ({ label, note }) => `
  <div class="slot-surface">
    <div class="product-placeholder">
      <span class="product-placeholder-label">${escapeHtml(label)}</span>
      <div class="product-placeholder-title">Add product media</div>
      <p class="product-placeholder-note">${escapeHtml(note)}</p>
    </div>
  </div>
  ${controlsMarkup(false)}
`;

const mediaMarkup = ({ type, src, label }) => {
  const element =
    type === "video"
      ? `
        <video muted loop playsinline preload="metadata">
          <source src="${src}" />
          Your browser does not support the video tag.
        </video>
      `
      : `<img src="${src}" alt="${escapeHtml(label)}" loading="lazy" />`;

  return `
    <div class="slot-surface">
      ${element}
    </div>
    ${controlsMarkup(true)}
  `;
};

const waitForImageElement = (img) =>
  new Promise((resolve) => {
    if (!img || img.complete) {
      resolve();
      return;
    }

    img.addEventListener("load", () => resolve(), { once: true });
    img.addEventListener("error", () => resolve(), { once: true });
  });

const waitForVideoElement = (video) =>
  new Promise((resolve) => {
    if (!video || video.readyState >= 2) {
      resolve();
      return;
    }

    video.addEventListener("loadeddata", () => resolve(), { once: true });
    video.addEventListener("error", () => resolve(), { once: true });
  });

const productSlotMarkup = ({ productId, slotName, label, note, fallbackName }) => `
  <div
    class="product-upload-slot figure-slot is-empty"
    data-media-key="${slotKey(productId, slotName)}"
    data-slot-name="${slotName}"
    data-fallback-name="${escapeHtml(fallbackName)}"
    data-preferred-type="image"
    data-label="${escapeHtml(label)}"
    data-note="${escapeHtml(note)}"
    data-accept="image/*,video/*"
    tabindex="0"
    role="button"
    aria-label="${escapeHtml(label)}: add or replace media"
  ></div>
`;

const productMarkup = (product, index) => {
  const templateNumber = normalizeTemplateNumber(product.template) || templateNumberForIndex(index);

  return `
  <article class="product-sheet" data-product-id="${product.id}">
    <div class="product-sheet-toolbar">
      <div class="product-sheet-meta">
        <span class="sheet-chip">Product ${padNumber(index + 1)}</span>
        <span class="sheet-subline">Tokyo 2026 / Product board</span>
      </div>

      <div class="product-sheet-actions">
        <button type="button" class="toolbar-button is-secondary" data-product-action="move-up">
          Move Up
        </button>
        <button type="button" class="toolbar-button is-secondary" data-product-action="move-down">
          Move Down
        </button>
        <button type="button" class="toolbar-button is-secondary" data-product-action="duplicate">
          Duplicate
        </button>
        <button type="button" class="toolbar-button" data-product-action="remove">
          Remove
        </button>
      </div>
    </div>

    <div class="product-spread product-template product-template--${templateNumber}">
      <div class="product-figure-column product-figure-column--front">
        <div class="figure-stage figure-stage--front">
          ${productSlotMarkup({
            productId: product.id,
            slotName: "front",
            label: "Primary product image",
            note: "Use a clean cutout, full product photo, or garment detail.",
            fallbackName: productFallbackName(product, index, "front"),
          })}
        </div>
      </div>

      <div class="product-caption-column">
        <div class="product-caption-card">
          <div class="caption-kickers">
            <span class="caption-kicker is-muted">Tokyo 2026</span>
            <span class="caption-kicker">Garment Export</span>
          </div>

          <div class="product-caption">
            <span class="caption-line"></span>
            <input
              class="caption-input"
              data-field="title"
              type="text"
              value="${escapeHtml(product.title)}"
              aria-label="Product title"
            />
            <textarea
              class="caption-textarea caption-textarea--note"
              data-field="note"
              rows="2"
              aria-label="Product note">${escapeHtml(product.note)}</textarea>
          </div>
        </div>
      </div>

      <div class="product-figure-column product-figure-column--back">
        <div class="figure-stage figure-stage--back">
          ${productSlotMarkup({
            productId: product.id,
            slotName: "back",
            label: "Secondary product image",
            note: "Use an alternate angle, styling shot, or construction detail.",
            fallbackName: productFallbackName(product, index, "back"),
          })}
        </div>
      </div>

      <div class="product-page-number">${padNumber(index + 1)}</div>
    </div>
  </article>
`;
};

const autoGrowTextarea = (textarea) => {
  textarea.style.height = "0px";
  textarea.style.height = `${textarea.scrollHeight}px`;
};

const renderPlaceholder = (slot) => {
  revokeObjectUrl(slot.dataset.mediaKey);
  slot.innerHTML = placeholderMarkup({
    label: slot.dataset.label || "Product media",
    note: slot.dataset.note || "Click or drop media into this frame.",
  });
  slot.onfocusin = null;
  slot.onfocusout = null;
  slot.classList.add("is-empty");
  slot.classList.remove("has-media", "is-dragover");
};

const attachHoverVideoPlayback = (slot) => {
  const video = slot.querySelector("video");

  if (!video) {
    return;
  }

  const playVideo = () => {
    video.play().catch(() => {});
  };

  const pauseVideo = () => {
    video.pause();
  };

  video.onmouseenter = playVideo;
  video.onmouseleave = pauseVideo;
  slot.onfocusin = playVideo;
  slot.onfocusout = pauseVideo;
};

const renderMedia = (slot, media) => {
  slot.innerHTML = mediaMarkup({ ...media, label: slot.dataset.label || "Product media" });
  slot.onfocusin = null;
  slot.onfocusout = null;
  slot.classList.add("has-media");
  slot.classList.remove("is-empty", "is-dragover");
  attachHoverVideoPlayback(slot);
};

const renderSlot = async (slot) => {
  const mediaKey = slot.dataset.mediaKey;
  const currentMedia = await readMedia(mediaKey);

  if (currentMedia?.blob) {
    const type = currentMedia.type?.startsWith("video/") ? "video" : "image";
    const src = URL.createObjectURL(currentMedia.blob);

    revokeObjectUrl(mediaKey);
    objectUrls.set(mediaKey, src);
    renderMedia(slot, { type, src });

    if (type === "video") {
      await waitForVideoElement(slot.querySelector("video"));
      return;
    }

    await waitForImageElement(slot.querySelector("img"));
    return;
  }

  const fallback = await resolveFallbackMedia(slot);

  if (fallback) {
    renderMedia(slot, fallback);

    if (fallback.type === "video") {
      await waitForVideoElement(slot.querySelector("video"));
      return;
    }

    await waitForImageElement(slot.querySelector("img"));
    return;
  }

  renderPlaceholder(slot);
};

const renderProducts = async () => {
  revokeAllObjectUrls();
  productsList.innerHTML = products.map((product, index) => productMarkup(product, index)).join("");

  document.querySelectorAll(".caption-textarea").forEach((textarea) => {
    autoGrowTextarea(textarea);
  });

  await Promise.all(
    Array.from(document.querySelectorAll(".product-upload-slot")).map((slot) => renderSlot(slot))
  );
};

const applyFileToSlot = async (slot, file) => {
  const mediaKey = slot.dataset.mediaKey;
  const mediaType = file.type.startsWith("video/") ? "video" : "image";
  const src = URL.createObjectURL(file);

  revokeObjectUrl(mediaKey);
  objectUrls.set(mediaKey, src);
  renderMedia(slot, { type: mediaType, src });
  await saveMedia(mediaKey, file);
};

const openPicker = (slot) => {
  activeSlot = slot;
  filePicker.accept = slot.dataset.accept || "image/*,video/*";
  filePicker.click();
};

const clearSlot = async (slot) => {
  await removeMedia(slot.dataset.mediaKey);

  const fallback = await resolveFallbackMedia(slot);

  if (fallback) {
    renderMedia(slot, fallback);
    return;
  }

  renderPlaceholder(slot);
};

const addProduct = () => {
  const newProduct = createProduct({}, templateNumberForIndex(products.length));
  products.push(newProduct);
  saveProducts();
  void renderProducts();

  requestAnimationFrame(() => {
    const nextProduct = document.querySelector(`[data-product-id="${newProduct.id}"]`);
    nextProduct?.scrollIntoView({ behavior: "smooth", block: "start" });
    nextProduct?.querySelector(".caption-input")?.focus();
  });
};

const duplicateProduct = async (productId) => {
  const currentIndex = products.findIndex((product) => product.id === productId);

  if (currentIndex === -1) {
    return;
  }

  const duplicate = createProduct(products[currentIndex], products[currentIndex].template);
  products.splice(currentIndex + 1, 0, duplicate);
  await cloneProductMedia(productId, duplicate.id);
  saveProducts();
  await renderProducts();
};

const moveProduct = (productId, direction) => {
  const currentIndex = products.findIndex((product) => product.id === productId);
  const targetIndex = currentIndex + direction;

  if (currentIndex === -1 || targetIndex < 0 || targetIndex >= products.length) {
    return;
  }

  const [currentProduct] = products.splice(currentIndex, 1);
  products.splice(targetIndex, 0, currentProduct);
  saveProducts();
  void renderProducts();
};

const removeProduct = async (productId) => {
  const currentIndex = products.findIndex((product) => product.id === productId);

  if (currentIndex === -1) {
    return;
  }

  await removeProductMedia(productId);
  products.splice(currentIndex, 1);

  if (products.length === 0) {
    products = [createProduct()];
  }

  saveProducts();
  await renderProducts();
};

const handleProductAction = async (button) => {
  const product = button.closest("[data-product-id]");

  if (!product) {
    return;
  }

  const productId = product.dataset.productId;
  const action = button.dataset.productAction;

  if (action === "duplicate") {
    await duplicateProduct(productId);
    return;
  }

  if (action === "remove") {
    await removeProduct(productId);
    return;
  }

  if (action === "move-up") {
    moveProduct(productId, -1);
    return;
  }

  if (action === "move-down") {
    moveProduct(productId, 1);
  }
};

productsList.addEventListener("click", async (event) => {
  const productAction = event.target.closest("[data-product-action]");

  if (productAction) {
    await handleProductAction(productAction);
    return;
  }

  const slotAction = event.target.closest("[data-slot-action]");
  const slot = event.target.closest(".product-upload-slot");

  if (slotAction && slot) {
    event.preventDefault();

    if (slotAction.dataset.slotAction === "clear") {
      await clearSlot(slot);
      return;
    }

    openPicker(slot);
    return;
  }

  const emptySlot = event.target.closest(".product-upload-slot.is-empty");

  if (emptySlot) {
    openPicker(emptySlot);
  }
});

productsList.addEventListener("keydown", (event) => {
  const slot = event.target.closest(".product-upload-slot");

  if (!slot) {
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openPicker(slot);
  }
});

productsList.addEventListener("dragover", (event) => {
  const slot = event.target.closest(".product-upload-slot");

  if (!slot) {
    return;
  }

  event.preventDefault();
  slot.classList.add("is-dragover");
});

productsList.addEventListener("dragleave", (event) => {
  const slot = event.target.closest(".product-upload-slot");

  if (!slot) {
    return;
  }

  if (!slot.contains(event.relatedTarget)) {
    slot.classList.remove("is-dragover");
  }
});

productsList.addEventListener("drop", async (event) => {
  const slot = event.target.closest(".product-upload-slot");

  if (!slot) {
    return;
  }

  event.preventDefault();
  slot.classList.remove("is-dragover");

  const acceptsVideo = slot.dataset.accept.includes("video");
  const file = Array.from(event.dataTransfer?.files || []).find((candidate) => {
    if (candidate.type.startsWith("image/")) {
      return true;
    }

    return acceptsVideo && candidate.type.startsWith("video/");
  });

  if (file) {
    await applyFileToSlot(slot, file);
  }
});

productsList.addEventListener("input", (event) => {
  const field = event.target.dataset.field;

  if (!field) {
    return;
  }

  const product = event.target.closest("[data-product-id]");
  const currentProduct = product ? getProduct(product.dataset.productId) : null;

  if (!currentProduct) {
    return;
  }

  currentProduct[field] = event.target.value;
  saveProducts();

  if (event.target.matches(".caption-textarea")) {
    autoGrowTextarea(event.target);
  }
});

filePicker.addEventListener("change", async () => {
  const [file] = Array.from(filePicker.files || []);

  if (!file || !activeSlot) {
    filePicker.value = "";
    activeSlot = null;
    return;
  }

  const acceptsVideo = activeSlot.dataset.accept.includes("video");
  const isValidImage = file.type.startsWith("image/");
  const isValidVideo = acceptsVideo && file.type.startsWith("video/");

  if (isValidImage || isValidVideo) {
    await applyFileToSlot(activeSlot, file);
  }

  filePicker.value = "";
  activeSlot = null;
});

addProductButton?.addEventListener("click", addProduct);
addProductButtonBottom?.addEventListener("click", addProduct);

products = loadProducts();
saveProducts();
void renderProducts();

window.addEventListener("beforeunload", () => {
  revokeAllObjectUrls();
});
