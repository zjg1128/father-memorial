document.addEventListener("DOMContentLoaded", () => {
    const apiBase = (window.memorialApiBase || "").replace(/\/$/, "");

    const getStoredJson = (key, fallback) => {
        try {
            return JSON.parse(localStorage.getItem(key) || "null") || fallback;
        } catch {
            return fallback;
        }
    };

    const defaultContent = window.memorialContent || {};
    const savedContent = getStoredJson("memorialContentDraft", {});
    const content = { ...defaultContent, ...savedContent };
    content.lifeParagraphs = savedContent.lifeParagraphs || defaultContent.lifeParagraphs || [];
    content.timeline = savedContent.timeline || defaultContent.timeline || [];
    content.defaultTributes = savedContent.defaultTributes || defaultContent.defaultTributes || [];

    const navbar = document.querySelector(".navbar");
    const hero = document.querySelector(".hero");
    const candleButton = document.querySelector("#lightCandle");
    const candleCount = document.querySelector("#candleCount");
    const memoryLights = document.querySelector("#memoryLights");
    const tributeForm = document.querySelector("#tributeForm");
    const tributeList = document.querySelector("#tributeList");
    const remoteComments = document.querySelector("#remoteComments");
    const tributeStatus = document.querySelector("#tributeStatus");
    const photoGrid = document.querySelector("#photoGrid");
    const galleryFilters = document.querySelector("#galleryFilters");
    const galleryCount = document.querySelector("#galleryCount");
    const emptyGallery = document.querySelector("#emptyGallery");
    const lightbox = document.querySelector("#lightbox");
    const lightboxImage = document.querySelector("#lightboxImage");
    const lightboxTitle = document.querySelector("#lightboxTitle");
    const lightboxMeta = document.querySelector("#lightboxMeta");
    const lightboxText = document.querySelector("#lightboxText");
    const lightboxClose = document.querySelector("#lightboxClose");
    const lifeCopy = document.querySelector("#lifeCopy");
    const timelineList = document.querySelector("#timelineList");

    const applyContent = () => {
        document.querySelectorAll("[data-content]").forEach((element) => {
            const key = element.dataset.content;

            if (Object.prototype.hasOwnProperty.call(content, key)) {
                element.textContent = content[key];
            }
        });

        if (lifeCopy && Array.isArray(content.lifeParagraphs)) {
            lifeCopy.replaceChildren();
            content.lifeParagraphs.forEach((paragraph) => {
                const p = document.createElement("p");
                p.textContent = paragraph;
                lifeCopy.append(p);
            });
        }

        if (timelineList && Array.isArray(content.timeline)) {
            timelineList.replaceChildren();
            content.timeline.forEach((item) => {
                const article = document.createElement("article");
                article.className = "timeline-item";

                const time = document.createElement("time");
                time.textContent = item.time || "";

                const body = document.createElement("div");
                const title = document.createElement("h3");
                title.textContent = item.title || "";
                const text = document.createElement("p");
                text.textContent = item.text || "";

                body.append(title, text);
                article.append(time, body);
                timelineList.append(article);
            });
        }

        if (tributeList && Array.isArray(content.defaultTributes)) {
            tributeList.querySelectorAll(".default-tribute").forEach((item) => item.remove());
            content.defaultTributes.forEach((tribute) => {
                const element = createTribute(tribute);
                element.classList.add("default-tribute");
                tributeList.append(element);
            });
        }
    };

    const updateNavbar = () => {
        navbar.classList.toggle("scrolled", window.scrollY > 18);
    };

    updateNavbar();
    window.addEventListener("scroll", updateNavbar, { passive: true });

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }

            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.16 });

    document.querySelectorAll(".section-fade").forEach((element) => {
        revealObserver.observe(element);
    });

    const attachImageFallback = (image) => {
        image.addEventListener("error", () => {
            const fallback = document.createElement("div");
            fallback.className = "image-fallback";
            fallback.textContent = image.dataset.fallback || "照片待补";
            image.replaceWith(fallback);
        }, { once: true });
    };

    document.querySelectorAll("img[data-fallback]").forEach(attachImageFallback);

    const uploadedAlbum = getStoredJson("memorialUploadedAlbum", []);
    const album = [
        ...(Array.isArray(window.memorialAlbum) ? window.memorialAlbum : []),
        ...(Array.isArray(uploadedAlbum) ? uploadedAlbum : [])
    ];
    let activeCategory = "全部";

    const getCategories = () => {
        const categories = album
            .map((photo) => photo.category || "未分类")
            .filter((category, index, list) => list.indexOf(category) === index);
        return ["全部", ...categories];
    };

    const getFilteredAlbum = () => {
        if (activeCategory === "全部") {
            return album;
        }

        return album.filter((photo) => (photo.category || "未分类") === activeCategory);
    };

    const openLightbox = (photo) => {
        lightboxImage.src = photo.src;
        lightboxImage.alt = photo.title || "相册照片";
        lightboxTitle.textContent = photo.title || "未命名照片";
        lightboxMeta.textContent = [photo.year, photo.category].filter(Boolean).join(" · ");
        lightboxText.textContent = photo.caption || "";
        lightbox.hidden = false;
        document.body.style.overflow = "hidden";
        lightboxClose.focus();
    };

    const closeLightbox = () => {
        lightbox.hidden = true;
        lightboxImage.src = "";
        document.body.style.overflow = "";
    };

    const createPhotoCard = (photo) => {
        const figure = document.createElement("figure");
        figure.className = "photo-card";
        figure.tabIndex = 0;
        figure.setAttribute("role", "button");
        figure.setAttribute("aria-label", `查看照片：${photo.title || "未命名照片"}`);
        figure.addEventListener("click", () => openLightbox(photo));
        figure.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openLightbox(photo);
            }
        });

        const image = document.createElement("img");
        image.src = photo.src;
        image.alt = photo.title || "相册照片";
        image.loading = "lazy";
        image.dataset.fallback = photo.title || "照片待补";
        attachImageFallback(image);

        const caption = document.createElement("figcaption");

        const title = document.createElement("h3");
        title.textContent = photo.title || "未命名照片";

        const meta = document.createElement("span");
        meta.className = "photo-meta";
        meta.textContent = [photo.year, photo.category].filter(Boolean).join(" · ");

        const text = document.createElement("p");
        text.textContent = photo.caption || "";

        caption.append(title, meta, text);
        figure.append(image, caption);

        return figure;
    };

    const renderFilters = () => {
        galleryFilters.replaceChildren();

        getCategories().forEach((category) => {
            const button = document.createElement("button");
            button.className = "gallery-tab";
            button.type = "button";
            button.textContent = category;
            button.classList.toggle("active", category === activeCategory);
            button.setAttribute("aria-pressed", String(category === activeCategory));
            button.addEventListener("click", () => {
                activeCategory = category;
                renderGallery();
            });
            galleryFilters.append(button);
        });
    };

    const renderGallery = () => {
        const photos = getFilteredAlbum();
        photoGrid.replaceChildren();
        renderFilters();

        photos.forEach((photo) => {
            photoGrid.append(createPhotoCard(photo));
        });

        emptyGallery.hidden = photos.length > 0;
        galleryCount.textContent = photos.length ? `共 ${photos.length} 张照片` : "";
    };

    renderGallery();

    lightboxClose.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (event) => {
        if (event.target === lightbox) {
            closeLightbox();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !lightbox.hidden) {
            closeLightbox();
        }
    });

    const createTribute = ({ name, message }) => {
        const blockquote = document.createElement("blockquote");
        blockquote.className = "tribute-item";

        const paragraph = document.createElement("p");
        paragraph.textContent = message;

        const cite = document.createElement("cite");
        cite.textContent = name;

        blockquote.append(paragraph, cite);
        return blockquote;
    };

    applyContent();

    const lightPositions = [
        [8, 30], [13, 46], [18, 68], [24, 36], [27, 78], [11, 84],
        [31, 24], [34, 58], [16, 22], [22, 88], [6, 62], [29, 70],
        [70, 28], [76, 50], [82, 70], [88, 34], [93, 58], [74, 82],
        [84, 22], [91, 78], [67, 62], [79, 88], [96, 42], [86, 86]
    ];

    const renderMemoryLights = (count = 0) => {
        if (!memoryLights) {
            return;
        }

        const total = Math.max(8, Math.min(lightPositions.length, Number(count) || 0));
        memoryLights.replaceChildren();

        lightPositions.slice(0, total).forEach(([left, top], index) => {
            const light = document.createElement("span");
            light.className = "memory-light";
            light.style.left = `${left}%`;
            light.style.top = `${top}%`;
            light.style.animationDelay = `${(index % 6) * -0.75}s`;
            light.style.setProperty("--light-scale", String(0.82 + (index % 4) * 0.12));
            memoryLights.append(light);
        });
    };

    const pulseHeroLamp = () => {
        if (!hero) {
            return;
        }

        hero.classList.remove("lamp-lit");
        window.requestAnimationFrame(() => {
            hero.classList.add("lamp-lit");
            window.setTimeout(() => hero.classList.remove("lamp-lit"), 1500);
        });
    };

    const formatDate = (value) => {
        if (!value) {
            return "";
        }

        return new Intl.DateTimeFormat("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).format(new Date(value));
    };

    const renderRemoteComments = (comments) => {
        if (!remoteComments) {
            return;
        }

        remoteComments.replaceChildren();

        if (!comments.length) {
            const empty = document.createElement("p");
            empty.className = "form-note";
            empty.textContent = "暂时还没有亲友寄语。";
            remoteComments.append(empty);
            return;
        }

        comments.forEach((comment) => {
            remoteComments.append(createTribute({
                name: `${comment.name || "亲友"} · ${formatDate(comment.created_at)}`,
                message: comment.message || ""
            }));
        });
    };

    const apiFetch = async (path, options = {}) => {
        if (!apiBase) {
            throw new Error("Missing API base");
        }

        const response = await fetch(`${apiBase}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || "Request failed");
        }

        return data;
    };

    const loadCloudflareStore = async () => {
        if (!apiBase) {
            candleCount.textContent = "未配置";
            renderMemoryLights();

            if (remoteComments) {
                remoteComments.replaceChildren();
                const empty = document.createElement("p");
                empty.className = "form-note";
                empty.textContent = "数据库 API 尚未配置。";
                remoteComments.append(empty);
            }

            return;
        }

        try {
            const [stats, commentsData] = await Promise.all([
                apiFetch("/stats"),
                apiFetch("/comments")
            ]);

            candleCount.textContent = String(stats.candles || 0);
            renderMemoryLights(stats.candles || 0);
            renderRemoteComments(Array.isArray(commentsData.comments) ? commentsData.comments : []);
        } catch {
            candleCount.textContent = "暂不可用";
            renderMemoryLights();

            if (remoteComments) {
                remoteComments.replaceChildren();
                const error = document.createElement("p");
                error.className = "form-note";
                error.textContent = "暂时无法读取留言，请稍后再试。";
                remoteComments.append(error);
            }
        }
    };

    if (candleButton) {
        candleButton.addEventListener("click", async () => {
            candleButton.disabled = true;
            candleButton.textContent = "正在点亮";

            try {
                const result = await apiFetch("/candles", { method: "POST", body: JSON.stringify({}) });
                candleCount.textContent = String(result.candles || 0);
                renderMemoryLights(result.candles || 0);
                pulseHeroLamp();
                candleButton.textContent = "思念已点亮";
            } catch {
                candleButton.textContent = "点亮失败";
            }

            window.setTimeout(() => {
                candleButton.disabled = false;
                candleButton.textContent = "点一盏思念";
            }, 1400);
        });
    }

    if (tributeForm) {
        tributeForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const name = document.querySelector("#tributeName").value.trim();
            const message = document.querySelector("#tributeMessage").value.trim();

            if (!name || !message) {
                return;
            }

            tributeStatus.textContent = "正在提交……";

            try {
                await apiFetch("/comments", {
                    method: "POST",
                    body: JSON.stringify({ name, message })
                });
                tributeForm.reset();
                tributeStatus.textContent = "寄语已保存。";
                await loadCloudflareStore();
            } catch (error) {
                tributeStatus.textContent = error.message || "提交失败，请稍后再试。";
            }
        });
    }

    renderMemoryLights();
    loadCloudflareStore();
});
