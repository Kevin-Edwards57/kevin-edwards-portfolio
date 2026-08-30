// Flip a project to "live" on the portfolio when its store listing actually resolves.
//
// The rule this file exists to enforce: a project is launched when the public can
// install it, not when the code compiles or a build succeeds. The only evidence
// accepted here is a store listing that returns a real record.
//
// Apple: the iTunes Lookup API is free, unauthenticated, and authoritative. A
// resultCount of 0 means the app is not publicly listed, including while it sits
// in review.
//
// Google: there is no equivalent public API, so this checks whether the store page
// resolves. A 404 means not published. This is a status check on a public page, not
// scraping, and nothing is parsed out of the HTML.
//
// Transitions are one way. Once live, a project is never flipped back by this script,
// because a network blip or a rate limit must never quietly un-launch something on a
// portfolio a recruiter is reading.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const HTML = "index.html";
const STATE = "launch-state.json";
const UA = "Mozilla/5.0 (portfolio launch checker)";

const watch = JSON.parse(readFileSync("watch.json", "utf8"));
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : { projects: {} };

async function appStore(bundleId) {
  if (!bundleId) return null;
  const r = await fetch(`https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(bundleId)}`, {
    headers: { "User-Agent": UA },
  });
  if (!r.ok) return null;
  const d = await r.json();
  if (!d.resultCount) return null;
  const a = d.results[0];
  return {
    url: a.trackViewUrl.split("?")[0],
    version: a.version,
    released: (a.currentVersionReleaseDate || "").slice(0, 10),
  };
}

async function playStore(pkg) {
  if (!pkg) return null;
  const url = `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}`;
  const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  return r.status === 200 ? { url } : null;
}

let html = readFileSync(HTML, "utf8");
let changed = false;
const report = [];

for (const p of watch.projects) {
  const prev = state.projects[p.slug];
  if (prev?.live) {
    report.push(`${p.name}: already live, skipped`);
    continue;
  }

  const [ios, android] = await Promise.all([appStore(p.iosBundleId), playStore(p.androidPackage)]);
  if (!ios && !android) {
    report.push(`${p.name}: not published yet`);
    continue;
  }

  const label = ios && android ? "Live on iOS and Android" : ios ? "Live on the App Store" : "Live on Google Play";

  const pill = new RegExp(`(<span class="pill )dev(" data-status="${p.slug}">)[^<]*(</span>)`);
  if (!pill.test(html)) throw new Error(`status anchor missing for ${p.slug}`);
  html = html.replace(pill, `$1live$2${label}$3`);

  const links = [
    ios ? `<a class="storelink" href="${ios.url}" target="_blank" rel="noopener">App Store &#8599;</a>` : "",
    android ? `<a class="storelink" href="${android.url}" target="_blank" rel="noopener">Google Play &#8599;</a>` : "",
  ].filter(Boolean).join("\n            ");
  html = html.replace(`<!--storelinks:${p.slug}-->`, `<div class="storelinks">\n            ${links}\n          </div>`);

  state.projects[p.slug] = {
    live: true,
    detected: new Date().toISOString().slice(0, 10),
    ios: ios || null,
    android: android || null,
  };
  changed = true;
  report.push(`${p.name}: LAUNCHED (${label})`);
}

// The hero counter is a claim about how many products the public can install.
// It is derived from the same evidence as the pills, never set by hand.
{
  const shipped = 1 + Object.values(state.projects).filter((p) => p.live).length; // 1 = YardLink Eats
  const label = shipped === 1 ? "Product on the stores" : "Products on the stores";
  const before = html;
  html = html
    .replace(/(<b data-shipped>)\d+(<\/b>)/, `$1${shipped}$2`)
    .replace(/(<span data-shipped-label>)[^<]*(<\/span>)/, `$1${label}$2`);
  if (html !== before) {
    changed = true;
    report.push(`hero counter: ${shipped} shipped`);
  }
}

console.log(report.join("\n"));

if (changed) {
  writeFileSync(HTML, html);
  writeFileSync(STATE, JSON.stringify(state, null, 2) + "\n");
  console.log("\nchanged=true");
} else {
  console.log("\nchanged=false");
}
