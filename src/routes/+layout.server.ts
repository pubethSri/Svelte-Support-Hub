import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ cookies, url }) => {
    const token = cookies.get("authToken");
    const locale = cookies.get("locale") || 'th';
    // console.log(`[Layout] path=${url.pathname}, hasToken=${!!token}`);
    
    // Public routes that don't require authentication
    const publicRoutes = ['/', '/forbidden'];
    const isPublicRoute = publicRoutes.some(route => url.pathname === route);
    
    // If no token and trying to access protected route, redirect to landing page
    if (!token && !isPublicRoute) {
        throw redirect(302, '/');
    }
    
    // If token exists, decode and validate expiration
    if (token) {
        try {
            // Decode JWT to get user info (base64url → base64 → UTF-8)
            let payloadBase64 = token.split('.')[1];
            // JWT uses base64url: replace URL-safe chars and add padding
            payloadBase64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
            while (payloadBase64.length % 4) payloadBase64 += '=';
            const binaryString = atob(payloadBase64);
            const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
            const payloadJson = new TextDecoder().decode(bytes);
            const payload = JSON.parse(payloadJson);
            
            // Check if token is expired
            const now = Math.floor(Date.now() / 1000); // Current time in seconds
            if (payload.exp && payload.exp < now) {
                // Token is expired - clear it
                cookies.delete('authToken', { path: '/' });
                if (!isPublicRoute) {
                    throw redirect(302, '/');
                }
                return { user: null, locale };
            }
            
            // Check if user is actually authorized to use the app
            if (!payload.isAllowed && !isPublicRoute) {
                // Do not delete token, just restrict access to this page
                throw redirect(302, '/forbidden');
            }

            return {
                user: {
                    name: payload.name || '',
                    email: payload.email || '',
                    role: payload.role || '',
                    dbRole: payload.dbRole || null,
                    isAllowed: payload.isAllowed || false
                },
                locale
            };
        } catch (err) {
            // Check if the error is a SvelteKit redirect
            if (err && typeof err === 'object' && 'status' in err && 'location' in err) {
                throw err;
            }
            
            // Invalid token - clear it and redirect
            cookies.delete('authToken', { path: '/' });
            if (!isPublicRoute) {
                throw redirect(302, '/');
            }
        }
    }
    
    return {
        user: null,
        locale
    };
};
