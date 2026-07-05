const root = document.documentElement;
const fontForm = document.querySelector("#fontForm");
const fontUrl = document.querySelector("#fontUrl");
const activeFont = document.querySelector("#activeFont");
const fontSource = document.querySelector("#fontSource");
const sourceHint = document.querySelector("#sourceHint");
const status = document.querySelector("#status");
const fontSize = document.querySelector("#fontSize");
const fontWeight = document.querySelector("#fontWeight");
const sizeValue = document.querySelector("#sizeValue");
const weightValue = document.querySelector("#weightValue");
const themeToggle = document.querySelector("#themeToggle");
const previousFont = document.querySelector("#previousFont");
const nextFont = document.querySelector("#nextFont");
const historyPosition = document.querySelector("#historyPosition");
const historyList = document.querySelector("#historyList");
const activeFontUrl = document.querySelector("#activeFontUrl");
const copyFontUrl = document.querySelector("#copyFontUrl");

let injectedLink;
let injectedStyle;
let previewObjectUrl;
let history = [];
let historyIndex = -1;

const systemStack = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const fontExtensions = [".woff2", ".woff", ".ttf", ".otf"];
const defaultFontUrls = [
  "https://www.dafont.com/pt/squarefont.font",
  "https://www.dafont.com/pt/robot-crush.font",
  "https://www.dafont.com/pt/aldo-the-apache.font",
  "https://www.dafont.com/pt/square-sans-serif-7.font",
  "https://fonts.google.com/specimen/Holtwood+One+SC?preview.text=3454%20urls%20processadas&specimen.preview.text=3454+urls+processadas&preview.layout=grid&categoryFilters=Feeling:%2FExpressive%2FRugged&preview.script=Latn",
  "https://fonts.google.com/specimen/Bangers?preview.text=3454%20urls%20processadas&specimen.preview.text=3454+urls+processadas&preview.layout=grid&categoryFilters=Feeling:%2FExpressive%2FRugged&preview.script=Latn",
  "https://fonts.google.com/specimen/Climate+Crisis?preview.text=3454%20urls%20processadas&preview.layout=grid&categoryFilters=Feeling:%2FExpressive%2FRugged&preview.script=Latn",
  "https://fonts.google.com/specimen/Oswald?preview.text=3454%20urls%20processadas&specimen.preview.text=3454+urls+processadas&preview.layout=grid&categoryFilters=Feeling:%2FExpressive%2FRugged&preview.script=Latn",
  "https://fonts.google.com/noto/specimen/Noto+Sans?preview.text=3454%20urls%20processadas&specimen.preview.text=3454+urls+processadas&preview.layout=grid&categoryFilters=Feeling:%2FExpressive%2FRugged&preview.script=Latn&preview.lang=mis_Nshu",
  "https://fonts.google.com/specimen/Geist+Pixel?preview.text=3454%20urls%20processadas&preview.layout=grid&specimen.preview.text=3454+urls+processadas&preview.script=Latn",
  "https://fonts.google.com/specimen/Inter",
  "https://fonts.google.com/specimen/Rajdhani",
  "https://fonts.google.com/specimen/Barlow",
  "https://fonts.google.com/specimen/DM+Sans",
];
const defaultDafontAssets = {
  "https://www.dafont.com/pt/squarefont.font": {
    fontName: "Square",
    fontUrl: "./assets/fonts/square.ttf",
  },
  "https://www.dafont.com/pt/robot-crush.font": {
    fontName: "Robot Crush",
    fontUrl: "./assets/fonts/robot-crush.ttf",
  },
  "https://www.dafont.com/pt/aldo-the-apache.font": {
    fontName: "Aldo The Apache",
    fontUrl: "./assets/fonts/aldo-the-apache.ttf",
  },
  "https://www.dafont.com/pt/square-sans-serif-7.font": {
    fontName: "Square Sans Serif 7",
    fontUrl: "./assets/fonts/square-sans-serif-7.ttf",
  },
};

function setStatus(message, isError = false) {
  status.textContent = isError ? message : "";
  status.style.color = isError ? "var(--danger)" : "var(--muted)";
}

function setHint(message, isWarning = false) {
  sourceHint.textContent = message;
  sourceHint.classList.toggle("warning", isWarning);
}

function cleanupInjectedFont() {
  injectedLink?.remove();
  injectedStyle?.remove();
  injectedLink = null;
  injectedStyle = null;

  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }
}

function applyFont(fontFamily, sourceLabel, options = {}) {
  if (options.cssUrl) {
    injectedLink = document.createElement("link");
    injectedLink.rel = "stylesheet";
    injectedLink.href = options.cssUrl;
    document.head.appendChild(injectedLink);
  }

  if (options.fontUrl) {
    injectedStyle = document.createElement("style");
    injectedStyle.textContent = `
      @font-face {
        font-family: "${fontFamily}";
        src: url("${options.fontUrl}");
        font-weight: 100 900;
        font-display: swap;
      }
    `;
    document.head.appendChild(injectedStyle);
  }

  root.style.setProperty("--test-font", `"${fontFamily}", ${systemStack}`);
  activeFont.textContent = fontFamily;
  fontSource.textContent = sourceLabel;
  activeFontUrl.value = options.sourceUrl || "";
  copyFontUrl.disabled = !options.sourceUrl;
}

function renderHistory() {
  const hasHistory = history.length > 0;
  historyPosition.textContent = hasHistory ? `${historyIndex + 1} / ${history.length}` : "0 / 0";
  previousFont.disabled = history.length < 2;
  nextFont.disabled = history.length < 2;

  historyList.innerHTML = "";
  history.forEach((entry, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = index === historyIndex ? "history-item active" : "history-item";
    item.textContent = entry.fontFamily;
    item.title = `${entry.fontFamily} - ${entry.sourceLabel}`;
    item.addEventListener("click", () => selectHistory(index));
    historyList.appendChild(item);
  });
}

function selectHistory(index) {
  if (index < 0 || index >= history.length) return;

  const entry = history[index];
  injectedLink?.remove();
  injectedStyle?.remove();
  injectedLink = null;
  injectedStyle = null;

  applyFont(entry.fontFamily, entry.sourceLabel, {
    cssUrl: entry.cssUrl,
    fontUrl: entry.fontUrl,
    sourceUrl: entry.sourceUrl,
  });
  historyIndex = index;
  renderHistory();
}

function addToHistory(entry) {
  const duplicateIndex = history.findIndex((item) => item.key === entry.key);
  if (duplicateIndex >= 0) {
    historyIndex = duplicateIndex;
    selectHistory(historyIndex);
    return;
  }

  history.push(entry);
  historyIndex = history.length - 1;
  renderHistory();
}

function moveHistory(step) {
  if (history.length < 2) return;

  const nextIndex = (historyIndex + step + history.length) % history.length;
  selectHistory(nextIndex);
}

function toTitleCase(value) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function familyFromGoogleUrl(url) {
  const parsed = new URL(url);

  if (parsed.searchParams.has("family")) {
    return parsed.searchParams.get("family").split(":")[0].replace(/\+/g, " ");
  }

  const specimenMatch = parsed.pathname.match(/\/(?:noto\/)?specimen\/([^/?#]+)/);
  if (specimenMatch) {
    return decodeURIComponent(specimenMatch[1]).replace(/\+/g, " ");
  }

  return "";
}

function familyFromFileName(value) {
  const cleanName = value.split(/[\\/]/).pop().replace(/\.(woff2?|ttf|otf)$/i, "");
  return toTitleCase(cleanName.replace(/\[[^\]]+\]|\([^)]+\)/g, ""));
}

function isDirectFontUrl(url) {
  return fontExtensions.some((extension) => new URL(url).pathname.toLowerCase().endsWith(extension));
}

function loadGoogleFont(url) {
  const family = familyFromGoogleUrl(url);
  if (!family) {
    throw new Error("Não consegui encontrar o nome da família nessa URL do Google Fonts.");
  }

  cleanupInjectedFont();
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
  applyFont(family, "Google Fonts", { cssUrl });
  addToHistory({
    key: `google:${family}`,
    fontFamily: family,
    sourceLabel: "Google Fonts",
    sourceUrl: url,
    cssUrl,
  });
  setHint("Google Fonts carregado pela API CSS pública.");
  setStatus(`Fonte "${family}" carregada. Ajuste peso e tamanho para comparar.`);
}

function loadDirectFont(url) {
  const family = familyFromFileName(new URL(url).pathname);
  cleanupInjectedFont();
  applyFont(family, "Arquivo remoto", { fontUrl: url });
  addToHistory({
    key: `remote:${url}`,
    fontFamily: family,
    sourceLabel: "Arquivo remoto",
    sourceUrl: url,
    fontUrl: url,
  });
  setHint("Arquivo de fonte remoto carregado via @font-face. O servidor precisa permitir CORS.");
  setStatus(`Tentando usar "${family}". Se não aparecer, o servidor pode estar bloqueando CORS.`);
}

async function loadDafontFont(url) {
  if (location.protocol === "file:") {
    throw new Error("Para carregar Dafont por URL, abra pelo servidor local com: node server.js");
  }

  setHint("Baixando o ZIP do Dafont pelo servidor local e extraindo a fonte automaticamente.");
  setStatus("Carregando fonte do Dafont...");

  const fallback = defaultDafontAssets[url];
  const response = await fetch(`/api/dafont-font?url=${encodeURIComponent(url)}`);
  const fontName = decodeURIComponent(response.headers.get("x-font-name") || "Dafont");
  const sourceName = decodeURIComponent(response.headers.get("x-font-source") || "Dafont");

  if (!response.ok) {
    if (fallback) {
      cleanupInjectedFont();
      applyFont(fallback.fontName, "Dafont", {
        fontUrl: fallback.fontUrl,
        sourceUrl: url,
      });
      addToHistory({
        key: `dafont:${url}`,
        fontFamily: fallback.fontName,
        sourceLabel: "Dafont",
        sourceUrl: url,
        fontUrl: fallback.fontUrl,
      });
      setHint("Fonte Dafont padrão carregada de asset estático para funcionar no GitHub Pages.");
      setStatus(`Fonte "${fallback.fontName}" carregada do pacote estático.`);
      return;
    }

    let message = "Não consegui carregar essa fonte do Dafont.";
    try {
      const details = await response.json();
      message = details.error || message;
    } catch {
      message = await response.text();
    }
    throw new Error(message);
  }

  cleanupInjectedFont();
  const blob = await response.blob();
  const fontUrl = URL.createObjectURL(blob);

  applyFont(fontName, "Dafont", { fontUrl });
  addToHistory({
    key: `dafont:${url}`,
    fontFamily: fontName,
    sourceLabel: "Dafont",
    sourceUrl: url,
    fontUrl,
  });
  setHint(`Fonte extraida de ${sourceName}. Confira a licenca antes de usar em projeto real.`);
  setStatus(`Fonte "${fontName}" carregada pela URL do Dafont.`);
}

async function loadFromUrl(value) {
  const url = value.trim();
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "fonts.google.com" || host === "fonts.googleapis.com") {
    loadGoogleFont(url);
    return;
  }

  if (host === "dafont.com") {
    await loadDafontFont(url);
    return;
  }

  if (isDirectFontUrl(url)) {
    loadDirectFont(url);
    return;
  }

  throw new Error("Cole uma URL do Google Fonts, Dafont ou uma URL direta de arquivo de fonte.");
}

async function loadDefaultHistory() {
  const failed = [];
  setStatus("Carregando histórico padrão...");

  for (const url of defaultFontUrls) {
    try {
      await loadFromUrl(url);
    } catch (error) {
      failed.push(error.message);
    }
  }

  if (history.length > 0) {
    selectHistory(0);
  }

  if (failed.length > 0) {
    setStatus(`Histórico padrão carregado com ${failed.length} falha(s). Confira se o servidor local está rodando para Dafont.`, true);
  }
}

fontForm.addEventListener("submit", (event) => {
  event.preventDefault();

  try {
    loadFromUrl(fontUrl.value).catch((error) => {
      setStatus(error.message, true);
    });
  } catch (error) {
    setStatus(error.message, true);
  }
});

fontSize.addEventListener("input", () => {
  root.style.setProperty("--sample-size", `${fontSize.value}px`);
  sizeValue.textContent = `${fontSize.value}px`;
});

fontWeight.addEventListener("input", () => {
  root.style.setProperty("--sample-weight", fontWeight.value);
  weightValue.textContent = fontWeight.value;
});

themeToggle.addEventListener("click", () => {
  const isDark = document.body.dataset.theme !== "dark";
  document.body.dataset.theme = isDark ? "dark" : "light";
  themeToggle.setAttribute("aria-pressed", String(isDark));
});

previousFont.addEventListener("click", () => moveHistory(-1));
nextFont.addEventListener("click", () => moveHistory(1));

copyFontUrl.addEventListener("click", async () => {
  if (!activeFontUrl.value) return;

  try {
    await navigator.clipboard.writeText(activeFontUrl.value);
    setStatus("URL da fonte ativa copiada.");
  } catch {
    activeFontUrl.select();
    document.execCommand("copy");
    setStatus("URL da fonte ativa copiada.");
  }
});

document
  .querySelectorAll(
    ".font-surface h2, .font-surface p, .font-surface span, .font-surface strong, .font-surface small, .font-surface b, .font-surface td, .font-surface .glyph-row, .font-surface .alphabet",
  )
  .forEach((element) => {
    element.contentEditable = "true";
    element.spellcheck = false;
    element.dataset.editableText = "true";
  });

document.addEventListener("keydown", (event) => {
  const tagName = event.target.tagName;
  const isTyping = tagName === "INPUT" || event.target.isContentEditable;
  if (isTyping) return;

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    moveHistory(-1);
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    moveHistory(1);
  }
});

renderHistory();
copyFontUrl.disabled = true;
loadDefaultHistory();
