const places = window.SECRET_MOSCOW_PLACES;
const DEFAULT_YANDEX_MAPS_KEY = "d0e7278b-1c42-448b-91c8-e17a315bbc82";
const INBOX_URL_RE = /https?:\/\/[^\s)>\]"']+/gi;
const categories = ["все", ...Array.from(new Set(places.map((place) => place.category)))];
const state = {
  category: "все",
  inboxDrafts: [],
  search: "",
  selectedId: places[0].id,
  map: null,
  clusterer: null,
  placemarks: new Map()
};

const elements = {
  categoryStrip: document.querySelector("#categoryStrip"),
  clearInboxButton: document.querySelector("#clearInboxButton"),
  closeInboxButton: document.querySelector("#closeInboxButton"),
  copyInboxButton: document.querySelector("#copyInboxButton"),
  countLabel: document.querySelector("#countLabel"),
  detailsPanel: document.querySelector("#detailsPanel"),
  downloadInboxButton: document.querySelector("#downloadInboxButton"),
  inboxCountLabel: document.querySelector("#inboxCountLabel"),
  inboxDraftList: document.querySelector("#inboxDraftList"),
  inboxOverlay: document.querySelector("#inboxOverlay"),
  inboxText: document.querySelector("#inboxText"),
  mapKeyInput: document.querySelector("#mapKeyInput"),
  mapKeyPanel: document.querySelector("#mapKeyPanel"),
  openInboxButton: document.querySelector("#openInboxButton"),
  parseInboxButton: document.querySelector("#parseInboxButton"),
  placeList: document.querySelector("#placeList"),
  randomPlaceButton: document.querySelector("#randomPlaceButton"),
  resetButton: document.querySelector("#resetButton"),
  saveMapKeyButton: document.querySelector("#saveMapKeyButton"),
  searchInput: document.querySelector("#searchInput")
};

function createIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function cleanInboxUrl(url) {
  return url.trim().replace(/[.,;]+$/, "");
}

function splitInboxBlocks(text) {
  return text
    .trim()
    .split(/\n\s*\n+/)
    .map((block) => block.split("\n").map((line) => line.trim()).filter(Boolean).join("\n"))
    .filter(Boolean);
}

function guessInboxCategory(text) {
  const lower = text.toLowerCase();
  const checks = [
    ["рестораны и кафе", ["кафе", "кофе", "ресторан", "бар", "завтрак", "ужин", "еда"]],
    ["музеи и выставки", ["музей", "выстав", "галере", "павильон", "экспози"]],
    ["парки и прогулки", ["парк", "сад", "прогул", "набереж", "трамвайчик"]],
    ["спорт и активность", ["йога", "спорт", "батут", "падел", "фитнес", "клуб"]],
    ["мастер-классы", ["мастер", "студия", "рисован", "шить", "гончар", "керамик"]],
    ["пространства", ["пространство", "лофт", "холл", "ателье"]],
    ["спа и красота", ["спа", "массаж", "салон", "уход"]],
    ["события", ["событие", "концерт", "игра", "лото", "фестиваль"]]
  ];
  const found = checks.find(([, words]) => words.some((word) => lower.includes(word)));
  return found ? found[0] : "не разобрано";
}

function guessInboxSource(urls) {
  const joined = urls.join(" ").toLowerCase();
  if (joined.includes("instagram.com")) return "instagram";
  if (joined.includes("t.me") || joined.includes("telegram")) return "telegram";
  return urls.length ? "link" : "text";
}

function titleFromInboxBlock(block, urls) {
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  const nonUrlLine = lines.find((line) => {
    INBOX_URL_RE.lastIndex = 0;
    return !INBOX_URL_RE.test(line);
  });
  if (nonUrlLine) return nonUrlLine.replace(/^(маша|masha|я|me)\s*:\s*/i, "").slice(0, 90);
  if (urls[0]) return urls[0].replace(/^https?:\/\//i, "").split("?")[0].slice(0, 90);
  return "Новое место";
}

async function makeInboxId(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-1", data);
  return "inbox-" + Array.from(new Uint8Array(hash))
    .slice(0, 6)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function parseInboxText(text) {
  const createdAt = new Date().toISOString();
  const drafts = [];
  for (const block of splitInboxBlocks(text)) {
    INBOX_URL_RE.lastIndex = 0;
    const urls = Array.from(new Set((block.match(INBOX_URL_RE) || []).map(cleanInboxUrl)));
    drafts.push({
      id: await makeInboxId(block),
      status: "new",
      source: guessInboxSource(urls),
      title: titleFromInboxBlock(block, urls),
      raw_text: block,
      urls,
      category_guess: guessInboxCategory(block),
      notes: "",
      created_at: createdAt
    });
  }
  return drafts;
}

function inboxJson() {
  return JSON.stringify(state.inboxDrafts, null, 2);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInboxDrafts() {
  elements.inboxCountLabel.textContent = `${state.inboxDrafts.length} черновиков`;
  if (!state.inboxDrafts.length) {
    elements.inboxDraftList.innerHTML = '<div class="empty-state">Пока пусто. Вставь сообщения и нажми «Разобрать».</div>';
    return;
  }

  elements.inboxDraftList.innerHTML = state.inboxDrafts.map((draft) => `
    <article class="draft-card">
      <h3>${escapeHtml(draft.title)}</h3>
      <div class="draft-meta">
        <span>${escapeHtml(draft.source)}</span>
        <span>${escapeHtml(draft.category_guess)}</span>
        <span>${escapeHtml(draft.status)}</span>
      </div>
      <pre>${escapeHtml(draft.raw_text)}</pre>
    </article>
  `).join("");
}

function openInbox() {
  elements.inboxOverlay.classList.add("open");
  elements.inboxOverlay.setAttribute("aria-hidden", "false");
  elements.inboxText.focus();
}

function closeInbox() {
  elements.inboxOverlay.classList.remove("open");
  elements.inboxOverlay.setAttribute("aria-hidden", "true");
}

function downloadInboxJson() {
  const blob = new Blob([inboxJson()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "places_inbox.json";
  link.click();
  URL.revokeObjectURL(url);
}

function linkToYandex(place) {
  const text = encodeURIComponent(place.address || place.title);
  return `https://yandex.ru/maps/?text=${text}`;
}

function filteredPlaces() {
  const query = state.search.trim().toLowerCase();
  return places.filter((place) => {
    const categoryMatch = state.category === "все" || place.category === state.category;
    const text = `${place.title} ${place.address} ${place.description} ${place.tags.join(" ")}`.toLowerCase();
    return categoryMatch && (!query || text.includes(query));
  });
}

function renderCategories() {
  elements.categoryStrip.innerHTML = categories.map((category) => {
    const active = category === state.category ? "active" : "";
    return `<button class="category-chip ${active}" data-category="${category}">${category}</button>`;
  }).join("");
}

function renderList() {
  const visible = filteredPlaces();
  elements.countLabel.textContent = `${visible.length} мест`;
  elements.placeList.innerHTML = visible.map((place) => {
    const active = place.id === state.selectedId ? "active" : "";
    return `
      <button class="place-row ${active}" data-id="${place.id}">
        <span class="row-title">${place.title}</span>
        <span class="row-meta">${place.category}</span>
      </button>
    `;
  }).join("");
}

function renderDetails() {
  const place = places.find((item) => item.id === state.selectedId) || filteredPlaces()[0] || places[0];
  if (!place) return;

  const links = [
    place.links.site && ["Сайт", "globe", place.links.site],
    place.links.instagram && ["Instagram", "instagram", place.links.instagram],
    place.links.telegram && ["Telegram", "send", place.links.telegram],
    ["Яндекс", "map-pinned", linkToYandex(place)]
  ].filter(Boolean);

  elements.detailsPanel.innerHTML = `
    <div class="details-top">
      <span class="details-category">${place.category}</span>
      <button class="icon-button compact" id="closeDetailsButton" title="Свернуть" aria-label="Свернуть">
        <i data-lucide="panel-right-close"></i>
      </button>
    </div>
    <h2>${place.title}</h2>
    <p class="address"><i data-lucide="map-pin"></i>${place.address}</p>
    <p>${place.description}</p>
    <div class="tag-cloud">${place.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
    <div class="link-row">
      ${links.map(([label, icon, url]) => `
        <a href="${url}" target="_blank" rel="noreferrer">
          <i data-lucide="${icon}"></i>${label}
        </a>
      `).join("")}
    </div>
  `;
  createIcons();
}

function selectPlace(id, focusMap = true) {
  state.selectedId = id;
  const place = places.find((item) => item.id === id);
  renderList();
  renderDetails();

  if (focusMap && state.map && place) {
    state.map.setCenter(place.coords, 14, { duration: 250 });
    const placemark = state.placemarks.get(id);
    if (placemark) placemark.balloon.open();
  }
}

function syncMapVisibility() {
  if (!state.clusterer) return;
  state.clusterer.removeAll();
  filteredPlaces().forEach((place) => {
    const placemark = state.placemarks.get(place.id);
    if (placemark) state.clusterer.add(placemark);
  });
}

function renderAll() {
  renderCategories();
  renderList();
  renderDetails();
  createIcons();
}

function loadYandexScript(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.ymaps) {
      window.ymaps.ready(resolve);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
    script.onload = () => window.ymaps.ready(resolve);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function initMap(apiKey) {
  elements.mapKeyPanel.classList.add("hidden");
  loadYandexScript(apiKey).then(() => {
  state.map = new ymaps.Map("map", {
      center: [55.7558, 37.6176],
      zoom: 11,
      controls: ["zoomControl", "geolocationControl"]
    }, {
      suppressMapOpenBlock: true,
      yandexMapDisablePoiInteractivity: true
    });

    state.clusterer = new ymaps.Clusterer({
      preset: "islands#invertedDarkGreenClusterIcons",
      groupByCoordinates: false,
      clusterDisableClickZoom: false
    });

    places.forEach((place) => {
      const placemark = new ymaps.Placemark(place.coords, {
        hintContent: place.title,
        balloonContentHeader: place.title,
        balloonContentBody: `<strong>${place.category}</strong><br>${place.address}`,
        balloonContentFooter: `<a href="${linkToYandex(place)}" target="_blank" rel="noreferrer">Открыть в Яндекс.Картах</a>`
      }, {
        preset: "islands#darkGreenDotIcon"
      });
      placemark.events.add("click", () => selectPlace(place.id, false));
      state.placemarks.set(place.id, placemark);
      state.clusterer.add(placemark);
    });

    state.map.geoObjects.add(state.clusterer);
    syncMapVisibility();
    selectPlace(state.selectedId, true);
  }).catch(() => {
    elements.mapKeyPanel.classList.remove("hidden");
    elements.mapKeyPanel.classList.add("error");
  });
}

elements.categoryStrip.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.category = button.dataset.category;
  const firstVisible = filteredPlaces()[0];
  if (firstVisible) state.selectedId = firstVisible.id;
  renderAll();
  syncMapVisibility();
});

elements.placeList.addEventListener("click", (event) => {
  const row = event.target.closest("[data-id]");
  if (row) selectPlace(row.dataset.id);
});

elements.searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  const firstVisible = filteredPlaces()[0];
  if (firstVisible && !filteredPlaces().some((place) => place.id === state.selectedId)) {
    state.selectedId = firstVisible.id;
  }
  renderList();
  syncMapVisibility();
});

elements.resetButton.addEventListener("click", () => {
  state.category = "все";
  state.search = "";
  state.selectedId = places[0].id;
  elements.searchInput.value = "";
  renderAll();
  syncMapVisibility();
  selectPlace(state.selectedId);
});

elements.randomPlaceButton.addEventListener("click", () => {
  const visible = filteredPlaces();
  const place = visible[Math.floor(Math.random() * visible.length)] || places[0];
  selectPlace(place.id);
});

elements.openInboxButton.addEventListener("click", openInbox);
elements.closeInboxButton.addEventListener("click", closeInbox);
elements.inboxOverlay.addEventListener("click", (event) => {
  if (event.target === elements.inboxOverlay) closeInbox();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && elements.inboxOverlay.classList.contains("open")) {
    closeInbox();
  }
});

elements.parseInboxButton.addEventListener("click", async () => {
  state.inboxDrafts = await parseInboxText(elements.inboxText.value);
  renderInboxDrafts();
});

elements.copyInboxButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(inboxJson());
});

elements.downloadInboxButton.addEventListener("click", downloadInboxJson);

elements.clearInboxButton.addEventListener("click", () => {
  elements.inboxText.value = "";
  state.inboxDrafts = [];
  renderInboxDrafts();
});

elements.saveMapKeyButton.addEventListener("click", () => {
  const apiKey = elements.mapKeyInput.value.trim();
  if (!apiKey) return;
  localStorage.setItem("secretMoscowYandexKey", apiKey);
  initMap(apiKey);
});

renderAll();
const storedKey = localStorage.getItem("secretMoscowYandexKey");
if (storedKey || DEFAULT_YANDEX_MAPS_KEY) {
  initMap(storedKey || DEFAULT_YANDEX_MAPS_KEY);
} else {
  elements.mapKeyPanel.classList.remove("hidden");
}
