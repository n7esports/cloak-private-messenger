#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const scriptDir = path.resolve(__dirname);
const root = path.resolve(scriptDir, "..", "..", "client");
const footerPath = path.join(root, "components", "Footer.tsx");

if (!fs.existsSync(footerPath)) {
  console.error("Footer.tsx not found at", footerPath);
  process.exit(1);
}

const footerCode = fs.readFileSync(footerPath, "utf8");
const hrefMatches = [
  ...footerCode.matchAll(/href="([^"]+)"/g),
  ...footerCode.matchAll(/href:\s*"([^"]+)"/g),
].map((m) => m[1]);

const seen = new Set();
const unique = [];
for (const href of hrefMatches) {
  if (!seen.has(href)) {
    seen.add(href);
    unique.push(href);
  }
}

const missing = [];
for (const href of unique) {
  const routePath = href.replace(/^\//, "").replace(/\/$/, "");
  const pagePath = path.join(root, "app", ...routePath.split("/"), "page.tsx");
  if (!fs.existsSync(pagePath)) {
    missing.push({ href, pagePath });
  }
}

if (missing.length > 0) {
  console.error("Footer links point to missing pages:");
  for (const m of missing) {
    console.error(`  ${m.href} -> ${path.relative(root, m.pagePath)}`);
  }
  process.exit(1);
}

console.log(`OK: ${unique.length} footer links verified.`);
