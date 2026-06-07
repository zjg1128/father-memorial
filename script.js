document.addEventListener("DOMContentLoaded", () => {
    const apiBase = (window.memorialApiBase || "").replace(/\/$/, "");

    let remoteCommentsList = [];
    let tributesCurrentPage = 1;
    const tributesPerPage = 6;

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
            tributeList.replaceChildren();
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

    // 确保直接加载 Hash 锚点或改变 Hash 时目标区域立即可见
    const makeHashSectionVisible = () => {
        if (window.location.hash) {
            try {
                const targetSection = document.querySelector(window.location.hash);
                if (targetSection) {
                    const fadeEl = targetSection.querySelector(".section-fade");
                    if (fadeEl) {
                        fadeEl.classList.add("visible");
                    }
                }
            } catch (err) {
                console.warn("Invalid hash selector:", err);
            }
        }
    };

    makeHashSectionVisible();
    window.addEventListener("hashchange", makeHashSectionVisible);

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
    let searchQuery = "";
    let selectedYear = "";
    let currentPhotoIndex = -1;

    const getCategories = () => {
        const categories = album
            .map((photo) => photo.category || "未分类")
            .filter((category, index, list) => list.indexOf(category) === index);
        return ["全部", ...categories];
    };

    const getFilteredAlbum = () => {
        return album.filter((photo) => {
            const matchesCategory = activeCategory === "全部" || (photo.category || "未分类") === activeCategory;
            const matchesYear = !selectedYear || photo.year === selectedYear;
            const query = searchQuery.toLowerCase().trim();
            const matchesSearch = !query || 
                (photo.title || "").toLowerCase().includes(query) || 
                (photo.caption || "").toLowerCase().includes(query);
            return matchesCategory && matchesYear && matchesSearch;
        });
    };

    const openLightbox = (photo) => {
        const filtered = getFilteredAlbum();
        currentPhotoIndex = filtered.findIndex((p) => p.src === photo.src);
        
        updateLightboxContent(photo);
        lightbox.hidden = false;
        document.body.style.overflow = "hidden";
        lightboxClose.focus();
        updateLightboxNav();
    };

    const closeLightbox = () => {
        lightbox.hidden = true;
        lightboxImage.src = "";
        document.body.style.overflow = "";
    };

    const updateLightboxContent = (photo) => {
        lightboxImage.src = photo.src;
        lightboxImage.alt = photo.title || "相册照片";
        lightboxTitle.textContent = photo.title || "未命名照片";
        lightboxMeta.textContent = [photo.year, photo.category].filter(Boolean).join(" · ");
        lightboxText.textContent = photo.caption || "";
    };

    const updateLightboxNav = () => {
        const filtered = getFilteredAlbum();
        const prevBtn = document.querySelector("#lightboxPrev");
        const nextBtn = document.querySelector("#lightboxNext");
        if (!prevBtn || !nextBtn) return;

        if (filtered.length <= 1) {
            prevBtn.disabled = true;
            nextBtn.disabled = true;
        } else {
            prevBtn.disabled = false;
            nextBtn.disabled = false;
        }
    };

    const navigateLightbox = (direction) => {
        const filtered = getFilteredAlbum();
        if (filtered.length <= 1) return;

        if (direction === "next") {
            currentPhotoIndex = (currentPhotoIndex + 1) % filtered.length;
        } else if (direction === "prev") {
            currentPhotoIndex = (currentPhotoIndex - 1 + filtered.length) % filtered.length;
        }

        const photo = filtered[currentPhotoIndex];
        if (photo) {
            updateLightboxContent(photo);
            updateLightboxNav();
        }
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

    const populateYearFilter = () => {
        const yearFilter = document.querySelector("#galleryYearFilter");
        if (!yearFilter) return;

        const years = album
            .map((photo) => photo.year)
            .filter((year) => year && year !== "待补" && year !== "旧照" && !isNaN(year))
            .filter((year, index, list) => list.indexOf(year) === index)
            .sort((a, b) => b - a);

        yearFilter.replaceChildren();

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "所有年份";
        yearFilter.append(defaultOption);

        years.forEach((year) => {
            const option = document.createElement("option");
            option.value = year;
            option.textContent = `${year} 年`;
            yearFilter.append(option);
        });

        const specialYears = ["旧照", "待补"];
        specialYears.forEach((y) => {
            if (album.some((photo) => photo.year === y)) {
                const option = document.createElement("option");
                option.value = y;
                option.textContent = y;
                yearFilter.append(option);
            }
        });

        yearFilter.value = selectedYear;
    };

    const renderGallery = () => {
        const photos = getFilteredAlbum();
        photoGrid.replaceChildren();
        renderFilters();
        populateYearFilter();

        photos.forEach((photo) => {
            photoGrid.append(createPhotoCard(photo));
        });

        emptyGallery.hidden = photos.length > 0;
        galleryCount.textContent = photos.length ? `共 ${photos.length} 张照片` : "";
    };

    renderGallery();

    const gallerySearch = document.querySelector("#gallerySearch");
    const galleryYearFilter = document.querySelector("#galleryYearFilter");

    if (gallerySearch) {
        gallerySearch.addEventListener("input", (e) => {
            searchQuery = e.target.value;
            renderGallery();
        });
    }

    if (galleryYearFilter) {
        galleryYearFilter.addEventListener("change", (e) => {
            selectedYear = e.target.value;
            renderGallery();
        });
    }

    const lightboxPrev = document.querySelector("#lightboxPrev");
    const lightboxNext = document.querySelector("#lightboxNext");

    if (lightboxPrev) {
        lightboxPrev.addEventListener("click", (e) => {
            e.stopPropagation();
            navigateLightbox("prev");
        });
    }

    if (lightboxNext) {
        lightboxNext.addEventListener("click", (e) => {
            e.stopPropagation();
            navigateLightbox("next");
        });
    }

    lightboxClose.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (event) => {
        if (event.target === lightbox) {
            closeLightbox();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (!lightbox.hidden) {
            if (event.key === "Escape") {
                closeLightbox();
            } else if (event.key === "ArrowRight") {
                navigateLightbox("next");
            } else if (event.key === "ArrowLeft") {
                navigateLightbox("prev");
            }
        }
    });

    let touchStartX = 0;
    let touchEndX = 0;

    lightbox.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightbox.addEventListener("touchend", (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diffX = touchEndX - touchStartX;
        if (Math.abs(diffX) > 50) {
            if (diffX < 0) {
                navigateLightbox("next");
            } else {
                navigateLightbox("prev");
            }
        }
    }, { passive: true });

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

    const renderRemoteComments = () => {
        if (!remoteComments) {
            return;
        }

        remoteComments.replaceChildren();

        // Remove old pagination container if exists
        const oldPagination = document.querySelector(".tributes-pagination");
        if (oldPagination) {
            oldPagination.remove();
        }

        if (!remoteCommentsList.length) {
            const empty = document.createElement("p");
            empty.className = "form-note";
            empty.textContent = "暂时还没有亲友寄语。";
            remoteComments.append(empty);
            return;
        }

        const totalPages = Math.ceil(remoteCommentsList.length / tributesPerPage);
        if (tributesCurrentPage > totalPages) {
            tributesCurrentPage = totalPages;
        }
        if (tributesCurrentPage < 1) {
            tributesCurrentPage = 1;
        }

        const start = (tributesCurrentPage - 1) * tributesPerPage;
        const pageComments = remoteCommentsList.slice(start, start + tributesPerPage);

        pageComments.forEach((comment) => {
            remoteComments.append(createTribute({
                name: `${comment.name || "亲友"} · ${formatDate(comment.created_at)}`,
                message: comment.message || ""
            }));
        });

        if (totalPages > 1) {
            const paginationContainer = document.createElement("div");
            paginationContainer.className = "tributes-pagination";

            const prevBtn = document.createElement("button");
            prevBtn.className = "pagination-btn";
            prevBtn.type = "button";
            prevBtn.textContent = "上一页";
            prevBtn.disabled = tributesCurrentPage === 1;
            prevBtn.addEventListener("click", () => {
                tributesCurrentPage--;
                renderRemoteComments();
                remoteComments.scrollIntoView({ behavior: "smooth", block: "nearest" });
            });

            const pageInfo = document.createElement("span");
            pageInfo.className = "pagination-info";
            pageInfo.textContent = `${tributesCurrentPage} / ${totalPages}`;

            const nextBtn = document.createElement("button");
            nextBtn.className = "pagination-btn";
            nextBtn.type = "button";
            nextBtn.textContent = "下一页";
            nextBtn.disabled = tributesCurrentPage === totalPages;
            nextBtn.addEventListener("click", () => {
                tributesCurrentPage++;
                renderRemoteComments();
                remoteComments.scrollIntoView({ behavior: "smooth", block: "nearest" });
            });

            paginationContainer.append(prevBtn, pageInfo, nextBtn);
            remoteComments.after(paginationContainer);
        }
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
            remoteCommentsList = Array.isArray(commentsData.comments) ? commentsData.comments : [];
            renderRemoteComments();
        } catch {
            candleCount.textContent = "暂不可用";
            renderMemoryLights();
            remoteCommentsList = [];

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

    // Background Music Player Logic
    const bgMusicAudio = document.querySelector("#bgMusicAudio");
    const musicToggle = document.querySelector("#musicToggle");

    if (musicToggle && bgMusicAudio) {
        bgMusicAudio.volume = 0.35;

        const savedMusicPref = localStorage.getItem("memorialMusicPlaying");
        
        const updateMusicButton = (playing) => {
            musicToggle.classList.toggle("playing", playing);
            const textEl = musicToggle.querySelector(".music-text");
            if (textEl) {
                textEl.textContent = playing ? "暂停音乐" : "播放音乐";
            }
        };

        const playMusic = async () => {
            try {
                await bgMusicAudio.play();
                updateMusicButton(true);
                localStorage.setItem("memorialMusicPlaying", "true");
            } catch (err) {
                console.log("Audio autoplay prevented or failed:", err);
                updateMusicButton(false);
            }
        };

        const pauseMusic = () => {
            bgMusicAudio.pause();
            updateMusicButton(false);
            localStorage.setItem("memorialMusicPlaying", "false");
        };

        musicToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            if (bgMusicAudio.paused) {
                playMusic();
            } else {
                pauseMusic();
            }
        });

        // Autoplay logic upon first user interaction
        if (savedMusicPref === "true") {
            const autoPlayOnInteraction = () => {
                playMusic();
                document.removeEventListener("click", autoPlayOnInteraction);
                document.removeEventListener("keydown", autoPlayOnInteraction);
            };
            document.addEventListener("click", autoPlayOnInteraction);
            document.addEventListener("keydown", autoPlayOnInteraction);
        }
    }

    renderMemoryLights();
    loadCloudflareStore();
});
