#!/usr/bin/env node
"use strict";

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const scriptDir = path.resolve(__dirname);
const root = path.resolve(scriptDir, "..", "..");
const axePath = path.join(root, "client", "node_modules", "axe-core", "axe.min.js");
const axeCode = fs.readFileSync(axePath, "utf8");

const PAGES = [
  { name: "404", url: "http://localhost:3000/not-found" },
  { name: "500", url: "http://localhost:3000/error" },
  { name: "chat-list", url: "http://localhost:3000/chats" },
  { name: "chat-view", url: "http://localhost:3000/chats/elena-vance" },
];

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();

  let totalViolations = 0;

  for (const p of PAGES) {
    try {
      await page.goto(p.url, { waitUntil: "networkidle0", timeout: 30000 });
      await page.addScriptTag({ content: axeCode });
      const result = await page.evaluate(async () => {
        await new Promise((r) => setTimeout(r, 500));
        return axe.run();
      });

      const count = result.violations.length;
      totalViolations += count;
      console.log(`\n${p.name} (${p.url}): ${count} violations`);
      for (const v of result.violations) {
        console.log(`  - ${v.id}: ${v.impact} - ${v.description}`);
        for (const node of v.nodes.slice(0, 2)) {
          console.log(`    ${node.target.join(", ")}`);
        }
      }
    } catch (err) {
      console.error(`\n${p.name}: ERROR - ${err.message}`);
    }
  }

  await browser.close();
  if (totalViolations > 0) {
    console.error(`\nFAIL: ${totalViolations} axe violations found.`);
    process.exit(1);
  }
  console.log("\nPASS: No axe violations.");
})();
