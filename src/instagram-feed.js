import { config } from "./config.js";
import { formatDate } from "./utils/date.js";
import { createElement, externalLinkAttributes, renderEmptyState } from "./utils/dom.js";
import { validInstagramPost } from "./utils/validation.js";

let initialized = false;

function createCard(post) {
  const article = createElement("article", { className: "instagram-card" });
  const link = createElement("a", {
    className: "instagram-card__link",
    attrs: { href: post.postUrl, "aria-label": `${post.accountName}のInstagram投稿を開く`, ...externalLinkAttributes() }
  });
  const imageWrap = createElement("div", { className: "instagram-card__image-wrap" });
  const image = createElement("img", {
    className: "instagram-card__image",
    attrs: { src: post.thumbnail, alt: post.alt, loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
  });
  image.addEventListener("error", () => { image.src = "./public/assets/placeholders/social-placeholder.svg"; }, { once: true });
  imageWrap.append(image, createElement("span", { className: "instagram-card__platform", text: "Instagram" }));
  const body = createElement("div", { className: "instagram-card__body" });
  const accountLine = createElement("div", { className: "account-line" });
  accountLine.append(createElement("strong", { text: post.accountName }), createElement("span", { text: post.accountHandle }));
  const meta = createElement("div", { className: "card-meta" });
  meta.append(createElement("time", { text: formatDate(post.publishedAt), attrs: { datetime: post.publishedAt } }), createElement("span", { text: "投稿を見る ↗" }));
  body.append(accountLine, createElement("p", { className: "caption", text: post.caption }), meta);
  link.append(imageWrap, body);
  article.append(link);
  return article;
}

export async function initInstagram() {
  if (initialized) return;
  initialized = true;
  const grid = document.querySelector("#instagram-grid");
  const status = document.querySelector("#instagram-status");
  const actions = document.querySelector("#instagram-actions");
  const swipeStatus = document.querySelector("#instagram-swipe-status");

  try {
    const response = await fetch("./public/data/instagram.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const items = (await response.json())
      .filter((item) => item.enabled !== false && item.type !== "profile" && validInstagramPost(item))
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, config.instagram.maxItems);
    status.remove();
    if (!items.length) {
      renderEmptyState(grid, {
        title: "Instagram投稿を取得できません",
        message: "自動更新がまだ正常データを取得できていません。公式Instagramからご確認ください。",
        linkText: "Instagramを開く",
        linkUrl: "https://www.instagram.com/ichimarugroup/"
      });
      return;
    }
    grid.replaceChildren(...items.map(createCard));
    actions.hidden = false;
    swipeStatus.textContent = `${items.length}件の投稿・横にスワイプして表示`;
  } catch (error) {
    console.error("Instagram data error", error);
    status.remove();
    renderEmptyState(grid, {
      title: "Instagramを表示できません",
      message: "現在Instagram投稿を読み込めません。公式Instagramからご確認ください。",
      linkText: "Instagramを開く",
      linkUrl: "https://www.instagram.com/ichimarugroup/"
    });
  }
}
