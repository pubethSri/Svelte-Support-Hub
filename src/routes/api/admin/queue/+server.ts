import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/public';

/**
 * Proxy GET requests to the Elysia backend to retrieve the live Job Queue.
 */
export const GET: RequestHandler = async ({ cookies }) => {
    const token = cookies.get('authToken');

    if (!token) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const backendUrl = env.PUBLIC_BACKEND_URL || 'http://localhost:3000';
        const response = await fetch(`${backendUrl}/admin/queue`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        return json(data, { status: response.status });
    } catch (error) {
        console.error('Error fetching admin queue:', error);
        return json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
};
