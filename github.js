// github.js
const GITHUB_USER = "jagheterhermanni";

// Display options (adjust to taste)
const REPO_OPTIONS = {
  includeForks: true,
  includeArchived: true,
  sort: "updated", // "updated" | "stars" | "name"
  cacheKey: "repos-cache-v1",
  cacheTtlMs: 6 * 60 * 60 * 1000, // 6 hours
  selectedRepos: [ //Repos that are shown
    "PythonProjects",
    "Portfolio"
  ],
};

let currentAbort = null;

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[c]));
}

function readCache() {
  try {
    const raw = localStorage.getItem(REPO_OPTIONS.cacheKey);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.repos) || typeof data.savedAt !== "number") return null;

    const fresh = (Date.now() - data.savedAt) < REPO_OPTIONS.cacheTtlMs;
    return { repos: data.repos, fresh };
  } catch {
    return null;
  }
}

function writeCache(repos) {
  try {
    localStorage.setItem(
      REPO_OPTIONS.cacheKey,
      JSON.stringify({ savedAt: Date.now(), repos })
    );
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
}

function sortRepos(repos) {
  if (Array.isArray(REPO_OPTIONS.selectedRepos) && REPO_OPTIONS.selectedRepos.length > 0) {
    return REPO_OPTIONS.selectedRepos
    .map(name => repos.find(r => r.name === name))
    .filter(Boolean);
  }

  const copy = [...repos];

  if (REPO_OPTIONS.sort === "stars") {
    copy.sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));
  } else if (REPO_OPTIONS.sort === "name") {
    copy.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  } else {
    // updated
    copy.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }

  return copy;
}

function filterRepos(repos) {
  return repos.filter((r) => {
    if (Array.isArray(REPO_OPTIONS.selectedRepos) && REPO_OPTIONS.selectedRepos.length > 0) {
      if (!REPO_OPTIONS.selectedRepos.includes(r.name)) return false;
    }

    if (!REPO_OPTIONS.includeForks && r.fork) return false;
    if (!REPO_OPTIONS.includeArchived && r.archived) return false;
    return true;
  });
}

function renderReposList(el, repos) {
  const safeRepos = filterRepos(sortRepos(repos));

  if (safeRepos.length === 0) {
    el.innerHTML = "<p>No repositories to display.</p>";
    return;
  }

  el.innerHTML = `
    <div class="repo-grid">
      ${safeRepos.map((r) => `
        <a class="repo-card" href="${r.html_url}" target="_blank" rel="noreferrer">
          <div class="repo-title">${escapeHtml(r.name)}</div>
          ${r.description ? `<div class="repo-desc">${escapeHtml(r.description)}</div>` : ""}
          <div class="repo-meta">
            <span>${escapeHtml(r.language ?? "")}</span>
            <span>★ ${r.stargazers_count ?? 0}</span>
            <span>Updated ${new Date(r.updated_at).toLocaleDateString()}</span>
            ${r.fork ? `<span>fork</span>` : ``}
            ${r.archived ? `<span>archived</span>` : ``}
          </div>
        </a>
      `).join("")}
    </div>
  `;
}

async function fetchAllRepos(username) {
  const all = [];
  let page = 1;

  // Abort any previous in-flight request (e.g., navigating fast)
  if (currentAbort) currentAbort.abort();
  currentAbort = new AbortController();

  while (true) {
    const url = `https://api.github.com/users/${username}/repos?per_page=100&page=${page}&sort=updated`;
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
      signal: currentAbort.signal,
    });

    if (!res.ok) {
      // Helpful handling for rate limit
      if (res.status === 403) {
        const remaining = res.headers.get("X-RateLimit-Remaining");
        if (remaining === "0") {
          throw new Error("rate_limit");
        }
      }
      throw new Error(`github_${res.status}`);
    }

    const batch = await res.json();
    all.push(...batch);

    if (batch.length < 100) break; // last page
    page += 1;
  }

  return all;
}

// Call this from app.js AFTER the markdown has been injected
async function renderRepos() {
  const el = document.querySelector("#repo-list");
  if (!el) return;

  // 1) Try cache first (instant)
  const cached = readCache();
  if (cached?.repos?.length) {
    renderReposList(el, cached.repos);

    // If cache is fresh, stop here (no network)
    if (cached.fresh) return;
    // Otherwise keep going: refresh in the background (but user sees something)
  } else {
    el.textContent = "Loading repos…";
  }

  // 2) Fetch fresh data
  try {
    const repos = await fetchAllRepos(GITHUB_USER);
    writeCache(repos);
    renderReposList(el, repos);
  } catch (err) {
    console.error(err);

    // If we already showed cached repos, keep them and optionally show a small note
    if (cached?.repos?.length) {
      // Small, non-intrusive message below
      const note = document.createElement("p");
      note.style.opacity = "0.7";
      note.style.marginTop = "10px";
      note.textContent = (String(err.message) === "rate_limit")
        ? "GitHub API rate limit reached — showing cached repos."
        : "Could not refresh repos — showing cached version.";
      el.appendChild(note);
      return;
    }

    // No cache to fall back on
    if (String(err.message) === "rate_limit") {
      el.innerHTML = "<p>GitHub API rate limit reached. Please try again later.</p>";
    } else {
      el.innerHTML = "<p>Failed to load repos.</p>";
    }
  }
}