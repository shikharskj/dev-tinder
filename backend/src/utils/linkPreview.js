import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";

const MAX_BYTES = 256 * 1024;
const TIMEOUT_MS = 4000;
const MAX_REDIRECTS = 2;
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map();

function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const lower = address.toLowerCase();
  if (lower.startsWith("::ffff:")) {
    const rest = lower.slice(7);
    if (net.isIPv4(rest)) return isPrivateAddress(rest);
    const [high, low] = rest.split(":").map((part) => parseInt(part, 16));
    if (Number.isNaN(high) || Number.isNaN(low)) return true;
    return isPrivateAddress(
      [high >> 8, high & 255, low >> 8, low & 255].join("."),
    );
  }
  return (
    lower === "::" ||
    lower === "::1" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe8") ||
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb") ||
    lower.startsWith("ff")
  );
}

// Validating inside `lookup` means the address we connect to is the address we
// checked, which defeats DNS-rebinding between check and connect.
function safeLookup(hostname, options, callback) {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error);
    const list = Array.isArray(addresses) ? addresses : [addresses];
    if (!list.length || list.some(({ address }) => isPrivateAddress(address))) {
      return callback(new Error("Blocked address."));
    }
    if (options?.all) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  });
}

function fetchHtml(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    let target;
    try {
      target = new URL(url);
    } catch {
      return reject(new Error("Invalid URL."));
    }
    if (!["http:", "https:"].includes(target.protocol) || target.username || target.password) {
      return reject(new Error("Unsupported URL."));
    }
    const literalHost = target.hostname.replace(/^\[|\]$/g, "");
    if (net.isIP(literalHost) && isPrivateAddress(literalHost)) {
      return reject(new Error("Blocked address."));
    }

    const transport = target.protocol === "https:" ? https : http;
    const request = transport.request(
      target,
      {
        method: "GET",
        lookup: safeLookup,
        timeout: TIMEOUT_MS,
        headers: {
          "User-Agent": "DevTinderLinkPreview/1.0",
          Accept: "text/html,application/xhtml+xml",
        },
      },
      (response) => {
        const status = response.statusCode || 0;
        if (status >= 300 && status < 400 && response.headers.location) {
          response.resume();
          if (redirects >= MAX_REDIRECTS) return reject(new Error("Too many redirects."));
          return resolve(
            fetchHtml(new URL(response.headers.location, target).href, redirects + 1),
          );
        }
        if (status !== 200 || !/text\/html|xhtml/i.test(response.headers["content-type"] || "")) {
          response.resume();
          return reject(new Error("No preview available."));
        }

        const chunks = [];
        let received = 0;
        response.on("data", (chunk) => {
          received += chunk.length;
          if (received > MAX_BYTES) {
            response.destroy();
            return resolve({ html: Buffer.concat(chunks).toString("utf8"), url: target.href });
          }
          chunks.push(chunk);
        });
        response.on("end", () =>
          resolve({ html: Buffer.concat(chunks).toString("utf8"), url: target.href }),
        );
        response.on("error", reject);
      },
    );
    request.on("timeout", () => request.destroy(new Error("Timed out.")));
    request.on("error", reject);
    request.end();
  });
}

function decodeEntities(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function metaContent(html, names) {
  for (const name of names) {
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`,
      "i",
    );
    const tag = html.match(pattern)?.[0];
    const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
    if (content) return decodeEntities(content.trim());
  }
  return "";
}

function parsePreview(html, pageUrl) {
  const head = html.slice(0, MAX_BYTES);
  const title =
    metaContent(head, ["og:title", "twitter:title"]) ||
    decodeEntities(head.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || "");
  const description = metaContent(head, [
    "og:description",
    "twitter:description",
    "description",
  ]);
  let image = metaContent(head, ["og:image", "twitter:image"]);
  if (image) {
    try {
      const resolved = new URL(image, pageUrl);
      image = resolved.protocol === "https:" ? resolved.href : "";
    } catch {
      image = "";
    }
  }
  const siteName =
    metaContent(head, ["og:site_name"]) || new URL(pageUrl).hostname;

  if (!title && !description) return null;
  return {
    url: pageUrl,
    title: title.slice(0, 160),
    description: description.slice(0, 300),
    image,
    siteName: siteName.slice(0, 80),
  };
}

export async function getLinkPreview(url) {
  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) return cached.value;

  const { html, url: finalUrl } = await fetchHtml(url);
  const value = parsePreview(html, finalUrl);

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(url, { value, expires: Date.now() + CACHE_TTL_MS });
  return value;
}
