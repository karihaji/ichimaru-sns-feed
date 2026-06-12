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
    attrs: { src: post.thumbnail, alt: post.alt, loading: "lazy", decoding: "async" }
  });
  image.addEventListener("error", () => { image.src = "./public/assets/placeholders/social-placeholder.svg"; }, { once: true });
  imageWrap.append(image, createElement("span", { className: "instagram-card__platform", text: "Instagram" }));

  const body = createElement("div", { className: "instagram-card__body" });
  const accountLine = createElement("div", { className: "account-line" });
  accountLine.append(
    createElement("strong", { text: post.accountName }),
    createElement("span", { text: post.accountHandle })
  );
  const meta = createElement("div", { className: "card-meta" });
  meta.append(createElement("time", { text: formatDate(post.publishedAt), attrs: { datetime: post.publishedAt } }), createElement("span", { text: "外部リンク ↗" }));
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
  const moreButton = document.querySelector("#instagram-more");
  const swipeStatus = document.querySelector("#instagram-swipe-status");

  try {
    const response = await fetch("./public/data/instagram.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rawItems = await response.json();
    const items = rawItems
      .filter((item) => item.enabled !== false && validInstagramPost(item))
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, config.instagram.maxItems);
    status.remove();

    if (!items.length) {
      renderEmptyState(grid, {
        title: "Instagram投稿を準備中です",
        message: "現在表示できるInstagram投稿はありません。公式アカウント一覧から投稿をご確認ください。",
        linkText: "市丸グループ公式Instagram",
        linkUrl: "https://www.instagram.com/ichimarugroup/"
      });
      return;
    }

    const initialCount = window.innerWidth < config.layout.mobileBreakpoint
      ? config.instagram.initialItemsMobile
      : config.instagram.initialItemsDesktop;
    let visibleCount = Math.min(initialCount, items.length);

    function render() {
      grid.replaceChildren(...items.slice(0, visibleCount).map(createCard));
      actions.hidden = false;
      moreButton.hidden = visibleCount >= items.length;
      swipeStatus.textContent = `${visibleCount}件の投稿・横にスワイプして表示`;
    }

    moreButton.addEventListener("click", () => {
      visibleCount = Math.min(visibleCount + initialCount, items.length);
      render();
    });
    render();
  } catch (error) {
    console.error("Instagram data error", error);
    status.remove();
    renderEmptyState(grid, {
      title: "Instagramを表示できません",
      message: "現在表示できるInstagram投稿はありません。公式アカウント一覧から投稿をご確認ください。",
      linkText: "Instagramを開く",
      linkUrl: "https://www.instagram.com/ichimarugroup/"
    });
  }
}
