#!/usr/bin/env node
// Builds the static site in _site/: copies site/ and generates _site/builders.json.
// Zero dependencies, Node 20+. Used by the "deploy" GitHub Action.

import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateDir, printReport } from "./validate.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "_site");

const result = validateDir(join(root, "builders"));
printReport(result);
if (result.problems.length) process.exit(1);

const cards = result.cards.sort((a, b) =>
  a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.github.localeCompare(b.github));

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, "site"), out, { recursive: true });
writeFileSync(join(out, "builders.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), count: cards.length, builders: cards }, null, 2) + "\n");
writeFileSync(join(out, ".nojekyll"), "");

console.log(`✓ _site/ generated with ${cards.length} builder(s).`);
