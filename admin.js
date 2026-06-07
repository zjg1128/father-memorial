document.addEventListener("DOMContentLoaded", () => {
    const CONTENT_KEY = "memorialContentDraft";
    const UPLOADED_ALBUM_KEY = "memorialUploadedAlbum";
    const ADMIN_TOKEN_KEY = "memorialAdminToken";
    const ADMIN_API_BASE_KEY = "memorialAdminApiBase";
    const HIDDEN_PHOTOS_KEY = "memorialHiddenPhotos";

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

    const setRemoteStatus = (message) => {
        const status = document.querySelector("#remoteCommentStatus");
        if (status) {
            status.textContent = message;
        }
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

        let hiddenPhotos = getJson(HIDDEN_PHOTOS_KEY, []);

        const allPhotos = [
            ...defaultAlbum.map((photo) => ({ ...photo, fixed: true })),
            ...uploadedAlbum.map((photo, index) => ({ ...photo, uploadedIndex: index }))
        ];

        allPhotos.forEach((photo) => {
            const item = document.createElement("article");
            item.className = "admin-photo";
            if (hiddenPhotos.includes(photo.src)) {
                item.classList.add("hidden-photo");
            }

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

            // Add visible checkbox
            const visibleLabel = document.createElement("label");
            visibleLabel.className = "admin-photo-visible-label";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = !hiddenPhotos.includes(photo.src);

            const labelText = document.createElement("span");
            labelText.textContent = "在网页显示";

            visibleLabel.append(checkbox, labelText);
            body.append(visibleLabel);

            checkbox.addEventListener("change", () => {
                let currentHidden = getJson(HIDDEN_PHOTOS_KEY, []);
                if (checkbox.checked) {
                    currentHidden = currentHidden.filter((src) => src !== photo.src);
                    item.classList.remove("hidden-photo");
                } else {
                    if (!currentHidden.includes(photo.src)) {
                        currentHidden.push(photo.src);
                    }
                    item.classList.add("hidden-photo");
                }
                localStorage.setItem(HIDDEN_PHOTOS_KEY, JSON.stringify(currentHidden));
                setStatus("已更新照片可见性，刷新主页即可生效。");
            });

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
            uploadedAlbum,
            hiddenPhotos: getJson(HIDDEN_PHOTOS_KEY, [])
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
        const hiddenPhotos = getJson(HIDDEN_PHOTOS_KEY, []);
        const combined = [...defaultAlbum, ...uploadedAlbum].filter((photo) => !hiddenPhotos.includes(photo.src));
        downloadText(
            "album-data.js",
            `window.memorialAlbum = ${JSON.stringify(combined, null, 4)};\n`,
            "application/javascript"
        );
        setStatus("已导出包含已选照片的相册 JS (已排除隐藏照片)。");
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
                localStorage.setItem(HIDDEN_PHOTOS_KEY, JSON.stringify(backup.hiddenPhotos || []));
                loadForm();
                setStatus("已导入备份。");
            } catch {
                setStatus("导入失败，请确认文件是有效的备份 JSON。");
            }
        });
        reader.readAsText(file);
    };

    const getAdminApiBase = () => {
        const input = document.querySelector("#adminApiBase");
        return (input?.value || "").trim().replace(/\/$/, "");
    };

    const getAdminToken = () => {
        const input = document.querySelector("#adminToken");
        return (input?.value || "").trim();
    };

    const saveAdminSession = () => {
        const apiBase = getAdminApiBase();
        const token = getAdminToken();

        if (apiBase) {
            sessionStorage.setItem(ADMIN_API_BASE_KEY, apiBase);
        }

        if (token) {
            sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
        }

        setRemoteStatus(token ? "管理员密钥已保存到当前浏览器会话。" : "请先输入管理员密钥。");
    };

    const loadAdminSession = () => {
        const apiInput = document.querySelector("#adminApiBase");
        const tokenInput = document.querySelector("#adminToken");
        const savedApiBase = sessionStorage.getItem(ADMIN_API_BASE_KEY) || window.memorialApiBase || "";
        const savedToken = sessionStorage.getItem(ADMIN_TOKEN_KEY) || "";

        if (apiInput) {
            apiInput.value = savedApiBase.replace(/\/$/, "");
        }

        if (tokenInput) {
            tokenInput.value = savedToken;
        }
    };

    const adminFetch = async (path, options = {}) => {
        const apiBase = getAdminApiBase();
        const token = getAdminToken();

        if (!apiBase) {
            throw new Error("请填写 API 地址。");
        }

        if (!token) {
            throw new Error("请填写管理员密钥。");
        }

        const response = await fetch(`${apiBase}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                ...(options.headers || {})
            }
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || "请求失败。");
        }

        return data;
    };

    const formatDate = (value) => {
        if (!value) {
            return "";
        }

        return new Intl.DateTimeFormat("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date(value));
    };

    const createActionButton = (text, className, onClick) => {
        const button = document.createElement("button");
        button.className = className;
        button.type = "button";
        button.textContent = text;
        button.addEventListener("click", onClick);
        return button;
    };

    const renderRemoteComments = (comments) => {
        const manager = document.querySelector("#remoteCommentManager");
        manager.replaceChildren();

        if (!comments.length) {
            const empty = document.createElement("p");
            empty.className = "admin-status";
            empty.textContent = "暂无符合条件的访客寄语。";
            manager.append(empty);
            return;
        }

        comments.forEach((comment) => {
            const item = document.createElement("article");
            item.className = "remote-comment";
            item.classList.toggle("hidden-comment", Number(comment.approved) !== 1);

            const header = document.createElement("div");
            header.className = "remote-comment-header";

            const meta = document.createElement("div");
            meta.className = "remote-comment-meta";
            const id = document.createElement("span");
            id.textContent = `#${comment.id}`;
            const time = document.createElement("span");
            time.textContent = formatDate(comment.created_at);
            const status = document.createElement("span");
            status.className = Number(comment.approved) === 1 ? "status-pill" : "status-pill hidden";
            status.textContent = Number(comment.approved) === 1 ? "已显示" : "已隐藏";
            meta.append(id, time, status);

            header.append(meta);

            const name = createInput("署名", comment.name || "", () => {});
            const nameInput = name.querySelector("input");
            nameInput.maxLength = 18;

            const messageLabel = document.createElement("label");
            const messageSpan = document.createElement("span");
            messageSpan.textContent = "寄语内容";
            const message = document.createElement("textarea");
            message.rows = 3;
            message.maxLength = 180;
            message.value = comment.message || "";
            messageLabel.append(messageSpan, message);

            const actions = document.createElement("div");
            actions.className = "remote-comment-actions";
            actions.append(
                createActionButton("保存修改", "button secondary", async () => {
                    await updateRemoteComment(comment.id, {
                        name: nameInput.value.trim(),
                        message: message.value.trim()
                    });
                }),
                createActionButton(Number(comment.approved) === 1 ? "隐藏" : "恢复显示", "button secondary", async () => {
                    await updateRemoteComment(comment.id, {
                        approved: Number(comment.approved) === 1 ? 0 : 1
                    });
                }),
                createActionButton("删除", "button danger", async () => {
                    if (window.confirm("确定删除这条寄语吗？删除后无法恢复。")) {
                        await deleteRemoteComment(comment.id);
                    }
                })
            );

            item.append(header, name, messageLabel, actions);
            manager.append(item);
        });
    };

    const loadRemoteComments = async () => {
        const status = document.querySelector("#commentStatus").value;
        setRemoteStatus("正在读取访客寄语……");

        try {
            const data = await adminFetch(`/admin/comments?status=${encodeURIComponent(status)}&limit=100`);
            renderRemoteComments(Array.isArray(data.comments) ? data.comments : []);
            setRemoteStatus(`已读取 ${data.comments?.length || 0} 条访客寄语。`);
        } catch (error) {
            setRemoteStatus(error.message || "读取失败。");
        }
    };

    const updateRemoteComment = async (id, patch) => {
        setRemoteStatus("正在保存寄语修改……");

        try {
            await adminFetch(`/admin/comments/${id}`, {
                method: "PATCH",
                body: JSON.stringify(patch)
            });
            setRemoteStatus("寄语已更新。");
            await loadRemoteComments();
        } catch (error) {
            setRemoteStatus(error.message || "保存失败。");
        }
    };

    const deleteRemoteComment = async (id) => {
        setRemoteStatus("正在删除寄语……");

        try {
            await adminFetch(`/admin/comments/${id}`, { method: "DELETE" });
            setRemoteStatus("寄语已删除。");
            await loadRemoteComments();
        } catch (error) {
            setRemoteStatus(error.message || "删除失败。");
        }
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
    document.querySelector("#saveAdminToken").addEventListener("click", saveAdminSession);
    document.querySelector("#loadRemoteComments").addEventListener("click", loadRemoteComments);
    document.querySelector("#commentStatus").addEventListener("change", loadRemoteComments);
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
        localStorage.removeItem(HIDDEN_PHOTOS_KEY);
        content = getContent();
        uploadedAlbum = [];
        loadForm();
        setStatus("已清除本机管理修改。");
    });

    loadAdminSession();
    loadForm();
});
