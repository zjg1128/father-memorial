document.addEventListener("DOMContentLoaded", () => {
    const CONTENT_KEY = "memorialContentDraft";
    const UPLOADED_ALBUM_KEY = "memorialUploadedAlbum";

    const defaultContent = window.memorialContent || {};
    const defaultAlbum = Array.isArray(window.memorialAlbum) ? window.memorialAlbum : [];
    const simpleFields = [
        "navTitle",
        "heroName",
        "heroEyebrow",
        "heroDates",
        "heroQuote",
        "lifeTitle",
        "portraitCaption",
        "timelineTitle",
        "galleryTitle",
        "tributesTitle",
        "footerTitle",
        "footerSmall"
    ];

    const getJson = (key, fallback) => {
        try {
            return JSON.parse(localStorage.getItem(key) || "null") || fallback;
        } catch {
            return fallback;
        }
    };

    const setStatus = (message) => {
        document.querySelector("#adminStatus").textContent = message;
    };

    const getContent = () => {
        const draft = getJson(CONTENT_KEY, {});
        return {
            ...defaultContent,
            ...draft,
            lifeParagraphs: draft.lifeParagraphs || defaultContent.lifeParagraphs || [],
            timeline: draft.timeline || defaultContent.timeline || [],
            defaultTributes: draft.defaultTributes || defaultContent.defaultTributes || []
        };
    };

    const getUploadedAlbum = () => getJson(UPLOADED_ALBUM_KEY, []);

    let content = getContent();
    let uploadedAlbum = getUploadedAlbum();

    const createRemoveButton = (onClick) => {
        const button = document.createElement("button");
        button.className = "small-danger";
        button.type = "button";
        button.textContent = "删除";
        button.addEventListener("click", onClick);
        return button;
    };

    const renderLifeParagraphs = () => {
        const editor = document.querySelector("#lifeParagraphEditor");
        editor.replaceChildren();

        content.lifeParagraphs.forEach((text, index) => {
            const item = document.createElement("div");
            item.className = "editor-item";

            const header = document.createElement("div");
            header.className = "editor-item-header";
            header.append(`第 ${index + 1} 段`, createRemoveButton(() => {
                content.lifeParagraphs.splice(index, 1);
                renderLifeParagraphs();
            }));

            const textarea = document.createElement("textarea");
            textarea.rows = 4;
            textarea.value = text;
            textarea.addEventListener("input", () => {
                content.lifeParagraphs[index] = textarea.value;
            });

            item.append(header, textarea);
            editor.append(item);
        });
    };

    const renderTimeline = () => {
        const editor = document.querySelector("#timelineEditor");
        editor.replaceChildren();

        content.timeline.forEach((entry, index) => {
            const item = document.createElement("div");
            item.className = "editor-item";

            const header = document.createElement("div");
            header.className = "editor-item-header";
            header.append(`足迹 ${index + 1}`, createRemoveButton(() => {
                content.timeline.splice(index, 1);
                renderTimeline();
            }));

            const grid = document.createElement("div");
            grid.className = "admin-grid two";

            const time = createInput("时间", entry.time || "", (value) => {
                content.timeline[index].time = value;
            });
            const title = createInput("标题", entry.title || "", (value) => {
                content.timeline[index].title = value;
            });

            const textLabel = document.createElement("label");
            const textSpan = document.createElement("span");
            textSpan.textContent = "说明";
            const text = document.createElement("textarea");
            text.rows = 3;
            text.value = entry.text || "";
            text.addEventListener("input", () => {
                content.timeline[index].text = text.value;
            });
            textLabel.append(textSpan, text);

            grid.append(time, title);
            item.append(header, grid, textLabel);
            editor.append(item);
        });
    };

    const renderTributes = () => {
        const editor = document.querySelector("#tributeEditor");
        editor.replaceChildren();

        content.defaultTributes.forEach((entry, index) => {
            const item = document.createElement("div");
            item.className = "editor-item";

            const header = document.createElement("div");
            header.className = "editor-item-header";
            header.append(`寄语 ${index + 1}`, createRemoveButton(() => {
                content.defaultTributes.splice(index, 1);
                renderTributes();
            }));

            const name = createInput("署名", entry.name || "", (value) => {
                content.defaultTributes[index].name = value;
            });

            const messageLabel = document.createElement("label");
            const messageSpan = document.createElement("span");
            messageSpan.textContent = "寄语内容";
            const message = document.createElement("textarea");
            message.rows = 3;
            message.value = entry.message || "";
            message.addEventListener("input", () => {
                content.defaultTributes[index].message = message.value;
            });
            messageLabel.append(messageSpan, message);

            item.append(header, name, messageLabel);
            editor.append(item);
        });
    };

    const createInput = (labelText, value, onInput) => {
        const label = document.createElement("label");
        const span = document.createElement("span");
        span.textContent = labelText;
        const input = document.createElement("input");
        input.type = "text";
        input.value = value;
        input.addEventListener("input", () => onInput(input.value));
        label.append(span, input);
        return label;
    };

    const renderAlbumManager = () => {
        const manager = document.querySelector("#albumManager");
        manager.replaceChildren();

        const allPhotos = [
            ...defaultAlbum.map((photo) => ({ ...photo, fixed: true })),
            ...uploadedAlbum.map((photo, index) => ({ ...photo, uploadedIndex: index }))
        ];

        allPhotos.forEach((photo) => {
            const item = document.createElement("article");
            item.className = "admin-photo";

            const image = document.createElement("img");
            image.src = photo.src;
            image.alt = photo.title || "照片";

            const body = document.createElement("div");
            body.className = "admin-photo-body";
            const title = document.createElement("strong");
            title.textContent = photo.title || "未命名照片";
            const meta = document.createElement("span");
            meta.textContent = `${photo.year || "待补"} · ${photo.category || "未分类"}`;
            const source = document.createElement("span");
            source.textContent = photo.fixed ? "固定照片" : "管理员上传";

            body.append(title, meta, source);

            if (!photo.fixed) {
                body.append(createRemoveButton(() => {
                    uploadedAlbum.splice(photo.uploadedIndex, 1);
                    localStorage.setItem(UPLOADED_ALBUM_KEY, JSON.stringify(uploadedAlbum));
                    renderAlbumManager();
                    setStatus("已删除上传照片。");
                }));
            }

            item.append(image, body);
            manager.append(item);
        });
    };

    const loadForm = () => {
        simpleFields.forEach((key) => {
            const input = document.querySelector(`#${key}`);
            if (input) {
                input.value = content[key] || "";
                input.addEventListener("input", () => {
                    content[key] = input.value;
                });
            }
        });

        renderLifeParagraphs();
        renderTimeline();
        renderTributes();
        renderAlbumManager();
    };

    const saveContent = () => {
        localStorage.setItem(CONTENT_KEY, JSON.stringify(content));
        setStatus("已保存。打开或刷新 index.html 可以看到修改。");
    };

    const fileToDataUrl = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(reader.result));
        reader.addEventListener("error", reject);
        reader.readAsDataURL(file);
    });

    const uploadPhotos = async () => {
        const files = Array.from(document.querySelector("#photoFiles").files || []);

        if (!files.length) {
            setStatus("请先选择照片。");
            return;
        }

        const category = document.querySelector("#photoCategory").value.trim() || "生活";
        const year = document.querySelector("#photoYear").value.trim() || "待补";
        const titlePrefix = document.querySelector("#photoTitle").value.trim() || "新增照片";
        const caption = document.querySelector("#photoCaption").value.trim();

        try {
            const nextPhotos = [];

            for (const [index, file] of files.entries()) {
                const src = await fileToDataUrl(file);
                nextPhotos.push({
                    src,
                    title: files.length > 1 ? `${titlePrefix} ${index + 1}` : titlePrefix,
                    year,
                    category,
                    caption: caption || file.name
                });
            }

            const nextAlbum = [...uploadedAlbum, ...nextPhotos];
            localStorage.setItem(UPLOADED_ALBUM_KEY, JSON.stringify(nextAlbum));
            uploadedAlbum = nextAlbum;
            renderAlbumManager();
            document.querySelector("#photoFiles").value = "";
            setStatus(`已上传 ${nextPhotos.length} 张照片到本机相册。`);
        } catch (error) {
            setStatus("上传失败，可能是照片太大或浏览器存储空间不足。");
        }
    };

    const downloadText = (filename, text, type = "application/json") => {
        const blob = new Blob([text], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportBackup = () => {
        const backup = {
            exportedAt: new Date().toISOString(),
            content,
            uploadedAlbum
        };
        downloadText("memorial-admin-backup.json", JSON.stringify(backup, null, 2));
        setStatus("已导出备份 JSON。");
    };

    const exportContentJs = () => {
        downloadText(
            "site-data.js",
            `window.memorialContent = ${JSON.stringify(content, null, 4)};\n`,
            "application/javascript"
        );
        setStatus("已导出文字 JS。");
    };

    const exportAlbumJs = () => {
        const combined = [...defaultAlbum, ...uploadedAlbum];
        downloadText(
            "album-data.js",
            `window.memorialAlbum = ${JSON.stringify(combined, null, 4)};\n`,
            "application/javascript"
        );
        setStatus("已导出包含上传照片的相册 JS。");
    };

    const importBackup = (file) => {
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.addEventListener("load", () => {
            try {
                const backup = JSON.parse(reader.result);
                content = backup.content || defaultContent;
                uploadedAlbum = backup.uploadedAlbum || [];
                localStorage.setItem(CONTENT_KEY, JSON.stringify(content));
                localStorage.setItem(UPLOADED_ALBUM_KEY, JSON.stringify(uploadedAlbum));
                loadForm();
                setStatus("已导入备份。");
            } catch {
                setStatus("导入失败，请确认文件是有效的备份 JSON。");
            }
        });
        reader.readAsText(file);
    };

    document.querySelector("#saveAll").addEventListener("click", saveContent);
    document.querySelector("#addLifeParagraph").addEventListener("click", () => {
        content.lifeParagraphs.push("新的生平段落。");
        renderLifeParagraphs();
    });
    document.querySelector("#addTimelineItem").addEventListener("click", () => {
        content.timeline.push({ time: "待补", title: "新的足迹", text: "补充这里的说明。" });
        renderTimeline();
    });
    document.querySelector("#addTributeItem").addEventListener("click", () => {
        content.defaultTributes.push({ name: "亲友", message: "写下一句寄语。" });
        renderTributes();
    });
    document.querySelector("#uploadPhotos").addEventListener("click", uploadPhotos);
    document.querySelector("#exportBackup").addEventListener("click", exportBackup);
    document.querySelector("#exportContentJs").addEventListener("click", exportContentJs);
    document.querySelector("#exportAlbumJs").addEventListener("click", exportAlbumJs);
    document.querySelector("#importBackup").addEventListener("change", (event) => {
        importBackup(event.target.files[0]);
        event.target.value = "";
    });
    document.querySelector("#resetDrafts").addEventListener("click", () => {
        localStorage.removeItem(CONTENT_KEY);
        localStorage.removeItem(UPLOADED_ALBUM_KEY);
        content = getContent();
        uploadedAlbum = [];
        loadForm();
        setStatus("已清除本机管理修改。");
    });

    loadForm();
});
