import { config } from "./config.js";
import { formatDate } from "./utils/date.js";
import { createElement, externalLinkAttributes, renderEmptyState } from "./utils/dom.js";
import { validYouTubeVideo } from "./utils/validation.js";

let initialized = false;

function isShortsVideo(video) {
  return video.format === "short" || /(^|[\s　])#(?:shorts?|shotrs|ショート)(?=$|[\s　])/i.test(video.title);
}

function createCard(video, variant = "") {
  const article = createElement("article", { className: `youtube-card${variant ? ` youtube-card--${variant}` : ""}` });
  const link = createElement("a", {
    className: "youtube-card__link",
    attrs: { href: video.url, "aria-label": `${video.title}をYouTubeで見る`, ...externalLinkAttributes() }
  });
  const thumb = createElement("div", { className: "youtube-thumb" });
  thumb.append(
    createElement("img", { attrs: { src: video.thumbnail, alt: "", loading: "lazy", decoding: "async" } }),
    createElement("span", { className: "play-mark", text: "▶", attrs: { "aria-hidden": "true" } })
  );
  if (variant === "short") {
    thumb.append(createElement("span", { className: "youtube-type-badge", text: "Shorts" }));
  }
  const body = createElement("div", { className: "youtube-card__body" });
  const time = createElement("time", { className: "youtube-card__date", text: `公開日：${formatDate(video.publishedAt)}`, attrs: { datetime: video.publishedAt } });
  body.append(createElement("h2", { className: "youtube-card__title", text: video.title }), time);
  link.append(thumb, body);
  article.append(link);
  return article;
}

function renderVideoLayout(grid, videos) {
  const regularVideos = videos.filter((video) => !isShortsVideo(video)).slice(0, config.youtube.regularItems);
  const shortVideos = videos.filter(isShortsVideo).slice(0, config.youtube.shortsItems);

  if (!regularVideos.length && !shortVideos.length) {
    renderEmptyState(grid, {
      title: "YouTube動画を準備中です",
      message: "現在、YouTubeの最新動画を読み込めません。公式チャンネルからご確認ください。",
      linkText: "公式チャンネルを見る",
      linkUrl: config.youtube.channelUrl
    });
    return;
  }

  const regularSection = createElement("section", { className: "youtube-section youtube-section--regular", attrs: { "aria-labelledby": "youtube-regular-heading" } });
  const regularGrid = createElement("div", { className: "youtube-regular-grid" });
  regularVideos.forEach((video, index) => regularGrid.append(createCard(video, index === 0 ? "featured" : "regular")));
  const regularHeader = createElement("div", { className: "youtube-section__header" });
  regularHeader.append(
    createElement("p", { className: "eyebrow", text: "YouTube" }),
    createElement("h2", { attrs: { id: "youtube-regular-heading" }, text: "通常動画" })
  );
  regularSection.append(regularHeader, regularGrid);

  const shortsSection = createElement("section", { className: "youtube-section youtube-section--shorts", attrs: { "aria-labelledby": "youtube-shorts-heading" } });
  const shortsList = createElement("div", { className: "youtube-shorts-list" });
  shortVideos.forEach((video) => shortsList.append(createCard(video, "short")));
  const shortsHeader = createElement("div", { className: "youtube-section__header" });
  shortsHeader.append(
    createElement("p", { className: "eyebrow", text: "Shorts" }),
    createElement("h2", { attrs: { id: "youtube-shorts-heading" }, text: "ショート" })
  );
  shortsSection.append(shortsHeader, shortsList);

  grid.replaceChildren(regularSection, shortsSection);
}

export async function initYouTube() {
  if (initialized) return;
  initialized = true;
  const grid = document.querySelector("#youtube-grid");
  const status = document.querySelector("#youtube-status");
  try {
    const response = await fetch("./public/data/youtube.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const videos = (await response.json()).filter(validYouTubeVideo);
    status.remove();
    renderVideoLayout(grid, videos);
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
