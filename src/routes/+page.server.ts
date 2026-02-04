import { fail } from "@sveltejs/kit";
import { env } from "$env/dynamic/public";
import type { PageServerLoad, Actions } from "./$types";

const BACKEND_URL = env.PUBLIC_BACKEND_URL || 'http://localhost:3000';

export const load: PageServerLoad = async () => {
    // Login/welcome page is public, no auth required
    return {};
};

export const actions: Actions = {
    login: async ({ request, cookies }) => {
        const formData = await request.formData();
        const username = formData.get('username') as string;
        const password = formData.get('password') as string;

        if (!username || !password) {
            return fail(400, { error: 'Username and password are required' });
        }

        try {
            const response = await fetch(`${BACKEND_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Set HttpOnly cookie - cannot be accessed by JavaScript
                cookies.set('authToken', data.accessToken, {
                    path: '/',
                    httpOnly: true,
                    secure: false, // Set to true in production with HTTPS
                    sameSite: 'strict',
                    maxAge: 60 * 60 * 24 // 24 hours
                });

                // Return user info to client (not the token!)
                return {
                    success: true,
                    user: data.user
                };
            } else {
                return fail(401, { error: data.message || 'Login failed' });
            }
        } catch (error) {
            console.error('Login error:', error);
            return fail(500, { error: 'Cannot connect to server' });
        }
    }
};
