import { redirect } from "@sveltejs/kit";
import { env } from "$env/dynamic/public";
import type { PageServerLoad } from "./$types";

const BACKEND_URL = env.PUBLIC_BACKEND_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
    const token = cookies.get("authToken");

    if (!token) {
        throw redirect(302, '/');
    }

    // Live check via /auth/me to get current dbRole from DB (not stale JWT)
    try {
        const meRes = await fetch(`${BACKEND_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!meRes.ok) {
            throw redirect(302, '/forbidden');
        }

        const meData = await meRes.json();
        const dbRole = (meData.user?.dbRole || '').toLowerCase();
        const currentUsername = String(meData.user?.name || '');
        if (!dbRole.includes('admin')) {
            throw redirect(302, '/forbidden');
        }
    } catch (err) {
        if (err && typeof err === 'object' && 'status' in err && 'location' in err) {
            throw err;
        }
        throw redirect(302, '/forbidden');
    }

    // Decode JWT to get the current user's login username
    let currentLoginUsername = '';
    try {
        let payloadBase64 = token.split('.')[1];
        payloadBase64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        while (payloadBase64.length % 4) payloadBase64 += '=';
        const binaryString = atob(payloadBase64);
        const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
        const payloadJson = new TextDecoder().decode(bytes);
        const payload = JSON.parse(payloadJson);
        currentLoginUsername = payload.id || '';
    } catch {}

    // Fetch admin dashboard data from backend
    try {
        const res = await fetch(`${BACKEND_URL}/admin/dashboard-data`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 401 || res.status === 403) {
            throw redirect(302, '/forbidden');
        }

        const data = await res.json();
        return {
            allowedUsers: data.allowedUsers || [],
            stats: data.stats || { totalUsers: 0, adminUsers: 0 },
            currentUsername: currentLoginUsername
        };
    } catch (e) {
        if (e && typeof e === 'object' && 'status' in e && 'location' in e) {
            throw e;
        }
        console.error("Failed to fetch admin data:", e);
        return { allowedUsers: [], stats: { totalUsers: 0, adminUsers: 0 } };
    }
};
