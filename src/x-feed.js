import { config } from "./config.js";
import { createElement, externalLinkAttributes } from "./utils/dom.js";

let initialized = false;

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

export async function initX() {
  if (initialized) return;
  initialized = true;
  const container = document.querySelector("#x-feed");
  const timelineUrl = config.x.listUrl || config.x.fallbackProfileUrl;
  const isFallback = !config.x.listUrl;

  container.replaceChildren();
  if (isFallback) {
    container.append(createElement("p", {
      className: "x-fallback-note",
      text: "公開XリストURLが未設定のため、代表アカウントを表示しています。"
    }));
  }
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
  container.append(anchor);

  try {
    const twttr = await loadWidgetScript();
    await twttr.widgets.load(container);
  } catch (error) {
    console.error("X widget error", error);
    container.replaceChildren(
      createElement("div", { className: "empty-state" })
    );
    const inner = createElement("div", { className: "empty-state__inner" });
    inner.append(
      createElement("h2", { text: "Xの投稿を読み込めません" }),
      createElement("p", { text: "現在、Xの投稿を読み込めません。公式アカウント一覧から最新情報をご確認ください。" }),
      createElement("a", { className: "button button--primary", text: "Xで最新情報を見る ↗", attrs: { href: timelineUrl, ...externalLinkAttributes() } })
    );
    container.firstElementChild.append(inner);
  }
}
