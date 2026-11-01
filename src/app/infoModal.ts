const CHANGELOG_URL =
  "https://raw.githubusercontent.com/BrayFlex/openfront-utility/main/CHANGELOG.md";
const CHANGELOG_LINK =
  "https://github.com/BrayFlex/openfront-utility/blob/main/CHANGELOG.md";

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Only http(s), same-page (#) and relative links become anchors; anything else
// (javascript:, data:, ...) is left as plain text.
const isSafeHref = (url: string) => /^(https?:\/\/|#|\.{0,2}\/)/i.test(url);

const renderInline = (line: string) => {
  let out = escapeHtml(line);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?![*])/g, "$1<em>$2</em>");
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (match, text: string, url: string) =>
      isSafeHref(url)
        ? `<a href="${url}" target="_blank" rel="noopener">${text}</a>`
        : match
  );
  return out;
};

export function renderMarkdown(md: string): string {
  const lines = md.split(/\r?\n/);
  const blocks: string[] = [];
  let inList: "ul" | "ol" | null = null;

  const closeList = () => {
    if (inList) {
      blocks.push(`</${inList}>`);
      inList = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");
    if (!line.trim()) {
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      const tag = `h${heading[1].length}`;
      blocks.push(`<${tag}>${renderInline(heading[2])}</${tag}>`);
      continue;
    }

    const hr = line.match(/^(\*\*\*|---)$/);
    if (hr) {
      closeList();
      blocks.push("<hr>");
      continue;
    }

    const ul = line.match(/^[-*+]\s+(.*)$/);
    if (ul) {
      if (inList !== "ul") {
        closeList();
        blocks.push("<ul>");
        inList = "ul";
      }
      blocks.push(`<li>${renderInline(ul[1])}</li>`);
      continue;
    }

    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      if (inList !== "ol") {
        closeList();
        blocks.push("<ol>");
        inList = "ol";
      }
      blocks.push(`<li>${renderInline(ol[1])}</li>`);
      continue;
    }

    closeList();
    blocks.push(`<p>${renderInline(line)}</p>`);
  }
  closeList();
  return blocks.join("\n");
}

let changelogLoaded = false;
let changelogLoading: Promise<void> | null = null;

async function loadChangelog(contentEl: HTMLElement) {
  if (changelogLoaded) return;
  contentEl.innerHTML = `<p class="changelog-pending">Loading changelog…</p>`;
  try {
    const res = await fetch(CHANGELOG_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    contentEl.innerHTML = renderMarkdown(text);
    changelogLoaded = true;
  } catch (err) {
    contentEl.innerHTML = `<p class="changelog-pending">Couldn't load the changelog from GitHub.` +
      ` See it directly: <a href="${CHANGELOG_LINK}" target="_blank" rel="noopener">CHANGELOG.md</a></p>`;
  }
}

export function initInfoModal() {
  const modal = document.getElementById("infoModal");
  const openBtn = document.getElementById("infoModalBtn");
  const closeBtn = document.getElementById("closeInfoModalBtn");
  if (!modal || !openBtn || !closeBtn) return;

  const tabs = Array.from(modal.querySelectorAll<HTMLButtonElement>(".info-tab"));
  const panels = Array.from(modal.querySelectorAll<HTMLElement>(".info-panel"));
  const changelogEl = modal.querySelector<HTMLElement>("#changelogContent");

  openBtn.addEventListener("click", () => (modal.hidden = false));
  closeBtn.addEventListener("click", () => (modal.hidden = true));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) (modal as HTMLElement).hidden = true;
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.dataset.tab;
      tabs.forEach((t) => {
        const selected = t === tab;
        t.classList.toggle("selected", selected);
        t.setAttribute("aria-selected", String(selected));
      });
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.panel !== name;
      });
      if (name === "changelog" && changelogEl && !changelogLoading) {
        changelogLoading = loadChangelog(changelogEl);
        changelogLoading.then(() => {
          changelogLoading = null;
        }).catch(() => {
          changelogLoading = null;
        });
      }
    });
  });
}