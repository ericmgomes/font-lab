const http = require("node:http");
const path = require("node:path");
const { inflateRawSync } = require("node:zlib");
const { readFile } = require("node:fs/promises");

const host = "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const rootDir = __dirname;
const fontExtensions = new Set([".woff2", ".woff", ".ttf", ".otf"]);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": mimeTypes[".json"] });
  response.end(JSON.stringify(payload));
}

function sanitizeFilePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const cleanPath = decoded === "/" ? "/index.html" : decoded;
  const resolved = path.resolve(rootDir, `.${cleanPath}`);

  if (!resolved.startsWith(rootDir)) {
    return null;
  }

  return resolved;
}

function dafontSlugFromUrl(value) {
  const parsed = new URL(value);
  const hostName = parsed.hostname.replace(/^www\./, "");

  if (hostName !== "dafont.com") {
    throw new Error("Use uma URL do dafont.com.");
  }

  const match = parsed.pathname.match(/\/(?:[a-z]{2}\/)?([^/]+)\.font$/i);
  if (!match) {
    throw new Error("Nao reconheci o formato da URL do Dafont. Exemplo: https://www.dafont.com/pt/squarefont.font");
  }

  return match[1];
}

async function downloadDafontZip(slug) {
  const slugs = [...new Set([slug, slug.replace(/-/g, "_")])];
  let lastError = "";

  for (const candidate of slugs) {
    const downloadUrl = `https://dl.dafont.com/dl/?f=${encodeURIComponent(candidate)}`;
    const response = await fetch(downloadUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 Font Lab local preview",
        "accept": "application/zip,application/octet-stream,*/*",
      },
    });

    if (!response.ok) {
      lastError = `O Dafont respondeu com HTTP ${response.status}.`;
      continue;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const isZip = buffer.length > 4 && buffer.readUInt32LE(0) === 0x04034b50;
    if (isZip) return buffer;

    lastError = `O download ${candidate} nao retornou um ZIP de fonte.`;
  }

  throw new Error(lastError || "Nao consegui baixar o ZIP do Dafont.");
}

function readZipEntries(zipBuffer) {
  const entries = [];
  let endDirectoryOffset = -1;

  for (let offset = zipBuffer.length - 22; offset >= 0; offset -= 1) {
    if (zipBuffer.readUInt32LE(offset) === 0x06054b50) {
      endDirectoryOffset = offset;
      break;
    }
  }

  if (endDirectoryOffset === -1) {
    return entries;
  }

  const entryCount = zipBuffer.readUInt16LE(endDirectoryOffset + 10);
  let centralOffset = zipBuffer.readUInt32LE(endDirectoryOffset + 16);

  for (let index = 0; index < entryCount; index += 1) {
    if (zipBuffer.readUInt32LE(centralOffset) !== 0x02014b50) break;

    const method = zipBuffer.readUInt16LE(centralOffset + 10);
    const compressedSize = zipBuffer.readUInt32LE(centralOffset + 20);
    const fileNameLength = zipBuffer.readUInt16LE(centralOffset + 28);
    const extraLength = zipBuffer.readUInt16LE(centralOffset + 30);
    const commentLength = zipBuffer.readUInt16LE(centralOffset + 32);
    const localHeaderOffset = zipBuffer.readUInt32LE(centralOffset + 42);
    const fileNameStart = centralOffset + 46;
    const fileName = zipBuffer.toString("utf8", fileNameStart, fileNameStart + fileNameLength);

    if (zipBuffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) break;

    const localFileNameLength = zipBuffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = zipBuffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    const compressed = zipBuffer.subarray(dataStart, dataEnd);

    let data;
    if (method === 0) {
      data = compressed;
    } else if (method === 8) {
      data = inflateRawSync(compressed);
    } else {
      data = null;
    }

    entries.push({ fileName, data });
    centralOffset = fileNameStart + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function pickFontFromZip(zipBuffer) {
  const entries = readZipEntries(zipBuffer);
  return entries.find((entry) => {
    const extension = path.extname(entry.fileName).toLowerCase();
    return entry.data && fontExtensions.has(extension) && !entry.fileName.startsWith("__MACOSX/");
  });
}

async function handleDafont(request, response) {
  try {
    const requestUrl = new URL(request.url, `http://${host}:${port}`);
    const sourceUrl = requestUrl.searchParams.get("url");
    if (!sourceUrl) throw new Error("Informe a URL do Dafont.");

    const slug = dafontSlugFromUrl(sourceUrl);
    const zipBuffer = await downloadDafontZip(slug);
    const fontEntry = pickFontFromZip(zipBuffer);

    if (!fontEntry) {
      throw new Error("Baixei o ZIP, mas nao encontrei .ttf, .otf, .woff ou .woff2 dentro dele.");
    }

    const extension = path.extname(fontEntry.fileName).toLowerCase();
    const fontName = path.basename(fontEntry.fileName, extension).replace(/[-_]+/g, " ");

    response.writeHead(200, {
      "content-type": mimeTypes[extension] || "application/octet-stream",
      "cache-control": "no-store",
      "x-font-name": encodeURIComponent(fontName),
      "x-font-source": encodeURIComponent(fontEntry.fileName),
    });
    response.end(fontEntry.data);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
  }
}

async function serveStatic(request, response) {
  const filePath = sanitizeFilePath(request.url);
  if (!filePath) {
    sendJson(response, 403, { error: "Caminho invalido." });
    return;
  }

  try {
    const extension = path.extname(filePath).toLowerCase();
    const contents = await readFile(filePath);
    response.writeHead(200, { "content-type": mimeTypes[extension] || "application/octet-stream" });
    response.end(contents);
  } catch {
    sendJson(response, 404, { error: "Arquivo nao encontrado." });
  }
}

const server = http.createServer((request, response) => {
  if (request.url.startsWith("/api/dafont-font")) {
    handleDafont(request, response);
    return;
  }

  serveStatic(request, response);
});

server.listen(port, host, () => {
  console.log(`Font Lab rodando em http://${host}:${port}`);
});
