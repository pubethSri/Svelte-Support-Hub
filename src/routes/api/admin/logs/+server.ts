import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/public';

const BACKEND_URL = env.PUBLIC_BACKEND_URL || 'http://localhost:3000';

export const GET: RequestHandler = async ({ cookies, fetch }) => {
    const token = cookies.get('authToken');

    if (!token) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const res = await fetch(`${BACKEND_URL}/audit/logs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();
        return json(data, { status: res.status });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
};
