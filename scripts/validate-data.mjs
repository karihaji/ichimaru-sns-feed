import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validAccount, validInstagramPost, validYouTubeVideo } from "../src/utils/validation.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const dataDirectory = resolve(root, "public/data");

async function readJson(name) {
  const path = resolve(dataDirectory, name);
  const parsed = JSON.parse(await readFile(path, "utf8"));
  if (!Array.isArray(parsed)) throw new Error(`${name} must contain a JSON array`);
  return parsed;
}

const accounts = await readJson("accounts.json");
const instagram = await readJson("instagram.json");
const youtube = await readJson("youtube.json");
const errors = [];

accounts.forEach((item, index) => { if (!validAccount(item)) errors.push(`accounts.json[${index}] is invalid`); });
instagram.forEach((item, index) => { if (!validInstagramPost(item)) errors.push(`instagram.json[${index}] is invalid`); });
youtube.forEach((item, index) => { if (!validYouTubeVideo(item)) errors.push(`youtube.json[${index}] is invalid`); });

const accountIds = new Set(accounts.filter((item) => item.platform === "instagram").map((item) => item.id.replace(/^instagram-/, "")));
for (const [index, post] of instagram.entries()) {
  if (!accountIds.has(post.accountId)) errors.push(`instagram.json[${index}].accountId is not registered in accounts.json`);
  if (post.thumbnail.startsWith("./")) {
    const imagePath = resolve(root, "public", post.thumbnail.replace(/^\.\//, ""));
    try { await access(imagePath); } catch { errors.push(`instagram.json[${index}].thumbnail does not exist: ${post.thumbnail}`); }
  }
}

if (new Set(accounts.map((item) => item.id)).size !== accounts.length) errors.push("accounts.json contains duplicate ids");
if (new Set(instagram.map((item) => item.id)).size !== instagram.length) errors.push("instagram.json contains duplicate ids");
if (new Set(youtube.map((item) => item.videoId)).size !== youtube.length) errors.push("youtube.json contains duplicate video ids");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${accounts.length} accounts, ${instagram.length} Instagram posts, and ${youtube.length} YouTube videos.`);
}
