import { createElement, externalLinkAttributes, renderEmptyState } from "./utils/dom.js";
import { validAccount } from "./utils/validation.js";

let initialized = false;

function getUsername(account) {
  try {
    const url = new URL(account.url);
    return url.pathname.split("/").filter(Boolean)[0] || "";
  } catch {
    return "";
  }
}

function createEmbedUrl(account) {
  const username = getUsername(account);
  return username ? `https://www.instagram.com/${encodeURIComponent(username)}/embed/` : "";
}

export async function initInstagram() {
  if (initialized) return;
  initialized = true;

  const grid = document.querySelector("#instagram-grid");
  const status = document.querySelector("#instagram-status");

  try {
    const response = await fetch("./public/data/accounts.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const accounts = (await response.json())
      .filter((account) => account.platform === "instagram" && account.enabled !== false && validAccount(account) && getUsername(account))
      .sort((a, b) => a.order - b.order);

    status.remove();
    if (!accounts.length) {
      renderEmptyState(grid, {
        title: "Instagramアカウントを準備中です",
        message: "現在表示できるInstagramアカウントはありません。",
        linkText: "Instagramを開く",
        linkUrl: "https://www.instagram.com/ichimarugroup/"
      });
      return;
    }

    grid.className = "instagram-embed";
    const controls = createElement("div", { className: "instagram-embed__controls" });
    const label = createElement("label", { className: "instagram-embed__label", text: "表示する公式アカウント" });
    const select = createElement("select", { className: "instagram-embed__select", attrs: { "aria-label": "表示するInstagram公式アカウント" } });
    accounts.forEach((account) => {
      const option = createElement("option", { text: `${account.displayName} (${account.handle})`, attrs: { value: account.id } });
      if (account.handle === "@ichimarugroup") option.selected = true;
      select.append(option);
    });
    const openLink = createElement("a", { className: "button button--secondary instagram-embed__open", text: "Instagramで開く ↗", attrs: externalLinkAttributes() });
    label.append(select);
    controls.append(label, openLink);

    const frameWrap = createElement("div", { className: "instagram-embed__frame-wrap" });
    const frameStatus = createElement("p", { className: "instagram-embed__loading", text: "Instagramの公式プロフィールを読み込んでいます。", attrs: { role: "status" } });
    const iframe = createElement("iframe", {
      className: "instagram-embed__frame",
      attrs: {
        loading: "lazy",
        scrolling: "yes",
        allowtransparency: "true",
        referrerpolicy: "strict-origin-when-cross-origin"
      }
    });
    iframe.addEventListener("load", () => { frameStatus.hidden = true; });
    frameWrap.append(frameStatus, iframe);
    grid.append(controls, frameWrap);

    function loadAccount(accountId) {
      const account = accounts.find((item) => item.id === accountId) || accounts[0];
      frameStatus.hidden = false;
      iframe.title = `${account.displayName} Instagram公式プロフィール`;
      iframe.src = createEmbedUrl(account);
      openLink.href = account.url;
    }

    select.addEventListener("change", () => loadAccount(select.value));
    loadAccount(select.value);
  } catch (error) {
    console.error("Instagram embed error", error);
    status.remove();
    renderEmptyState(grid, {
      title: "Instagramを表示できません",
      message: "現在、Instagramの公式プロフィールを読み込めません。Instagramで直接ご確認ください。",
      linkText: "Instagramを開く",
      linkUrl: "https://www.instagram.com/ichimarugroup/"
    });
  }
}
