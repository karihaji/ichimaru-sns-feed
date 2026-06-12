import { config } from "./config.js";
import { formatDate } from "./utils/date.js";
import { createElement, externalLinkAttributes, renderEmptyState } from "./utils/dom.js";
import { validYouTubeVideo } from "./utils/validation.js";

let initialized = false;

function createCard(video, featured = false) {
  const article = createElement("article", { className: `youtube-card${featured ? " youtube-card--featured" : ""}` });
  const link = createElement("a", {
    className: "youtube-card__link",
    attrs: { href: video.url, "aria-label": `${video.title}をYouTubeで見る`, ...externalLinkAttributes() }
  });
  const thumb = createElement("div", { className: "youtube-thumb" });
  thumb.append(
    createElement("img", { attrs: { src: video.thumbnail, alt: "", loading: "lazy", decoding: "async" } }),
    createElement("span", { className: "play-mark", text: "▶", attrs: { "aria-hidden": "true" } })
  );
  const body = createElement("div", { className: "youtube-card__body" });
  const time = createElement("time", { className: "youtube-card__date", text: formatDate(video.publishedAt), attrs: { datetime: video.publishedAt } });
  body.append(createElement("h2", { className: "youtube-card__title", text: video.title }), time);
  link.append(thumb, body);
  article.append(link);
  return article;
}

export async function initYouTube() {
  if (initialized) return;
  initialized = true;
  const grid = document.querySelector("#youtube-grid");
  const status = document.querySelector("#youtube-status");
  try {
    const response = await fetch("./public/data/youtube.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const videos = (await response.json()).filter(validYouTubeVideo).slice(0, 3);
    status.remove();
    if (!videos.length) {
      renderEmptyState(grid, {
        title: "YouTube動画を準備中です",
        message: "現在、YouTubeの最新動画を読み込めません。公式チャンネルからご確認ください。",
        linkText: "公式チャンネルを見る",
        linkUrl: config.youtube.channelUrl
      });
      return;
    }
    grid.replaceChildren(...videos.map((video, index) => createCard(video, index === 0)));
  } catch (error) {
    console.error("YouTube data error", error);
    status.remove();
    renderEmptyState(grid, {
      title: "YouTubeを表示できません",
      message: "現在、YouTubeの最新動画を読み込めません。公式チャンネルからご確認ください。",
      linkText: "公式チャンネルを見る",
      linkUrl: config.youtube.channelUrl
    });
  }
}
