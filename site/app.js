// Builders Wall — loads builders.json, shows the cards and refreshes every 20 s.
// All text coming from participants goes through textContent: never raw HTML.
//
// Projector mode: add ?tv to the URL (…/dvb-git-workshop/?tv).
// Compact header, and every new card lands at the top of the wall, with an automatic scroll back to the top.

const REFRESH_MS = 20_000;
const TV = new URLSearchParams(location.search).has("tv");
const grid = document.getElementById("grid");
const tpl = document.getElementById("card-tpl");
const countEl = document.getElementById("count");
const countLabel = document.getElementById("count-label");
const empty = document.getElementById("empty");
const status = document.getElementById("status");
const live = document.querySelector(".live");

const cards = new Map(); // username → <li>
let order = [];          // display order: alphabetical on load, then newcomers first
let firstLoad = true;

if (TV) document.body.dataset.tv = "";

// On GitHub Pages (<owner>.github.io/<repo>/), show the real repo link.
(function showRepoLink() {
  const host = location.hostname;
  if (!host.endsWith(".github.io")) return;
  const owner = host.split(".")[0];
  const repo = location.pathname.split("/").filter(Boolean)[0];
  if (!repo) return;
  const link = document.getElementById("repo-link");
  link.href = `https://github.com/${owner}/${repo}`;
  link.textContent = `github.com/${owner}/${repo}`;
})();

function initials(name) {
  const parts = name.replace(/[^\p{L}\p{N}\s-]/gu, " ").split(/[\s-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function buildCard(b) {
  const li = tpl.content.firstElementChild.cloneNode(true);
  li.dataset.github = b.github;
  const link = li.querySelector(".card__link");
  link.href = `https://github.com/${encodeURIComponent(b.github)}`;
  link.setAttribute("aria-label", `${b.name} on GitHub`);

  const avatar = li.querySelector(".avatar");
  const img = avatar.querySelector("img");
  avatar.querySelector(".avatar__fallback").textContent = initials(b.name);
  img.addEventListener("load", () => avatar.classList.add("has-img"));
  img.addEventListener("error", () => img.remove());
  img.src = `https://github.com/${encodeURIComponent(b.github)}.png?size=160`;

  li.querySelector(".emoji").textContent = b.emoji;
  li.querySelector(".name").textContent = b.name;
  li.querySelector(".handle").textContent = `@${b.github}`;
  li.querySelector(".school").textContent = b.school;
  li.querySelector(".role").textContent = b.role;
  li.querySelector(".message").textContent = b.message;
  li._data = JSON.stringify(b);
  return li;
}

function render(builders) {
  const byId = new Map(builders.map((b) => [b.github, b]));
  const arrived = [];

  // Removed or changed cards
  for (const [gh, li] of cards) {
    const b = byId.get(gh);
    if (!b) { li.remove(); cards.delete(gh); continue; }
    if (li._data !== JSON.stringify(b)) {
      const fresh = buildCard(b);
      li.replaceWith(fresh);
      cards.set(gh, fresh);
    }
  }

  // New cards
  for (const b of builders) {
    if (cards.has(b.github)) continue;
    const li = buildCard(b);
    if (!firstLoad) li.classList.add("is-new");
    cards.set(b.github, li);
    arrived.push(b.github);
  }

  if (firstLoad) {
    order = builders.map((b) => b.github);               // already sorted by name in builders.json
  } else {
    order = order.filter((gh) => byId.has(gh));
    order = TV ? [...arrived.reverse(), ...order]         // projector: newcomers first
               : builders.map((b) => b.github);           // otherwise: alphabetical order
  }
  order.forEach((gh, i) => {
    const li = cards.get(gh);
    if (grid.children[i] !== li) grid.insertBefore(li, grid.children[i] ?? null);
  });

  const n = builders.length;
  countEl.textContent = n;
  countLabel.textContent = n > 1 ? "builders" : "builder";
  empty.hidden = n > 0;
  document.body.dataset.density = n > 40 ? "dense" : n > 15 ? "compact" : "";

  if (TV && !firstLoad && arrived.length) window.scrollTo({ top: 0, behavior: "smooth" });
  firstLoad = false;
}

async function load() {
  try {
    const res = await fetch(`builders.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    render(Array.isArray(data.builders) ? data.builders : []);
    live.classList.remove("is-offline");
    status.hidden = true;
  } catch (e) {
    live.classList.add("is-offline");
    status.hidden = false;
    status.textContent = `Could not load the wall (${e.message}). Trying again in 20 s…`;
  }
}

load();
setInterval(load, REFRESH_MS);
