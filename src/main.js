import { config } from "./config.js";
import { setupTabs } from "./tabs.js";
import { initInstagram } from "./instagram-feed.js";
import { initX } from "./x-feed.js";
import { initYouTube } from "./youtube-feed.js";
import { setupAccountsModal } from "./accounts-modal.js";

const params = new URLSearchParams(window.location.search);
if (params.get("embed") === "1") document.body.classList.add("is-embed");

const initializers = {
  instagram: initInstagram,
  x: initX,
  youtube: initYouTube
};

setupTabs({
  defaultTab: config.layout.defaultTab,
  onActivate(name) {
    initializers[name]?.();
  }
});

setupAccountsModal();
