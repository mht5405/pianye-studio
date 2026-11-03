import { mountSiteThemeSwitcher } from "../site/theme";

if (new URLSearchParams(window.location.search).has("share")) {
  document.body.classList.add("share-preview");
}

mountSiteThemeSwitcher();
