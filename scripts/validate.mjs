#!/usr/bin/env node
// Checks every card on the wall: builders/<username>.json
// Zero dependencies, Node 20+. Used by the "validate" GitHub Action and by build.mjs.
//   node scripts/validate.mjs           → checks the builders/ folder
//   node scripts/validate.mjs <folder>  → checks another folder

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const KEYS = ["github", "name", "school", "role", "emoji", "message"];
export const ROLES = ["Dev", "Design", "Data", "Product", "Business", "Curious"];
const LIMITS = { name: 30, school: 20, message: 80 };
// GitHub username: letters, digits, single hyphens, 39 characters max, lowercase here.
const GITHUB_RE = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/;
// Links and HTML tags are forbidden; a lone "<" or ">" (e.g. "Design > code", "<3") is still allowed.
const FORBIDDEN_RE = /https?:\/\/|www\.|<\s*[a-z\/!][^>]*>/i;
const EMOJI_RE = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;

const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
const graphemes = (s) => [...segmenter.segment(s)].length;

/** Checks an already parsed card. Returns a list of { message, hint }. */
export function checkCard(data, slug) {
  const errors = [];
  const err = (message, hint) => errors.push({ message, hint });

  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    err("the file must contain a JSON object { ... }", "copy builders/_template.json and only change the values");
    return errors;
  }

  const keys = Object.keys(data);
  const missing = KEYS.filter((k) => !keys.includes(k));
  const extra = keys.filter((k) => !KEYS.includes(k));
  if (missing.length) err(`missing field(s): ${missing.join(", ")}`, "keep exactly the 6 fields of the template");
  if (extra.length) err(`extra field(s): ${extra.join(", ")}`, `the only allowed fields are: ${KEYS.join(", ")}`);

  for (const k of KEYS) {
    if (!(k in data)) continue;
    const v = data[k];
    if (typeof v !== "string") { err(`"${k}" must be text between quotes`, `example: "${k}": "..."`); continue; }
    if (!v.trim()) { err(`"${k}" is empty`, "fill in this field"); continue; }
    if (v !== v.trim()) err(`"${k}" starts or ends with a space`, "remove the spaces at the start and the end");
  }

  const str = (k) => (typeof data[k] === "string" ? data[k].trim() : null);

  const gh = str("github");
  if (gh !== null && gh) {
    if (!GITHUB_RE.test(gh)) {
      err(`"github": "${gh}" is not a valid GitHub username`,
        "write your username in lowercase, without @ or spaces (e.g. \"ada-lovelace\")");
    } else if (gh !== slug.toLowerCase()) { // file name casing is reported separately
      err(`the username "${gh}" does not match the file name "${slug}.json"`,
        `rename the file to builders/${gh}.json (or fix "github")`);
    }
  }

  for (const [k, max] of Object.entries(LIMITS)) {
    const v = str(k);
    if (v && graphemes(v) > max) err(`"${k}" is ${graphemes(v)} characters long (max ${max})`, "make the text shorter");
  }

  for (const k of ["name", "school", "message"]) {
    const v = str(k);
    if (v && FORBIDDEN_RE.test(v)) err(`"${k}" contains a link or HTML`, "no links and no HTML tags: plain text only");
  }

  const role = str("role");
  if (role && !ROLES.includes(role)) err(`"role": "${role}" is not in the list`, `pick exactly one of: ${ROLES.join(", ")}`);

  const emoji = str("emoji");
  if (emoji) {
    if (graphemes(emoji) !== 1 || !EMOJI_RE.test(emoji)) err(`"emoji": "${emoji}" must be one single emoji`, "example: \"🚀\" (just one, no text)");
  }

  return errors;
}

/** Reads and checks a whole folder. Returns { cards, problems }. */
export function validateDir(dir) {
  const cards = [];
  const problems = []; // { file, message, hint }
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    problems.push({ file: dir, message: "folder not found", hint: "run the command from the root of the repo" });
    return { cards, problems };
  }

  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const file = `builders/${e.name}`;
    if (e.name.startsWith("_") || e.name === ".gitkeep") continue;
    if (!e.isFile()) { problems.push({ file, message: "no sub-folders inside builders/", hint: "put your file directly inside builders/" }); continue; }
    if (!e.name.endsWith(".json")) {
      problems.push({ file, message: "only .json files are allowed here", hint: "your file must be called builders/<your-username>.json" });
      continue;
    }
    const slug = e.name.slice(0, -".json".length);
    if (slug !== slug.toLowerCase()) {
      problems.push({ file, message: "the file name must be lowercase", hint: `rename it to builders/${slug.toLowerCase()}.json` });
    }

    let raw = readFileSync(join(dir, e.name), "utf8").replace(/^﻿/, "");
    let data;
    try {
      data = JSON.parse(raw);
    } catch (x) {
      problems.push({ file, message: `invalid JSON (${x.message})`,
        hint: "check the straight quotes \" \", the commas between lines and that there is no comma after the last line" });
      continue;
    }
    const errs = checkCard(data, slug);
    for (const p of errs) problems.push({ file, ...p });
    if (!errs.length) cards.push(Object.fromEntries(KEYS.map((k) => [k, data[k].trim()])));
  }
  return { cards, problems };
}

export function printReport({ cards, problems }) {
  if (problems.length) {
    console.error(`\n✗ ${problems.length} problem(s) found:\n`);
    for (const p of problems) {
      console.error(`  ${p.file}`);
      console.error(`    ✗ ${p.message}`);
      if (p.hint) console.error(`    → ${p.hint}`);
    }
    console.error("\nFix it, make a new commit, then git push: the check runs again by itself.\n");
  } else {
    console.log(`✓ ${cards.length} valid card(s). All good!`);
  }
}

// Direct run: node scripts/validate.mjs [folder]
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const dir = process.argv[2] ? resolve(process.argv[2]) : join(root, "builders");
  const result = validateDir(dir);
  printReport(result);
  process.exit(result.problems.length ? 1 : 0);
}
