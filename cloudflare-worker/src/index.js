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
            endpoints: ["/stats", "/candles", "/comments"]
        });
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
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "Content-Type",
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
