const ALLOWED_ORIGINS = new Set([
    "https://www.mingfu.ccwu.cc",
    "https://mingfu.ccwu.cc",
    "https://zjg1128.github.io"
]);

const LOCAL_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const JSON_HEADERS = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
};

export default {
    async fetch(request, env) {
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: corsHeaders(request) });
        }

        try {
            return await handleRequest(request, env);
        } catch (error) {
            return json(request, { error: "服务暂时不可用，请稍后再试。" }, 500);
        }
    }
};

async function handleRequest(request, env) {
    if (!env.DB) {
        return json(request, { error: "D1 数据库尚未绑定。" }, 500);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";

    if (request.method === "GET" && path === "/") {
        return json(request, {
            name: "father-memorial-api",
            status: "ok",
            endpoints: ["/stats", "/candles", "/comments", "/admin/comments"]
        });
    }

    if (path.startsWith("/admin/")) {
        const authError = await requireAdmin(request, env);
        if (authError) {
            return authError;
        }

        if (request.method === "GET" && path === "/admin/comments") {
            return listAdminComments(request, env);
        }

        const match = path.match(/^\/admin\/comments\/(\d+)$/);
        if (match && request.method === "PATCH") {
            return updateAdminComment(request, env, Number(match[1]));
        }

        if (match && request.method === "DELETE") {
            return deleteAdminComment(request, env, Number(match[1]));
        }

        return json(request, { error: "管理接口不存在。" }, 404);
    }

    if (request.method === "GET" && path === "/stats") {
        return getStats(request, env);
    }

    if (request.method === "POST" && path === "/candles") {
        return createCandle(request, env);
    }

    if (request.method === "GET" && path === "/comments") {
        return listComments(request, env);
    }

    if (request.method === "POST" && path === "/comments") {
        return createComment(request, env);
    }

    return json(request, { error: "接口不存在。" }, 404);
}

async function getStats(request, env) {
    const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM candles").first();
    return json(request, { candles: Number(row?.count || 0) });
}

async function createCandle(request, env) {
    const ipHash = await getIpHash(request, env);
    const recent = await env.DB.prepare(
        "SELECT COUNT(*) AS count FROM candles WHERE ip_hash = ? AND created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 seconds')"
    ).bind(ipHash).first();

    if (Number(recent?.count || 0) > 0) {
        return json(request, { error: "刚刚已经点亮过，请稍后再试。" }, 429);
    }

    await env.DB.prepare("INSERT INTO candles (ip_hash) VALUES (?)").bind(ipHash).run();
    const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM candles").first();
    return json(request, { candles: Number(row?.count || 0) }, 201);
}

async function listComments(request, env) {
    const limit = clamp(Number(new URL(request.url).searchParams.get("limit") || 30), 1, 100);
    const result = await env.DB.prepare(
        "SELECT id, name, message, created_at FROM comments WHERE approved = 1 ORDER BY created_at DESC LIMIT ?"
    ).bind(limit).all();

    return json(request, { comments: result.results || [] });
}

async function createComment(request, env) {
    const body = await readJson(request);
    const name = normalizeText(body.name).slice(0, 18);
    const message = normalizeText(body.message).slice(0, 180);

    if (!name || !message) {
        return json(request, { error: "请填写署名和寄语。" }, 400);
    }

    const ipHash = await getIpHash(request, env);
    const recent = await env.DB.prepare(
        "SELECT COUNT(*) AS count FROM comments WHERE ip_hash = ? AND created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-60 seconds')"
    ).bind(ipHash).first();

    if (Number(recent?.count || 0) > 0) {
        return json(request, { error: "提交太频繁，请稍后再试。" }, 429);
    }

    const write = await env.DB.prepare(
        "INSERT INTO comments (name, message, ip_hash) VALUES (?, ?, ?)"
    ).bind(name, message, ipHash).run();
    const result = await env.DB.prepare(
        "SELECT id, name, message, created_at FROM comments WHERE id = ?"
    ).bind(write.meta.last_row_id).first();

    return json(request, { comment: result }, 201);
}

async function listAdminComments(request, env) {
    const url = new URL(request.url);
    const limit = clamp(Number(url.searchParams.get("limit") || 100), 1, 200);
    const status = url.searchParams.get("status") || "all";
    let where = "";

    if (status === "approved") {
        where = "WHERE approved = 1";
    } else if (status === "hidden") {
        where = "WHERE approved = 0";
    }

    const result = await env.DB.prepare(
        `SELECT id, name, message, created_at, approved FROM comments ${where} ORDER BY created_at DESC LIMIT ?`
    ).bind(limit).all();

    return json(request, { comments: result.results || [] });
}

async function updateAdminComment(request, env, id) {
    const body = await readJson(request);
    const updates = [];
    const values = [];

    if (Object.prototype.hasOwnProperty.call(body, "name")) {
        const name = normalizeText(body.name).slice(0, 18);
        if (!name) {
            return json(request, { error: "署名不能为空。" }, 400);
        }
        updates.push("name = ?");
        values.push(name);
    }

    if (Object.prototype.hasOwnProperty.call(body, "message")) {
        const message = normalizeText(body.message).slice(0, 180);
        if (!message) {
            return json(request, { error: "寄语不能为空。" }, 400);
        }
        updates.push("message = ?");
        values.push(message);
    }

    if (Object.prototype.hasOwnProperty.call(body, "approved")) {
        updates.push("approved = ?");
        values.push(Number(body.approved) === 1 ? 1 : 0);
    }

    if (!updates.length) {
        return json(request, { error: "没有可保存的修改。" }, 400);
    }

    values.push(id);
    await env.DB.prepare(`UPDATE comments SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
    const comment = await env.DB.prepare(
        "SELECT id, name, message, created_at, approved FROM comments WHERE id = ?"
    ).bind(id).first();

    if (!comment) {
        return json(request, { error: "寄语不存在。" }, 404);
    }

    return json(request, { comment });
}

async function deleteAdminComment(request, env, id) {
    const result = await env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(id).run();

    if (!result.meta?.changes) {
        return json(request, { error: "寄语不存在。" }, 404);
    }

    return json(request, { ok: true });
}

async function readJson(request) {
    try {
        return await request.json();
    } catch {
        return {};
    }
}

function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}

function clamp(value, min, max) {
    if (!Number.isFinite(value)) {
        return min;
    }

    return Math.min(max, Math.max(min, value));
}

async function getIpHash(request, env) {
    const ip = request.headers.get("CF-Connecting-IP")
        || request.headers.get("X-Forwarded-For")
        || "unknown";
    const salt = env.RATE_LIMIT_SALT || "father-memorial-local-dev";
    const data = new TextEncoder().encode(`${salt}:${ip}`);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function requireAdmin(request, env) {
    if (!env.ADMIN_TOKEN) {
        return json(request, { error: "管理员密钥尚未配置。" }, 500);
    }

    const auth = request.headers.get("Authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : request.headers.get("X-Admin-Token") || "";
    const ok = await secureCompare(token, env.ADMIN_TOKEN);

    if (!ok) {
        return json(request, { error: "管理员密钥不正确。" }, 401);
    }

    return null;
}

async function secureCompare(value, expected) {
    const encoder = new TextEncoder();
    const [valueHash, expectedHash] = await Promise.all([
        crypto.subtle.digest("SHA-256", encoder.encode(value)),
        crypto.subtle.digest("SHA-256", encoder.encode(expected))
    ]);
    const valueBytes = new Uint8Array(valueHash);
    const expectedBytes = new Uint8Array(expectedHash);
    let diff = valueBytes.length ^ expectedBytes.length;

    for (let index = 0; index < valueBytes.length; index += 1) {
        diff |= valueBytes[index] ^ expectedBytes[index];
    }

    return diff === 0;
}

function json(request, data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            ...JSON_HEADERS,
            ...corsHeaders(request)
        }
    });
}

function corsHeaders(request) {
    const origin = request.headers.get("Origin") || "";
    const allowOrigin = getAllowedOrigin(origin);

    return {
        "access-control-allow-origin": allowOrigin,
        "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "access-control-allow-headers": "Content-Type, Authorization, X-Admin-Token",
        "access-control-max-age": "86400",
        "vary": "Origin"
    };
}

function getAllowedOrigin(origin) {
    if (ALLOWED_ORIGINS.has(origin) || LOCAL_ORIGIN_PATTERN.test(origin) || origin === "null") {
        return origin;
    }

    return "https://www.mingfu.ccwu.cc";
}
