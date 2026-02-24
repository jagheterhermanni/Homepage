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

const modal = document.getElementById("modal");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");

function openModal(content) {
    modalBody.innerHTML = content;
    modal.style.display = "flex";
}

function closeModal() {
    modal.style.display = "none";
}

modalClose.addEventListener("click", closeModal);

//Close when clicking outside box
modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
});

app.addEventListener("click", function (e) {
    if (e.target.matches(".open-popup")) {
        e.preventDefault();

        openModal(`
            <h2>Popup Title</h2>
            <p>This is loaded dynamically inside the modal.</p>
        `);
    }
});

const user = "ville.h.hautanen";
const domain = "gmail.com";
const email = `${user}@${domain}`;

document.getElementById("email-link").href = `mailto:${email}`;