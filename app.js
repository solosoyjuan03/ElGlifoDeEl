(() => {
    "use strict";

    const ENTRIES_KEY = "diario-solosoyjuan.entries.v1";
    const PASSWORD_KEY = "diario-solosoyjuan.editor-hash.v1";
    const SESSION_KEY = "diario-solosoyjuan.editor-session.v1";
    const OWNER_USERNAME = "solosoyjuan";
    const app = document.getElementById("app");
    const siteNav = document.getElementById("site-nav");
    const footer = document.getElementById("site-footer");
    const importFile = document.getElementById("import-file");
    let entries = [];
    let flashMessage = null;
    let resizeTimer = 0;
    let printReturnHash = null;

    const isEditor = () => sessionStorage.getItem(SESSION_KEY) === "active";
    const escapeHash = (value) => encodeURIComponent(String(value));
    const route = () => {
        const path = location.hash.replace(/^#\/?/, "");
        return path ? path.split("/").map(decodeURIComponent) : [""];
    };

    function makeElement(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    function makeLink(text, href, className = "btn") {
        const link = makeElement("a", className, text);
        link.href = href;
        return link;
    }

    function makeButton(text, className = "btn", action) {
        const button = makeElement("button", className, text);
        button.type = "button";
        if (action) button.addEventListener("click", action);
        return button;
    }

    function normalizeEntry(entry, index) {
        if (!entry || typeof entry !== "object") throw new Error("Una entrada del respaldo no tiene un formato válido.");
        const title = typeof entry.title === "string" ? entry.title : entry.titulo;
        const content = typeof entry.content === "string" ? entry.content : entry.contenido;
        if (typeof title !== "string" || !title.trim() || title.length > 200 || typeof content !== "string" || !content.trim()) {
            throw new Error(`La entrada ${index + 1} necesita un título (máximo 200 caracteres) y texto.`);
        }
        return {
            id: String(entry.id ?? index + 1),
            title: title.trim(),
            content,
            createdAt: entry.createdAt || entry.fecha_creacion || new Date(0).toISOString(),
            updatedAt: entry.updatedAt || entry.fecha_actualizacion || entry.createdAt || entry.fecha_creacion || new Date(0).toISOString()
        };
    }

    function persistEntries(nextEntries) {
        localStorage.setItem(ENTRIES_KEY, JSON.stringify(nextEntries));
        entries = nextEntries;
    }

    function loadEntries() {
        const saved = localStorage.getItem(ENTRIES_KEY);
        if (saved !== null) {
            let parsed;
            try {
                parsed = JSON.parse(saved);
            } catch {
                throw new Error("Los datos guardados no se pueden leer. No se han modificado; restaura un respaldo JSON.");
            }
            if (!Array.isArray(parsed)) throw new Error("El archivo local de entradas no tiene una lista válida.");
            return parsed.map(normalizeEntry).sort(compareEntries);
        }
        const initial = Array.isArray(window.DIARY_INITIAL_ENTRIES) ? window.DIARY_INITIAL_ENTRIES : [];
        const migrated = initial.map(normalizeEntry).sort(compareEntries);
        persistEntries(migrated);
        return migrated;
    }

    function compareEntries(left, right) {
        const dateOrder = String(left.createdAt).localeCompare(String(right.createdAt));
        return dateOrder || String(left.id).localeCompare(String(right.id), undefined, { numeric: true });
    }

    function showFlash(message, category = "info") {
        flashMessage = { message, category };
        render();
    }

    function addFlash() {
        if (!flashMessage) return;
        const flash = makeElement("div", `flash ${flashMessage.category}`, flashMessage.message);
        flash.setAttribute("role", "status");
        app.prepend(flash);
        flashMessage = null;
    }

    function renderHeader() {
        siteNav.replaceChildren();
        if (isEditor()) {
            siteNav.append(
                makeElement("span", "user-name", `✦ ${OWNER_USERNAME}`),
                makeLink("+ Nueva página", "#/nueva", "btn btn-primary"),
                makeButton("Exportar respaldo", "btn", exportBackup),
                makeButton("Importar respaldo", "btn", () => importFile.click()),
                makeButton("Salir", "btn", () => {
                    sessionStorage.removeItem(SESSION_KEY);
                    navigate("#/");
                })
            );
        } else {
            siteNav.append(makeLink("Entrar", "#/login", "btn"));
        }
    }

    function renderCover() {
        footer.hidden = false;
        const section = makeElement("section", "cover-page");
        section.setAttribute("aria-label", "Portada del diario");
        const coverLink = makeLink("", "#/indice", "cover-link");
        coverLink.setAttribute("aria-label", "Abrir el diario desde la portada");
        const image = document.createElement("img");
        image.className = "cover-image";
        image.src = "static/images/portada-diario.png";
        image.alt = "El diario de SolosoyJuan";
        coverLink.append(image);
        section.append(
            coverLink,
            makeLink("Abrir el diario", "#/indice", "btn btn-primary"),
            makeElement("p", "cover-hint", "Haz clic en la portada para empezar a leer"),
            makeButton("Imprimir / Guardar como PDF", "btn cover-print-action", printBook)
        );
        app.append(section);
    }

    function renderIndex() {
        footer.hidden = false;
        const page = makeElement("section", "paper-panel index-page");
        page.setAttribute("aria-labelledby", "index-title");
        const heading = makeElement("header", "index-heading");
        heading.append(
            makeElement("p", "eyebrow", "El diario de SolosoyJuan"),
            makeElement("h1", "", "Índice"),
            makeElement("p", "", "Elige una página para comenzar a leer.")
        );
        page.append(heading);
        if (entries.length) {
            const list = makeElement("nav", "index-list");
            list.setAttribute("aria-label", "Páginas del diario");
            entries.forEach((entry, index) => {
                const link = makeLink("", `#/entrada/${escapeHash(entry.id)}`, "index-entry");
                link.append(makeElement("span", "index-number", String(index + 1).padStart(2, "0")), makeElement("span", "", entry.title));
                list.append(link);
            });
            page.append(list);
        } else {
            page.append(makeElement("p", "index-empty", "Todavía no hay páginas escritas."));
            if (isEditor()) page.append(makeLink("Escribir la primera página", "#/nueva", "btn btn-primary"));
        }
        app.append(page);
        const navigation = makeElement("nav", "index-navigation");
        navigation.setAttribute("aria-label", "Navegación del índice");
        navigation.append(makeLink("← Portada", "#/"));
        if (entries.length) navigation.append(makeLink("Empezar a leer →", `#/entrada/${escapeHash(entries[0].id)}`, "btn btn-primary"));
        app.append(navigation);
    }

    function printBook() {
        printReturnHash = location.hash || "#/";
        footer.hidden = true;
        const book = makeElement("section", "print-book");
        app.replaceChildren(book);

        const cover = makeElement("header", "print-cover");
        const coverArt = makeElement("div", "print-cover-art");
        const coverImage = document.createElement("img");
        coverImage.className = "print-cover-image";
        coverImage.src = "static/images/portada-diario.png";
        coverImage.alt = "Portada de El diario de SolosoyJuan";
        const copyrightNotice = makeElement("p", "print-copyright-notice", `Autor: Juan D. Henao · © ${new Date().getFullYear()} Juan D. Henao. Todos los derechos reservados.`);
        coverArt.append(coverImage);
        cover.append(coverArt, copyrightNotice);
        book.append(cover);

        const copyright = makeElement("section", "print-copyright");
        addPrintPaperBackground(copyright);
        copyright.append(
            makeElement("h2", "", "Derechos de autor"),
            makeElement("p", "", `© ${new Date().getFullYear()} Juan D. Henao. Todos los derechos reservados.`),
            makeElement("p", "", "Autor declarado: Juan D. Henao."),
            makeElement("p", "", "Este diario es una obra protegida por derechos de autor. Conserva esta atribución al citar o resumir su contenido. La reproducción o distribución requiere autorización del titular, salvo los usos permitidos por la ley.")
        );
        book.append(copyright);

        const index = makeElement("section", "print-index");
        addPrintPaperBackground(index);
        index.append(makeElement("h2", "", "Índice"));
        const list = document.createElement("ol");
        entries.forEach(entry => list.append(makeElement("li", "", entry.title)));
        index.append(list);
        book.append(index);

        entries.forEach(entry => {
            addPrintEntryPages(book, entry);
        });

        const ending = makeElement("section", "print-ending");
        addPrintPaperBackground(ending);
        ending.append(makeElement("h2", "", "Continuará..."));
        book.append(ending);
        const backCover = makeElement("section", "print-back-cover");
        const backCoverArt = makeElement("div", "print-back-cover-art");
        const backCoverImage = document.createElement("img");
        backCoverImage.className = "print-back-cover-image";
        backCoverImage.src = "static/images/contraportada-cuero.png";
        backCoverImage.alt = "Contraportada del diario";
        backCoverArt.append(
            backCoverImage,
            createPrintOrnamentalFrame(),
            makeElement("footer", "print-source-footer", "Descargado desde https://solosoyjuan03.github.io/solosoyjuan/")
        );
        backCover.append(backCoverArt);
        book.append(backCover);

        Promise.all(Array.from(book.querySelectorAll("img"), image => image.decode()))
            .then(() => window.print())
            .catch(error => {
                printReturnHash = null;
                showFlash(`No se pudo preparar el PDF porque falló una imagen: ${error.message}`, "error");
            });
    }

    function createPrintOrnamentalFrame() {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 1152" fill="none">
            <rect x="28" y="28" width="712" height="1096" rx="22" stroke="#f2b94f" stroke-width="5" opacity=".9"/>
            <rect x="48" y="48" width="672" height="1056" rx="16" stroke="#ffd77f" stroke-width="2" opacity=".8"/>
            <path d="M92 155H676M92 997H676M92 155V997M676 155V997" stroke="#e7ad45" stroke-width="2" opacity=".65"/>
            <g stroke="#ffd77f" stroke-width="3" opacity=".9">
                <circle cx="92" cy="92" r="34"/><circle cx="676" cy="92" r="34"/>
                <circle cx="92" cy="1060" r="34"/><circle cx="676" cy="1060" r="34"/>
                <circle cx="384" cy="92" r="20"/><circle cx="384" cy="1060" r="20"/>
                <path d="M92 68l24 24-24 24-24-24zM676 68l24 24-24 24-24-24z"/>
                <path d="M92 1036l24 24-24 24-24-24zM676 1036l24 24-24 24-24-24z"/>
                <path d="M384 68v48m-24-24h48M384 1036v48m-24-24h48"/>
            </g>
            <g stroke="#e7ad45" stroke-width="2" opacity=".7">
                <path d="M150 140l15 15-15 15-15-15zM194 140l15 15-15 15-15-15zM238 140l15 15-15 15-15-15zM282 140l15 15-15 15-15-15z"/>
                <path d="M486 140l15 15-15 15-15-15zM530 140l15 15-15 15-15-15zM574 140l15 15-15 15-15-15zM618 140l15 15-15 15-15-15z"/>
                <path d="M150 982l15 15-15 15-15-15zM194 982l15 15-15 15-15-15zM238 982l15 15-15 15-15-15zM282 982l15 15-15 15-15-15z"/>
                <path d="M486 982l15 15-15 15-15-15zM530 982l15 15-15 15-15-15zM574 982l15 15-15 15-15-15zM618 982l15 15-15 15-15-15z"/>
                <path d="M92 230l-15 15 15 15 15-15zM92 310l-15 15 15 15 15-15zM92 390l-15 15 15 15 15-15zM92 470l-15 15 15 15 15-15zM92 550l-15 15 15 15 15-15zM92 630l-15 15 15 15 15-15zM92 710l-15 15 15 15 15-15zM92 790l-15 15 15 15 15-15zM92 870l-15 15 15 15 15-15z"/>
                <path d="M676 230l-15 15 15 15 15-15zM676 310l-15 15 15 15 15-15zM676 390l-15 15 15 15 15-15zM676 470l-15 15 15 15 15-15zM676 550l-15 15 15 15 15-15zM676 630l-15 15 15 15 15-15zM676 710l-15 15 15 15 15-15zM676 790l-15 15 15 15 15-15zM676 870l-15 15 15 15 15-15z"/>
            </g>
        </svg>`;
        const image = document.createElement("img");
        image.className = "print-cover-frame";
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        image.alt = "";
        image.setAttribute("aria-hidden", "true");
        return image;
    }

    function addPrintPaperBackground(section) {
        section.classList.add("print-has-paper-background");
        const image = document.createElement("img");
        image.className = "print-page-background";
        image.src = "static/images/fondo-paginas-diario.jpg";
        image.alt = "";
        image.setAttribute("aria-hidden", "true");
        section.prepend(image);
    }

    function addPrintEntryPages(book, entry) {
        const words = entry.content.trim().match(/\S+\s*/g) || [];
        let start = 0;
        let pageIndex = 0;

        while (start < words.length) {
            const page = makeElement("article", "print-entry");
            const paper = makeElement("div", "print-entry-page print-has-paper-background");
            const background = document.createElement("img");
            background.className = "print-page-background";
            background.src = "static/images/fondo-paginas-diario.jpg";
            background.alt = "";
            background.setAttribute("aria-hidden", "true");

            const content = makeElement("div", "print-entry-layout");
            const title = makeElement("h2", "", entry.title);
            const text = makeElement("div", "print-entry-content");
            content.append(title, text);
            paper.append(background, content);
            page.append(paper);
            book.append(page);

            let low = 1;
            let high = words.length - start;
            let fittingWords = 0;
            while (low <= high) {
                const middle = Math.floor((low + high) / 2);
                text.textContent = words.slice(start, start + middle).join("");
                if (text.scrollHeight <= text.clientHeight + 1 && text.scrollWidth <= text.clientWidth + 1) {
                    fittingWords = middle;
                    low = middle + 1;
                } else {
                    high = middle - 1;
                }
            }
            if (fittingWords === 0) fittingWords = 1;
            text.textContent = words.slice(start, start + fittingWords).join("");
            start += fittingWords;
            pageIndex += 1;
        }
    }

    function renderEntry(entryId) {
        footer.hidden = false;
        const position = entries.findIndex(entry => entry.id === entryId);
        if (position < 0) {
            renderNotFound();
            return;
        }
        const entry = entries[position];
        const page = makeElement("article", "paper-panel entry-card book-page");
        const content = makeElement("div", "page-content");
        content.append(makeElement("h1", "entry-title", entry.title));
        const text = makeElement("div", "entry-text", entry.content.trim());
        content.append(text);
        page.append(content);
        app.append(page);

        const controls = makeElement("div", "reading-controls");
        const pageNumber = makeElement("div", "page-number", "Preparando páginas…");
        pageNumber.setAttribute("aria-live", "polite");
        const navigation = makeElement("nav", "page-navigation");
        navigation.setAttribute("aria-label", "Navegación del diario");
        const previousEntry = entries[position - 1];
        const nextEntry = entries[position + 1];
        const previous = makeLink(previousEntry ? "← Entrada anterior" : "← Índice", previousEntry ? `#/entrada/${escapeHash(previousEntry.id)}` : "#/indice");
        const next = makeLink(nextEntry ? "Entrada siguiente →" : "Continuará →", nextEntry ? `#/entrada/${escapeHash(nextEntry.id)}` : "#/continuara", "btn btn-primary");
        navigation.append(previous, next);
        controls.append(pageNumber, navigation);
        app.append(controls);

        if (isEditor()) {
            const actions = makeElement("div", "actions editor-actions");
            actions.append(makeLink("Editar página", `#/editar/${escapeHash(entry.id)}`));
            actions.append(makeButton("Eliminar", "btn btn-danger", () => deleteEntry(entry.id)));
            app.append(actions);
        }
        requestAnimationFrame(() => paginateEntry(text, pageNumber, previous, next, position, entries.length));
    }

    function paginateEntry(text, pageNumber, previous, next, entryPosition, totalEntries) {
        const source = text.textContent.trim();
        const words = source.match(/\S+\s*/g) || [];
        const pages = [];
        let start = 0;

        while (start < words.length) {
            let low = start + 1;
            let high = words.length;
            let fittingEnd = start;
            while (low <= high) {
                const middle = Math.floor((low + high) / 2);
                text.textContent = words.slice(start, middle).join("");
                if (text.scrollHeight <= text.clientHeight + 1 && text.scrollWidth <= text.clientWidth + 1) {
                    fittingEnd = middle;
                    low = middle + 1;
                } else {
                    high = middle - 1;
                }
            }
            if (fittingEnd === start) fittingEnd = start + 1;
            pages.push(words.slice(start, fittingEnd).join(""));
            start = fittingEnd;
        }

        let currentPage = 0;
        const renderPage = () => {
            text.textContent = pages[currentPage] || "";
            pageNumber.textContent = `Entrada ${entryPosition + 1} de ${totalEntries} · Hoja ${currentPage + 1} de ${pages.length || 1}`;
            if (currentPage > 0) {
                previous.href = "#";
                previous.textContent = "← Hoja anterior";
            } else {
                previous.href = entryPosition > 0 ? `#/entrada/${escapeHash(entries[entryPosition - 1].id)}` : "#/indice";
                previous.textContent = entryPosition > 0 ? "← Entrada anterior" : "← Índice";
            }
            if (currentPage < pages.length - 1) {
                next.href = "#";
                next.textContent = "Hoja siguiente →";
            } else {
                next.href = entryPosition + 1 < totalEntries ? `#/entrada/${escapeHash(entries[entryPosition + 1].id)}` : "#/continuara";
                next.textContent = entryPosition + 1 < totalEntries ? "Entrada siguiente →" : "Continuará →";
            }
        };
        previous.addEventListener("click", event => {
            if (currentPage > 0) {
                event.preventDefault();
                currentPage -= 1;
                renderPage();
            }
        });
        next.addEventListener("click", event => {
            if (currentPage < pages.length - 1) {
                event.preventDefault();
                currentPage += 1;
                renderPage();
            }
        });
        renderPage();
    }

    function renderContinue() {
        footer.hidden = false;
        const page = makeElement("section", "paper-panel ending-page");
        const copy = makeElement("div", "ending-copy");
        copy.append(
            makeElement("p", "eyebrow", "Fin de las páginas disponibles"),
            makeElement("h1", "", "Continuará..."),
            makeElement("p", "", "La historia no termina aquí. Quedan páginas por escribir y nuevos momentos por contar.")
        );
        page.append(copy);
        app.append(page);
        const navigation = makeElement("nav", "ending-navigation");
        const lastEntry = entries[entries.length - 1];
        navigation.append(
            makeLink("← Página anterior", lastEntry ? `#/entrada/${escapeHash(lastEntry.id)}` : "#/indice"),
            makeLink("Ver cierre del diario →", "#/cierre", "btn btn-primary")
        );
        app.append(navigation);
    }

    function renderBackCover() {
        footer.hidden = true;
        const section = makeElement("section", "back-cover-page");
        section.setAttribute("aria-label", "Contraportada del diario");
        const image = document.createElement("img");
        image.className = "back-cover-image";
        image.src = "static/images/contraportada-cuero.png";
        image.alt = "Contraportada vacía del diario";
        section.append(image);
        app.append(section);
    }

    function renderForm(entry = null) {
        footer.hidden = false;
        const heading = makeElement("div", "page-heading");
        heading.append(makeElement("p", "eyebrow", entry ? "Revisa tus recuerdos" : "Continúa tu historia"));
        heading.append(makeElement("h1", "", entry ? "Editar entrada" : "Nueva entrada"));
        const form = makeElement("form", "paper-panel form-panel");

        const titleGroup = makeElement("div", "form-group");
        const titleLabel = makeElement("label", "", "Fecha o título de la página");
        titleLabel.htmlFor = "entry-title-input";
        const title = document.createElement("input");
        title.id = "entry-title-input";
        title.name = "title";
        title.type = "text";
        title.required = true;
        title.maxLength = 200;
        title.placeholder = "Escribe aquí la fecha que quieras usar";
        title.value = entry ? entry.title : "";
        titleGroup.append(titleLabel, title);

        const contentGroup = makeElement("div", "form-group");
        const contentLabel = makeElement("label", "", "Tu historia");
        contentLabel.htmlFor = "entry-content-input";
        const content = document.createElement("textarea");
        content.id = "entry-content-input";
        content.name = "content";
        content.required = true;
        content.placeholder = "Escribe aquí tus pensamientos...";
        content.value = entry ? entry.content : "";
        contentGroup.append(contentLabel, content);

        const actions = makeElement("div", "actions");
        const submit = document.createElement("button");
        submit.type = "submit";
        submit.className = "btn btn-primary";
        submit.textContent = entry ? "Guardar cambios" : "Guardar página";
        actions.append(submit, makeLink("Cancelar", entry ? `#/entrada/${escapeHash(entry.id)}` : "#/indice"));
        form.append(titleGroup, contentGroup, actions);
        form.addEventListener("submit", event => {
            event.preventDefault();
            const cleanTitle = title.value.trim();
            if (!cleanTitle || !content.value.trim()) {
                showFlash("Escribe un título y el contenido antes de guardar.", "error");
                return;
            }
            const now = new Date().toISOString();
            if (entry) {
                const updated = entries.map(item => item.id === entry.id
                    ? { ...item, title: cleanTitle, content: content.value, updatedAt: now }
                    : item);
                persistEntries(updated.sort(compareEntries));
                navigate(`#/entrada/${escapeHash(entry.id)}`, "La página se actualizó.");
            } else {
                const nextId = String(Math.max(0, ...entries.map(item => Number(item.id) || 0)) + 1);
                const created = [...entries, { id: nextId, title: cleanTitle, content: content.value, createdAt: now, updatedAt: now }];
                persistEntries(created.sort(compareEntries));
                navigate(`#/entrada/${escapeHash(nextId)}`, "La página se guardó.");
            }
        });
        app.append(heading, form);
    }

    function renderLogin() {
        footer.hidden = false;
        const heading = makeElement("div", "page-heading login-panel");
        heading.append(makeElement("p", "eyebrow", "Tu espacio personal"), makeElement("h1", "", "Abre tu diario"));
        const panel = makeElement("section", "paper-panel form-panel login-panel");
        const hasPassword = localStorage.getItem(PASSWORD_KEY) !== null;
        panel.append(makeElement("p", "local-notice", hasPassword
            ? "Esta clave solo oculta los controles de edición en este navegador. No protege el sitio público ni publica cambios en GitHub Pages."
            : "Crea una clave local para mostrar los controles de edición en este navegador. No es una contraseña segura y no protege el sitio público."));
        const form = makeElement("form");
        const passwordGroup = makeElement("div", "form-group");
        const passwordLabel = makeElement("label", "", hasPassword ? "Contraseña" : "Crea tu contraseña");
        passwordLabel.htmlFor = "owner-password";
        const password = document.createElement("input");
        password.id = "owner-password";
        password.type = "password";
        password.autocomplete = hasPassword ? "current-password" : "new-password";
        password.minLength = 6;
        password.required = true;
        passwordGroup.append(passwordLabel, password);

        const actions = makeElement("div", "actions");
        const submit = document.createElement("button");
        submit.type = "submit";
        submit.className = "btn btn-primary";
        submit.textContent = hasPassword ? "Entrar" : "Guardar clave y entrar";
        actions.append(submit, makeLink("Volver a la portada", "#/"));
        form.append(passwordGroup, actions);
        form.addEventListener("submit", async event => {
            event.preventDefault();
            if (!window.crypto || !window.crypto.subtle) {
                showFlash("Este navegador no permite usar el acceso local. Usa un navegador actualizado.", "error");
                return;
            }
            try {
                const hash = await hashPassword(password.value);
                if (hasPassword && hash !== localStorage.getItem(PASSWORD_KEY)) {
                    showFlash("La contraseña local no coincide.", "error");
                    return;
                }
                if (!hasPassword) localStorage.setItem(PASSWORD_KEY, hash);
                sessionStorage.setItem(SESSION_KEY, "active");
                navigate("#/indice", hasPassword ? "Sesión local iniciada." : "Clave local creada.");
            } catch (error) {
                showFlash(`No se pudo iniciar la edición local: ${error.message}`, "error");
            }
        });
        panel.append(form);
        app.append(heading, panel);
    }

    async function hashPassword(value) {
        const bytes = new TextEncoder().encode(value);
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    }

    function renderNotFound() {
        footer.hidden = false;
        const panel = makeElement("section", "paper-panel form-panel");
        panel.append(makeElement("h1", "", "No encontramos esa página."), makeLink("Volver al índice", "#/indice", "btn btn-primary"));
        app.append(panel);
    }

    function render() {
        renderHeader();
        app.replaceChildren();
        const [page, identifier] = route();
        if (page === "") renderCover();
        else if (page === "indice") renderIndex();
        else if (page === "entrada") renderEntry(identifier || "");
        else if (page === "continuara") renderContinue();
        else if (page === "cierre") renderBackCover();
        else if (page === "login") renderLogin();
        else if (page === "nueva" && isEditor()) renderForm();
        else if (page === "editar" && isEditor()) {
            const entry = entries.find(item => item.id === identifier);
            if (entry) renderForm(entry);
            else renderNotFound();
        } else if (page === "nueva" || page === "editar") {
            navigate("#/login");
            return;
        } else renderNotFound();
        addFlash();
        if (page !== "entrada") app.focus({ preventScroll: true });
    }

    function navigate(hash, message = null) {
        flashMessage = message ? { message, category: "success" } : null;
        if (location.hash === hash) render();
        else location.hash = hash;
    }

    function deleteEntry(id) {
        if (!confirm("¿Eliminar esta entrada? Esta acción no se puede deshacer.")) return;
        persistEntries(entries.filter(entry => entry.id !== id));
        navigate("#/indice", "La página se eliminó.");
    }

    function exportBackup() {
        const backup = new Blob([JSON.stringify({ version: 1, entries }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(backup);
        const link = document.createElement("a");
        link.href = url;
        link.download = "respaldo-diario.json";
        link.click();
        URL.revokeObjectURL(url);
        showFlash("Se descargó el respaldo JSON de tus páginas.", "success");
    }

    importFile.addEventListener("change", async () => {
        const file = importFile.files && importFile.files[0];
        if (!file) return;
        try {
            const data = JSON.parse(await file.text());
            const imported = Array.isArray(data) ? data : data.entries;
            if (!Array.isArray(imported)) throw new Error("El JSON debe contener una lista de entradas.");
            const validated = imported.map(normalizeEntry).sort(compareEntries);
            if (!confirm(`Se reemplazarán las ${entries.length} páginas actuales por ${validated.length} páginas del respaldo. ¿Continuar?`)) return;
            persistEntries(validated);
            navigate("#/indice", "El respaldo se importó correctamente.");
        } catch (error) {
            showFlash(`No se pudo importar el respaldo: ${error.message}`, "error");
        } finally {
            importFile.value = "";
        }
    });

    window.addEventListener("hashchange", render);
    window.addEventListener("afterprint", () => {
        if (printReturnHash === null) return;
        const returnHash = printReturnHash;
        printReturnHash = null;
        if (location.hash === returnHash) render();
        else navigate(returnHash);
    });
    window.addEventListener("resize", () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
            if (route()[0] === "entrada") render();
        }, 150);
    });

    try {
        entries = loadEntries();
        render();
    } catch (error) {
        app.replaceChildren(makeElement("div", "flash error", `No se pudo abrir el diario: ${error.message}`));
        console.error(error);
    }
})();
