import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../src/config.js";
import { validYouTubeVideo } from "../src/utils/validation.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const outputPath = resolve(root, "public/data/youtube.json");
const temporaryPath = `${outputPath}.tmp`;
const feedUrl = process.env.YOUTUBE_FEED_URL || config.youtube.feedUrl;
const retryDelays = [1_000, 3_000];

function decodeXml(value = "") {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

function tagText(xml, tagName) {
  return decodeXml(xml.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i"))?.[1]?.trim() || "");
}

function parseFeed(xml) {
  if (!xml.includes("<feed") || !xml.includes("</feed>")) throw new Error("YouTube returned incomplete XML");
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) || [];
  return entries.map((entry) => {
    const videoId = tagText(entry, "yt:videoId");
    const title = tagText(entry, "title");
    const publishedAt = tagText(entry, "published");
    const thumbnail = entry.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)?.[1] || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    return {
      videoId,
      title,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      publishedAt,
      thumbnail: decodeXml(thumbnail)
    };
  });
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function isRetryableStatus(status) {
  return status === 404 || status === 408 || status === 429 || status >= 500;
}

async function fetchFeedXml() {
  let lastError;
  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    const response = await fetch(feedUrl, {
      headers: { "User-Agent": "ichimaru-sns-feed/1.0 (+GitHub Actions)" },
      signal: AbortSignal.timeout(20_000)
    });
    if (response.ok) return response.text();
    lastError = new Error(`YouTube feed request failed: HTTP ${response.status}`);
    if (!isRetryableStatus(response.status) || attempt === retryDelays.length) break;
    console.warn(`${lastError.message}; retrying in ${retryDelays[attempt] / 1000}s.`);
    await sleep(retryDelays[attempt]);
  }
  throw lastError;
}

async function readExistingValidVideos() {
  const previousJson = await readFile(outputPath, "utf8").catch(() => "[]");
  return JSON.parse(previousJson).filter(validYouTubeVideo);
}

let videos;
try {
  const xml = await fetchFeedXml();
  videos = parseFeed(xml)
    .filter(validYouTubeVideo)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, config.youtube.maxItems);
  if (!videos.length) throw new Error("YouTube feed did not contain valid videos");
} catch (error) {
  await rm(temporaryPath, { force: true });
  const existingVideos = await readExistingValidVideos().catch(() => []);
  if (existingVideos.length) {
    console.warn(`YouTube update skipped; existing data with ${existingVideos.length} videos was preserved. ${error.message}`);
  } else {
    console.error(`YouTube update failed and no valid existing data was available. ${error.message}`);
    process.exitCode = 1;
  }
  process.exit();
}

try {
  const nextJson = `${JSON.stringify(videos, null, 2)}\n`;
  JSON.parse(nextJson);
  const previousJson = await readFile(outputPath, "utf8").catch(() => "[]\n");
  if (previousJson === nextJson) {
    console.log("YouTube data is already up to date.");
  } else {
    await writeFile(temporaryPath, nextJson, "utf8");
    await rename(temporaryPath, outputPath);
    console.log(`Updated YouTube data with ${videos.length} videos.`);
  }
} catch (error) {
  await rm(temporaryPath, { force: true });
  console.error(`YouTube update failed while writing data. ${error.message}`);
  process.exitCode = 1;
}
