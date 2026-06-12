import { createElement, externalLinkAttributes } from "./utils/dom.js";
import { validAccount } from "./utils/validation.js";

const platformLabels = { x: "X", instagram: "Instagram", youtube: "YouTube" };

export async function setupAccountsModal() {
  const dialog = document.querySelector("#accounts-dialog");
  const openButton = document.querySelector("#accounts-open");
  const closeButton = document.querySelector("#accounts-close");
  const groups = document.querySelector("#accounts-groups");

  try {
    const response = await fetch("./public/data/accounts.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const accounts = (await response.json())
      .filter((account) => account.enabled !== false && validAccount(account))
      .sort((a, b) => a.order - b.order);

    Object.keys(platformLabels).forEach((platform) => {
      const section = createElement("section", { className: "accounts-group" });
      section.append(createElement("h3", { text: platformLabels[platform] }));
      const list = createElement("ul", { className: "accounts-list" });
      accounts.filter((account) => account.platform === platform).forEach((account) => {
        const item = createElement("li");
        item.append(createElement("a", {
          text: `${account.displayName} ↗`,
          attrs: { href: account.url, title: account.handle || account.displayName, ...externalLinkAttributes() }
        }));
        list.append(item);
      });
      section.append(list);
      groups.append(section);
    });
  } catch (error) {
    console.error("Accounts data error", error);
    groups.append(createElement("p", { text: "公式アカウント一覧を読み込めませんでした。" }));
  }

  openButton.addEventListener("click", () => dialog.showModal());
  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      dialog.close();
    }
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}
