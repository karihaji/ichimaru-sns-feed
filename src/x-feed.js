import { config } from "./config.js";
import { createElement, externalLinkAttributes } from "./utils/dom.js";

let initialized = false;

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

async function renderImageFallback(container) {
  const accounts = await fetchXAccounts();
  const fallback = createElement("div", { className: "x-unavailable" });
  fallback.append(
    createElement("h2", { text: "公開Xリスト" }),
    createElement("p", { text: "画像を読み込めませんでした。公開リストまたは各公式アカウントから最新情報をご確認ください。" }),
    createElement("a", {
      className: "button button--primary",
      text: "公開Xリストを開く ↗",
      attrs: { href: config.x.listUrl, ...externalLinkAttributes() }
    })
  );
  if (accounts.length) {
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
  container.replaceChildren(fallback);
}

export function initX() {
  if (initialized) return;
  initialized = true;
  const container = document.querySelector("#x-feed");
  const card = createElement("article", { className: "x-snapshot-card" });
  const link = createElement("a", {
    className: "x-snapshot-card__link",
    attrs: {
      href: config.x.listUrl,
      "aria-label": "市丸グループ公開Xリストを開く",
      ...externalLinkAttributes()
    }
  });
  const visual = createElement("div", { className: "x-snapshot-card__visual" });
  const image = createElement("img", {
    attrs: {
      src: config.x.snapshotImage,
      alt: "市丸グループ公開XリストのHOME画面。12公式アカウントと最新投稿を表示",
      decoding: "async"
    }
  });
  image.addEventListener("error", () => renderImageFallback(container), { once: true });
  visual.append(image, createElement("span", { className: "x-snapshot-card__badge", text: "公開Xリスト" }));

  const body = createElement("div", { className: "x-snapshot-card__body" });
  body.append(
    createElement("p", { className: "eyebrow", text: "ICHIMARU GROUP ON X" }),
    createElement("h2", { text: "12公式アカウントの最新発信" }),
    createElement("p", {
      text: "市丸グループ各社・各事業の公開投稿をまとめたXリストです。画像は撮影時点の内容です。最新投稿はXでご確認ください。"
    }),
    createElement("p", { className: "x-snapshot-card__date", text: `${config.x.snapshotUpdatedAt} 撮影` }),
    createElement("span", { className: "button button--primary", text: "Xリストを見る ↗" })
  );
  link.append(visual, body);
  card.append(link);
  container.replaceChildren(card);
}
