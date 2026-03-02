import { env } from "$env/dynamic/public";
import type { RequestHandler } from "./$types";

const BACKEND_URL = env.PUBLIC_BACKEND_URL || "http://localhost:3000";

// POST: Add a new allowed user
export const POST: RequestHandler = async ({ cookies, request }) => {
    const token = cookies.get("authToken");

    if (!token) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        const body = await request.json();
        const res = await fetch(`${BACKEND_URL}/users/allowed`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return new Response(JSON.stringify(data), {
            status: res.status,
            headers: { "Content-Type": "application/json" },
        });
    } catch {
        return new Response(
            JSON.stringify({ error: "Backend unreachable" }),
            { status: 502 }
        );
    }
};
