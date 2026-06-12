import { config } from "./config.js";
import { createElement, externalLinkAttributes } from "./utils/dom.js";

let initialized = false;
const WIDGET_TIMEOUT_MS = 4000;

function rejectAfter(ms, message) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
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
    createElement("h2", { text: "Xの公式タイムラインを表示できません" }),
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
        "X側の配信制限により、埋め込みタイムラインを読み込めませんでした。公開リストまたは各公式アカウントを直接ご確認ください。"
      );
    }
  } catch (error) {
    console.error("X widget error", error);
    await renderFallback(
      container,
      timelineUrl,
      "現在、Xの公式ウィジェットを読み込めません。公開リストまたは各公式アカウントを直接ご確認ください。"
    );
  }
}
