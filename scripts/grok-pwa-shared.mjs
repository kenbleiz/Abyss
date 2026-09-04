/** Minimal stub — full Grok Build shared module was not pushed; enough for Vercel builds. */

export const DEFAULT_APP_NAME = "Abyss";
export const OG_SERVICE_URL_DEFAULT = "";
export const OG_SITE_REL_PATH = "og-site.json";
export const GROK_EXTENSIONS_SCRIPT_SRC = "";

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function appNameFromHost() {
  return DEFAULT_APP_NAME;
}

export function publicAppHost(hostHeader) {
  return resolvePublicHost(hostHeader);
}

export function resolvePublicHost(hostHeader) {
  if (!hostHeader) return "";
  return String(hostHeader).split(",")[0].trim();
}

export function isInstallQuery(url) {
  try {
    const q = (url ?? "").split("?")[1] ?? "";
    return new URLSearchParams(q).has("install");
  } catch {
    return false;
  }
}

export function isDocumentPath(pathname) {
  const p = pathname || "/";
  if (p === "/") return true;
  if (p.includes(".")) return false;
  return true;
}

export function acceptsHtml(accept) {
  return String(accept ?? "").includes("text/html");
}

export function stripInstallParams(url) {
  return url ?? "/";
}

export function renderInstallPageHtml(template) {
  return template || "<!doctype html><html><body>Abyss</body></html>";
}

export function renderWebManifest(hostHeader) {
  const name = appNameFromHost(hostHeader);
  return JSON.stringify({
    name,
    short_name: name,
    start_url: "/",
    display: "standalone",
    background_color: "#0a0f14",
    theme_color: "#0a0f14",
  });
}

export function grokPwaHeadTags(appName = DEFAULT_APP_NAME) {
  return [
    ["link", `rel="manifest" href="/__grok/manifest.webmanifest"`],
    ["meta", `name="application-name" content="${escapeHtml(appName)}"`],
  ];
}

export function readGrokProjectId() {
  return "";
}
export function readXCreator() {
  return "";
}
export function readXCreatorId() {
  return "";
}
export function grokXCreatorHeadTags() {
  return [];
}
export function grokExtensionsHeadTags() {
  return [];
}

export function readOgSite() {
  return {};
}
export function ogCardPublicPath() {
  return "";
}
export function snapshotOgIdentity() {
  return { site: {} };
}
export function customOgAssetPath() {
  return "";
}
export function resolveOgCardAsset() {
  return "";
}
export function ogServiceUrl() {
  return OG_SERVICE_URL_DEFAULT;
}
export function titleFromDocument(html) {
  const m = String(html).match(/<title[^>]*>([^<]*)<\/title>/i);
  return m?.[1]?.trim() ?? "";
}
export function resolveOgTitle(site, appName) {
  return site?.title || appName || DEFAULT_APP_NAME;
}
export function siteHasCustomCard() {
  return false;
}
export function grokOgHeadTags() {
  return [];
}
export function stripShareMetaTags(html) {
  return html;
}

export function normalizeHeadContext(ctx = {}) {
  return {
    appName: ctx.appName || DEFAULT_APP_NAME,
    projectId: ctx.projectId || "",
    creator: ctx.creator || "",
    creatorId: ctx.creatorId || "",
    host: ctx.host || "",
    cwd: ctx.cwd || process.cwd(),
    site: ctx.site || {},
  };
}

export function injectGrokPwaHead(html) {
  return html;
}

export function createHeadInjector() {
  return {
    push() {
      return [];
    },
    flush() {
      return [];
    },
  };
}
