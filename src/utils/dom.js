export function createElement(tagName, options = {}) {
  const element = document.createElement(tagName);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  if (options.attrs) {
    Object.entries(options.attrs).forEach(([name, value]) => element.setAttribute(name, value));
  }
  return element;
}

export function externalLinkAttributes() {
  return { target: "_blank", rel: "noopener noreferrer" };
}

export function renderEmptyState(container, { title, message, linkText, linkUrl }) {
  container.replaceChildren();
  const wrapper = createElement("div", { className: "empty-state" });
  const inner = createElement("div", { className: "empty-state__inner" });
  inner.append(
    createElement("h2", { text: title }),
    createElement("p", { text: message })
  );
  const link = createElement("a", {
    className: "button button--primary",
    text: `${linkText} ↗`,
    attrs: { href: linkUrl, ...externalLinkAttributes() }
  });
  inner.append(link);
  wrapper.append(inner);
  container.append(wrapper);
}
