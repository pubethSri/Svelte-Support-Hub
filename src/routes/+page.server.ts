import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
    // Login/welcome page is public, no auth required
    return {};
};
