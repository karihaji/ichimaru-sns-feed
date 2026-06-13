import { config } from "./config.js";
import { createElement, externalLinkAttributes, renderEmptyState } from "./utils/dom.js";
import { validInstagramPost } from "./utils/validation.js";

let initialized = false;

function resolveThumbnail(thumbnail) {
  return thumbnail.startsWith("./assets/") ? `./public/${thumbnail.slice(2)}` : thumbnail;
}

function createCard(post) {
  const isProfile = post.type === "profile";
  const article = createElement("article", { className: "instagram-card" });
  const link = createElement("a", {
    className: "instagram-card__link",
    attrs: { href: post.postUrl, "aria-label": `${post.accountName}のInstagram${isProfile ? "プロフィール" : "投稿"}を開く`, ...externalLinkAttributes() }
  });
  const imageWrap = createElement("div", { className: "instagram-card__image-wrap" });
  const image = createElement("img", {
    className: "instagram-card__image",
    attrs: { src: resolveThumbnail(post.thumbnail), alt: post.alt, loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
  });
  image.addEventListener("error", () => { image.src = "./public/assets/placeholders/social-placeholder.svg"; }, { once: true });
  imageWrap.append(image, createElement("span", { className: "instagram-card__platform", text: isProfile ? "公式プロフィール" : "Instagram" }));
  const body = createElement("div", { className: "instagram-card__body" });
  const accountLine = createElement("div", { className: "account-line" });
  accountLine.append(createElement("strong", { text: post.accountName }), createElement("span", { text: post.accountHandle }));
  const meta = createElement("div", { className: "card-meta" });
  if (isProfile) {
    meta.append(createElement("span", { text: "公式アカウント" }), createElement("span", { text: "プロフィールを見る ↗" }));
  } else {
    meta.append(createElement("span", { text: "Instagramの投稿" }), createElement("span", { text: "投稿を見る ↗" }));
  }
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
    const allItems = (await response.json()).filter((item) => item.enabled !== false && validInstagramPost(item));
    const posts = allItems.filter((item) => item.type !== "profile");
    const items = (posts.length ? posts : allItems)
      .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
      .slice(0, config.instagram.maxItems);
    status.remove();
    if (!items.length) {
      renderEmptyState(grid, {
        title: "Instagramを表示できません",
        message: "現在Instagram投稿を読み込めません。公式Instagramからご確認ください。",
        linkText: "Instagramを開く",
        linkUrl: "https://www.instagram.com/ichimarugroup/"
      });
      return;
    }
    grid.replaceChildren(...items.map(createCard));
    actions.hidden = false;
    swipeStatus.textContent = posts.length
      ? `${items.length}件の投稿・横にスワイプして表示`
      : `${items.length}件の公式プロフィール・横にスワイプして表示`;
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
