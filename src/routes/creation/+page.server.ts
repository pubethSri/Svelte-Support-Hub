import { env } from "$env/dynamic/public";
import { fail, redirect } from "@sveltejs/kit";

const BACKEND_URL = env.PUBLIC_BACKEND_URL || 'http://localhost:3000';

export const load = async ({ fetch, cookies }) => {
    const token = cookies.get("authToken");
    try {
        const res = await fetch(`${BACKEND_URL}/templates`, {
            headers: token ? {
                'Authorization': `Bearer ${token}`
            } : {}
        });
        
        // If the backend actively rejected the token due to revoked permissions
        if (res.status === 401 || res.status === 403) {
            throw redirect(302, '/forbidden');
        }
        
        const templates = await res.json();
        return { templates };
    } catch (e) {
        // Re-throw redirects!
        if (e && typeof e === 'object' && 'status' in e && 'location' in e) {
            throw e;
        }
        
        console.error("Failed to fetch templates:", e);
        return { templates: [] };
    }
};

export const actions = {
    createPolicy: async ({ cookies, request, fetch }) => {
        const token = cookies.get("authToken");
        
        if (!token) {
            return fail(401, { error: "Unauthorized" });
        }

        try {
            const formData = await request.formData();
            const policyData = formData.get('policyData') as string;

            if (!policyData) {
                return fail(400, { error: "Missing policy data" });
            }

            const payload = JSON.parse(policyData);

            // Validate required fields
            if (!payload.policies?.json?.name) {
                return fail(400, { error: "Policy name is required" });
            }

            if (!payload.policies?.json?.srcaddr || payload.policies.json.srcaddr.length === 0) {
                return fail(400, { error: "At least one source address must be selected" });
            }

            if (!payload.onetime_schedule?.["start-utc"] || !payload.onetime_schedule?.["end-utc"]) {
                return fail(400, { error: "Schedule is required" });
            }

            // Validate start time is before end time
            if (payload.onetime_schedule["start-utc"] >= payload.onetime_schedule["end-utc"]) {
                return fail(400, { error: "Start time must be before end time" });
            }

            // Make the API call to create the policy
            const response = await fetch(`${BACKEND_URL}/firewall/policy/create/fullhouse`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return fail(response.status, { 
                    error: errorData.error || `Failed to create policy: ${response.statusText}` 
                });
            }

            // Success - redirect to active policies page
            throw redirect(303, '/dashboard');

        } catch (err) {
            // Re-throw redirects
            if (err && typeof err === 'object' && 'status' in err && 'location' in err) {
                throw err;
            }

            console.error('Create Policy Error:', err);
            return fail(500, { error: 'Failed to create policy. Please try again.' });
        }
    }
};
