import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ cookies }) => {
    // Delete the auth cookie
    cookies.delete('authToken', { path: '/' });
    
    // Redirect to landing page
    throw redirect(302, '/');
};
