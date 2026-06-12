import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../src/config.js";
import { validXPost } from "../src/utils/validation.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const outputPath = resolve(root, "public/data/x.json");
const temporaryPath = `${outputPath}.tmp`;
const bearerToken = process.env.X_BEARER_TOKEN?.trim();

function buildPost(post, users, media) {
  const author = users.get(post.author_id);
  if (!author?.username) return null;
  const attachment = post.attachments?.media_keys?.map((key) => media.get(key)).find(Boolean);
  return {
    id: post.id,
    authorName: author.name || `@${author.username}`,
    authorHandle: `@${author.username}`,
    authorAvatar: author.profile_image_url || "",
    text: post.text,
    createdAt: post.created_at,
    url: `https://x.com/${author.username}/status/${post.id}`,
    mediaUrl: attachment?.url || attachment?.preview_image_url || "",
    mediaType: attachment?.type || ""
  };
}

try {
  if (!bearerToken) throw new Error("X_BEARER_TOKEN is not configured");

  const endpoint = new URL(`https://api.x.com/2/lists/${config.x.listId}/tweets`);
  endpoint.searchParams.set("max_results", String(config.x.maxItems));
  endpoint.searchParams.set("tweet.fields", "created_at,author_id,attachments");
  endpoint.searchParams.set("expansions", "author_id,attachments.media_keys");
  endpoint.searchParams.set("user.fields", "name,username,profile_image_url");
  endpoint.searchParams.set("media.fields", "type,url,preview_image_url,width,height");

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "User-Agent": "ichimaru-sns-feed/1.0 (+GitHub Actions)"
    },
    signal: AbortSignal.timeout(20_000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.detail || payload.title || `HTTP ${response.status}`;
    throw new Error(`X API request failed: ${detail}`);
  }

  const users = new Map((payload.includes?.users || []).map((user) => [user.id, user]));
  const media = new Map((payload.includes?.media || []).map((item) => [item.media_key, item]));
  const posts = (payload.data || [])
    .map((post) => buildPost(post, users, media))
    .filter(validXPost)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, config.x.maxItems);
  if (!posts.length) throw new Error("X API returned no valid List posts");

  const nextJson = `${JSON.stringify(posts, null, 2)}\n`;
  const previousJson = await readFile(outputPath, "utf8").catch(() => "[]\n");
  if (previousJson === nextJson) {
    console.log("X data is already up to date.");
  } else {
    await writeFile(temporaryPath, nextJson, "utf8");
    await rename(temporaryPath, outputPath);
    console.log(`Updated X data with ${posts.length} List posts.`);
  }
} catch (error) {
  await rm(temporaryPath, { force: true });
  console.error(`X update failed; existing data was preserved. ${error.message}`);
  process.exitCode = 1;
}
