const app = document.getElementById("app");
const links = document.querySelectorAll("nav a");
let currentScript = null;

const defaultPage = "about";

//allow only these pages
const allowedPages = new Set(["about", "projects", "cv"]);

function getPageFromHash() {
  const page = (window.location.hash || `#${defaultPage}`).slice(1);
  return allowedPages.has(page) ? page : defaultPage;
}

async function loadPage(page) {
  try {
    const response = await fetch(`pages/${page}.md`, { cache: "no-cache" });
    if (!response.ok) throw new Error("Page not found");

    const markdown = await response.text();

    // Convert Markdown to HTML (requires marked)
    app.innerHTML = window.marked ? marked.parse(markdown) : `<pre>${markdown}</pre>`;

    // Remove old page script
    if (currentScript) {
      currentScript.remove();
      currentScript = null;
    }

  } catch (error) {
    app.innerHTML = "<h2>404</h2><p>Page not found</p>";
  }
}

// SPA nav: set hash only; hashchange will load the page
links.forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    const page = link.getAttribute("href").replace("#", "");

    // This triggers the hashchange event and loads the page
    window.location.hash = page;
  });
});

// Handle back/forward and direct URL loads
window.addEventListener("hashchange", () => {
  loadPage(getPageFromHash());
});

// Initial load
loadPage(getPageFromHash());