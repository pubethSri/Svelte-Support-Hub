import { env } from "$env/dynamic/public";
import type { RequestHandler } from "./$types";

const BACKEND_URL = env.PUBLIC_BACKEND_URL || "http://localhost:3000";

// DELETE: Remove an allowed user by ID
export const DELETE: RequestHandler = async ({ cookies, params, fetch }) => {
    const token = cookies.get("authToken");

    if (!token) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        const res = await fetch(`${BACKEND_URL}/users/allowed/${params.id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
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
