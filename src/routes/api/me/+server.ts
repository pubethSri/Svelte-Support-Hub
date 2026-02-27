import { env } from "$env/dynamic/public";
import type { RequestHandler } from "./$types";

const BACKEND_URL = env.PUBLIC_BACKEND_URL || "http://localhost:3000";

export const GET: RequestHandler = async ({ cookies }) => {
    const token = cookies.get("authToken");

    if (!token) {
        return new Response(JSON.stringify({ success: false }), { status: 401 });
    }

    try {
        const res = await fetch(`${BACKEND_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        return new Response(JSON.stringify(data), {
            status: res.status,
            headers: { "Content-Type": "application/json" },
        });
    } catch {
        return new Response(
            JSON.stringify({ success: false, message: "Backend unreachable" }),
            { status: 502 }
        );
    }
};
