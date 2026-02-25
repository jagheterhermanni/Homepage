const app = document.getElementById("app");

const routes = {
    about: "pages/about.md",
    projects: "pages/projects.md",
    cv: "pages/cv.md"
};

async function loadPage(page) {
    try {
        const res = await fetch(routes[page]);
        if (!res.ok) throw new Error();

        const md = await res.text();
        app.innerHTML = marked.parse(md);

    //connects to github.js
        if (document.querySelector("#repo-list") && typeof renderRepos === "function") {
        renderRepos();
    }

    } catch {
        app.innerHTML = "<h2>404</h2>";
    }
}

function router() {
    const page = (location.hash || "#about").slice(1);
    loadPage(routes[page] ? page : "about");
}

window.addEventListener("hashchange", router);
router();

app.addEventListener("click", function (e) {
    const button = e.target.closest(".open-popup");
    if (!button) return;
        e.preventDefault();

        openModal('<iframe src="pages/resume.html" class="resume-frame"></iframe>', "resume");
    }
);

const user = "ville.h.hautanen";
const domain = "gmail.com";
const email = `${user}@${domain}`;

document.getElementById("email-link").href = `mailto:${email}`;