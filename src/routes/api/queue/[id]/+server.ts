import { env } from "$env/dynamic/public";

const BACKEND_URL = env.PUBLIC_BACKEND_URL || 'http://localhost:3000';

export async function GET({ params, cookies }) {
    const token = cookies.get("authToken");
    try {
        const response = await fetch(`${BACKEND_URL}/firewall/queue/${params.id}`, {
            headers: token ? {
                'Authorization': `Bearer ${token}`
            } : {}
        });
        const data = await response.json();
        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch(err) {
        return new Response(JSON.stringify({ error: "Failed to reach queue service" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
