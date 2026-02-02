import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ cookies, url }) => {
    const token = cookies.get("authToken");
    
    // Public routes that don't require authentication
    const publicRoutes = ['/'];
    const isPublicRoute = publicRoutes.some(route => url.pathname === route);
    
    // If no token and trying to access protected route, redirect to landing page
    if (!token && !isPublicRoute) {
        throw redirect(302, '/');
    }
    
    // If token exists, decode and return user info
    if (token) {
        try {
            // Decode JWT to get user info
            const payloadBase64 = token.split('.')[1];
            const payloadJson = atob(payloadBase64);
            const payload = JSON.parse(payloadJson);
            
            return {
                user: {
                    name: payload.name || '',
                    email: payload.email || '',
                    role: payload.role || ''
                }
            };
        } catch (err) {
            // Invalid token - clear it and redirect to login
            cookies.delete('authToken', { path: '/' });
            if (!isPublicRoute) {
                throw redirect(302, '/login');
            }
        }
    }
    
    return {
        user: null
    };
};
