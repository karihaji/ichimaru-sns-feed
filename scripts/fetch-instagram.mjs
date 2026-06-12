import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../src/config.js";
import { validInstagramPost } from "../src/utils/validation.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const accountsPath = resolve(root, "public/data/accounts.json");
const outputPath = resolve(root, "public/data/instagram.json");
const temporaryPath = `${outputPath}.tmp`;
const appId = "936619743392459";

const accounts = JSON.parse(await readFile(accountsPath, "utf8"))
  .filter((account) => account.platform === "instagram" && account.enabled !== false);

function accountId(account) {
  return account.id.replace(/^instagram-/, "");
}

function captionText(node, account) {
  const text = node.edge_media_to_caption?.edges?.[0]?.node?.text?.trim();
  return text || `${account.displayName}のInstagram投稿`;
}

async function fetchAccount(account) {
  const username = account.url.split("/").filter(Boolean).at(-1);
  const response = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`, {
    headers: {
      "x-ig-app-id": appId,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
      "Accept-Language": "ja,en-US;q=0.8,en;q=0.7"
    },
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error(`${username}: HTTP ${response.status}`);
  const payload = await response.json();
  const edges = payload?.data?.user?.edge_owner_to_timeline_media?.edges;
  if (!Array.isArray(edges)) throw new Error(`${username}: timeline data missing`);
  return edges.slice(0, 3).map(({ node }) => ({
    id: `instagram-${node.shortcode}`,
    accountId: accountId(account),
    accountName: account.displayName,
    accountHandle: account.handle,
    accountUrl: account.url,
    postUrl: `https://www.instagram.com/p/${node.shortcode}/`,
    publishedAt: new Date(node.taken_at_timestamp * 1000).toISOString().slice(0, 10),
    caption: captionText(node, account).slice(0, 240),
    thumbnail: node.thumbnail_src || node.display_url,
    alt: `${account.displayName}のInstagram投稿画像`,
    type: node.is_video ? "video" : "image",
    enabled: true
  }));
}

async function fetchAccountsWithBrowser(targetAccounts) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "en-US",
    viewport: { width: 1280, height: 900 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36"
  });
  const results = [];
  const errors = [];
  try {
    for (const account of targetAccounts) {
      const page = await context.newPage();
      try {
        await page.goto(account.url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const decline = page.getByRole("button", { name: /Decline optional cookies/i });
        if (await decline.count()) await decline.click().catch(() => {});
        await page.waitForTimeout(8_000);
        const rawPosts = await page.locator('a[href*="/p/"], a[href*="/reel/"]').evaluateAll((links) => {
          const seen = new Set();
          return links.map((link) => {
            const href = link.href;
            const image = link.querySelector("img");
            return { href, thumbnail: image?.currentSrc || image?.src || "", alt: image?.alt || "" };
          }).filter((item) => {
            if (!item.href || !item.thumbnail || seen.has(item.href)) return false;
            seen.add(item.href);
            return true;
          }).slice(0, 3);
        });
        if (!rawPosts.length) throw new Error("no public post links in rendered page");
        rawPosts.forEach((post) => {
          const shortcode = post.href.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/)?.[1];
          if (!shortcode) return;
          results.push({
            id: `instagram-${shortcode}`,
            accountId: accountId(account),
            accountName: account.displayName,
            accountHandle: account.handle,
            accountUrl: account.url,
            postUrl: post.href.split("?")[0],
            publishedAt: new Date().toISOString().slice(0, 10),
            caption: `${account.displayName}の最新Instagram投稿`,
            thumbnail: post.thumbnail,
            alt: post.alt || `${account.displayName}のInstagram投稿画像`,
            type: post.href.includes("/reel/") ? "video" : "image",
            enabled: true
          });
        });
      } catch (error) {
        errors.push(`${account.handle}: ${error.message}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  return { posts: results.filter(validInstagramPost), errors };
}

try {
  const settled = await Promise.allSettled(accounts.map(fetchAccount));
  const errors = settled.filter((item) => item.status === "rejected").map((item) => item.reason.message);
  let posts = settled
    .filter((item) => item.status === "fulfilled")
    .flatMap((item) => item.value)
    .filter(validInstagramPost)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, config.instagram.maxItems);
  if (!posts.length) {
    console.warn(`Public endpoint unavailable; trying rendered pages. ${errors.join("; ")}`);
    const browserResult = await fetchAccountsWithBrowser(accounts);
    posts = browserResult.posts
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, config.instagram.maxItems);
    errors.push(...browserResult.errors);
  }
  if (!posts.length) throw new Error(`No valid posts. ${errors.join("; ")}`);
  if (errors.length) console.warn(`Partial Instagram update: ${errors.join("; ")}`);
  const nextJson = `${JSON.stringify(posts, null, 2)}\n`;
  JSON.parse(nextJson);
  await writeFile(temporaryPath, nextJson, "utf8");
  await rename(temporaryPath, outputPath);
  console.log(`Updated Instagram data with ${posts.length} posts from ${settled.length - errors.length}/${accounts.length} accounts.`);
} catch (error) {
  await rm(temporaryPath, { force: true });
  console.error(`Instagram update failed; existing data was preserved. ${error.message}`);
  process.exitCode = 1;
}
