import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../src/config.js";
import { validYouTubeVideo } from "../src/utils/validation.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const outputPath = resolve(root, "public/data/youtube.json");
const temporaryPath = `${outputPath}.tmp`;

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

try {
  const response = await fetch(config.youtube.feedUrl, {
    headers: { "User-Agent": "ichimaru-sns-feed/1.0 (+GitHub Actions)" },
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error(`YouTube feed request failed: HTTP ${response.status}`);
  const xml = await response.text();
  const videos = parseFeed(xml)
    .filter(validYouTubeVideo)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, config.youtube.maxItems);
  if (!videos.length) throw new Error("YouTube feed did not contain valid videos");

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
  console.error(`YouTube update failed; existing data was preserved. ${error.message}`);
  process.exitCode = 1;
}
