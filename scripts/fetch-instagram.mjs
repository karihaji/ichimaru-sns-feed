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

try {
  const settled = await Promise.allSettled(accounts.map(fetchAccount));
  const errors = settled.filter((item) => item.status === "rejected").map((item) => item.reason.message);
  const posts = settled
    .filter((item) => item.status === "fulfilled")
    .flatMap((item) => item.value)
    .filter(validInstagramPost)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, config.instagram.maxItems);
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
