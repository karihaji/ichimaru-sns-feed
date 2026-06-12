import { config } from "./config.js";
import { formatDate } from "./utils/date.js";
import { createElement, externalLinkAttributes } from "./utils/dom.js";
import { validXPost } from "./utils/validation.js";

let initialized = false;
const WIDGET_TIMEOUT_MS = 4000;

function rejectAfter(ms, message) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

async function fetchXPosts() {
  try {
    const response = await fetch("./public/data/x.json", { cache: "no-store" });
    if (!response.ok) return [];
    return (await response.json())
      .filter(validXPost)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, config.x.maxItems);
  } catch {
    return [];
  }
}

function createPostCard(post) {
  const article = createElement("article", { className: "x-post" });
  const link = createElement("a", {
    className: "x-post__link",
    attrs: { href: post.url, "aria-label": `${post.authorName}のX投稿を開く`, ...externalLinkAttributes() }
  });
  const header = createElement("div", { className: "x-post__header" });
  if (post.authorAvatar) {
    const avatar = createElement("img", {
      className: "x-post__avatar",
      attrs: { src: post.authorAvatar, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
    });
    avatar.addEventListener("error", () => avatar.remove(), { once: true });
    header.append(avatar);
  }
  const account = createElement("div", { className: "x-post__account" });
  account.append(
    createElement("strong", { text: post.authorName }),
    createElement("span", { text: post.authorHandle })
  );
  header.append(account, createElement("span", { className: "x-post__mark", text: "X" }));
  link.append(header, createElement("p", { className: "x-post__text", text: post.text }));
  if (post.mediaUrl) {
    link.append(createElement("img", {
      className: "x-post__media",
      attrs: { src: post.mediaUrl, alt: "投稿の添付メディア", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
    }));
  }
  link.append(createElement("div", { className: "x-post__meta" }));
  link.lastElementChild.append(
    createElement("time", { text: formatDate(post.createdAt), attrs: { datetime: post.createdAt } }),
    createElement("span", { text: "Xで見る ↗" })
  );
  article.append(link);
  return article;
}

function renderApiPosts(container, posts) {
  const wrapper = createElement("div", { className: "x-api-feed" });
  const heading = createElement("div", { className: "x-api-feed__heading" });
  heading.append(
    createElement("strong", { text: "公開Xリストの最新投稿" }),
    createElement("a", { text: "リストを開く ↗", attrs: { href: config.x.listUrl, ...externalLinkAttributes() } })
  );
  const grid = createElement("div", { className: "x-post-grid" });
  grid.append(...posts.map(createPostCard));
  wrapper.append(heading, grid);
  container.replaceChildren(wrapper);
}

async function fetchXAccounts() {
  try {
    const response = await fetch("./public/data/accounts.json", { cache: "no-store" });
    if (!response.ok) return [];
    return (await response.json())
      .filter((account) => account.platform === "x" && account.enabled !== false)
      .sort((a, b) => a.order - b.order);
  } catch {
    return [];
  }
}

async function renderFallback(container, timelineUrl, message) {
  const accounts = await fetchXAccounts();
  container.replaceChildren();
  const fallback = createElement("div", { className: "x-unavailable" });
  fallback.append(
    createElement("h2", { text: "Xの投稿を表示できません" }),
    createElement("p", { text: message })
  );
  const actions = createElement("div", { className: "x-unavailable__actions" });
  actions.append(
    createElement("a", { className: "button button--primary", text: "公開Xリストを開く ↗", attrs: { href: timelineUrl, ...externalLinkAttributes() } }),
    createElement("button", { className: "button button--secondary", text: "表示を再試行", attrs: { type: "button" } })
  );
  actions.lastElementChild.addEventListener("click", () => {
    initialized = false;
    initX();
  });
  fallback.append(actions);
  if (accounts.length) {
    fallback.append(createElement("h3", { text: "リスト登録アカウント" }));
    const accountGrid = createElement("div", { className: "x-account-grid" });
    accounts.forEach((account) => {
      accountGrid.append(createElement("a", {
        className: "x-account-link",
        text: `${account.displayName} ↗`,
        attrs: { href: account.url, ...externalLinkAttributes() }
      }));
    });
    fallback.append(accountGrid);
  }
  container.append(fallback);
}

function loadWidgetScript() {
  return new Promise((resolve, reject) => {
    if (window.twttr?.widgets) return resolve(window.twttr);
    const existing = document.querySelector('script[src="https://platform.twitter.com/widgets.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.twttr), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.charset = "utf-8";
    script.addEventListener("load", () => resolve(window.twttr), { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.append(script);
  });
}

async function renderWidget(container) {
  const timelineUrl = config.x.listUrl || config.x.fallbackProfileUrl;
  const anchor = createElement("a", {
    className: "twitter-timeline",
    text: "Xで最新情報を見る",
    attrs: {
      href: timelineUrl,
      "data-height": String(config.x.height),
      "data-chrome": "noheader nofooter transparent",
      "data-dnt": "true",
      "data-lang": "ja",
      ...externalLinkAttributes()
    }
  });
  container.replaceChildren(anchor);

  try {
    const twttr = await Promise.race([
      loadWidgetScript(),
      rejectAfter(WIDGET_TIMEOUT_MS, "X widget script timed out")
    ]);
    await Promise.race([
      Promise.resolve(twttr.widgets.load(container)),
      rejectAfter(WIDGET_TIMEOUT_MS, "X widget rendering timed out")
    ]);
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const iframe = container.querySelector("iframe");
    const rendered = iframe && iframe.getBoundingClientRect().height >= 200 && iframe.getBoundingClientRect().width >= 200;
    if (!rendered) {
      await renderFallback(
        container,
        timelineUrl,
        "X APIの保存データがなく、公式ウィジェットも配信制限で読み込めませんでした。"
      );
    }
  } catch (error) {
    console.error("X widget error", error);
    await renderFallback(
      container,
      timelineUrl,
      "X APIの保存データがなく、公式ウィジェットも読み込めませんでした。"
    );
  }
}

export async function initX() {
  if (initialized) return;
  initialized = true;
  const container = document.querySelector("#x-feed");
  container.replaceChildren(createElement("div", { className: "panel-status", text: "公開Xリストの投稿を読み込んでいます。", attrs: { role: "status" } }));

  const posts = await fetchXPosts();
  if (posts.length) {
    renderApiPosts(container, posts);
    return;
  }
  await renderWidget(container);
}
