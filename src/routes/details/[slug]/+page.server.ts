import { env } from "$env/dynamic/public";
import { error, fail, redirect, isRedirect } from "@sveltejs/kit";

const BACKEND_URL = env.PUBLIC_BACKEND_URL || 'http://localhost:3000';

export const load = async ({ params, cookies, fetch }) => {
    const slug = decodeURIComponent(params.slug);
    const token = cookies.get("authToken");

    if (!token) {
        throw redirect(302, '/login');
    }

    const headers = { 
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
    };

    try {
        // 1. Fetch All Policies to find the correct one
        // (API doesn't seem to support fetching single policy by name directly, so we filter)
        const res = await fetch(`${BACKEND_URL}/firewall/policies`, { 
            headers,
            cache: 'no-store'
        });
        if (!res.ok) throw error(res.status, "Failed to fetch policies");
        
        const data = await res.json();
        const allPolicies = data.results || [];
        
        // 2. Find the specific policy
        const policy = allPolicies.find((p: any) => p.name === slug);
        
        if (!policy) {
            throw error(404, "Policy not found");
        }

        // 3. Parallel Fetch for Schedule and Webfilter
        // We use the fields from the policy object to be precise
        const [scheduleRes, webfilterRes] = await Promise.all([
            // Fetch Schedule (Use policy.schedule as the reference)
            fetch(`${BACKEND_URL}/firewall/schedule/onetime/${encodeURIComponent(policy.schedule)}`, { 
                headers,
                cache: 'no-store'
            }),
            
            // Fetch Webfilter (Use policy["webfilter-profile"] as the reference)
            fetch(`${BACKEND_URL}/firewall/webfilter/urlfilter/name/${encodeURIComponent(policy["webfilter-profile"])}`, { 
                headers,
                cache: 'no-store'
            })
        ]);

        let schedule = null;
        let webfilter = null;

        if (scheduleRes.ok) {
            const sData = await scheduleRes.json();
            schedule = sData.results?.[0] || null;
        }

        if (webfilterRes.ok) {
            const wData = await webfilterRes.json();
            webfilter = wData.results?.[0] || null;
        }

        return {
            slug,
            policy,
            schedule,
            webfilter
        };

    } catch (err) {
        console.error("Load Error:", err);
        throw error(500, "Server error while loading details");
    }
};

export const actions = {
    delete: async ({ cookies, params, fetch }) => {
        const slug = decodeURIComponent(params.slug);
        const token = cookies.get("authToken");
        
        if (!token) return fail(401, { error: "Unauthorized" });

        try {
            const res = await fetch(`${BACKEND_URL}/firewall/policies/fullhouse/delete/${encodeURIComponent(slug)}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                return fail(res.status, { error: "Failed to delete policy" });
            }

            // Redirect to list page after successful delete
            throw redirect(303, '/active');

        } catch (err) {
            // Rethrow redirects (required by SvelteKit)
            if (isRedirect(err)) throw err;

            console.error('Delete Error:', err);
            return fail(500, { error: 'Connection error' });
        }
    },
    
    updateSchedule: async ({ cookies, request, fetch }) => {
        const token = cookies.get("authToken");
        
        if (!token) return fail(401, { error: "Unauthorized" });

        try {
            const formData = await request.formData();
            const scheduleName = formData.get('scheduleName') as string;
            const startUtc = formData.get('startUtc') as string;
            const endUtc = formData.get('endUtc') as string;

            // Validate inputs
            if (!scheduleName || !startUtc || !endUtc) {
                return fail(400, { error: "Missing required fields" });
            }

            const startTimestamp = parseFloat(startUtc);
            const endTimestamp = parseFloat(endUtc);

            // Validate that start time is before end time
            if (startTimestamp >= endTimestamp) {
                return fail(400, { error: "Start time must be before end time" });
            }

            // Prepare the payload
            const schedulePayload = {
                name: scheduleName,
                "start-utc": startTimestamp,
                "end-utc": endTimestamp,
                "expiration-days": 0
            };

            // Update schedule
            const updateRes = await fetch(
                `${BACKEND_URL}/firewall/schedule/onetime/change/${encodeURIComponent(scheduleName)}`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(schedulePayload)
                }
            );

            if (!updateRes.ok) {
                return fail(updateRes.status, { error: "Failed to update schedule" });
            }

            // Save configuration
            const saveRes = await fetch(`${BACKEND_URL}/firewall/save`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!saveRes.ok) {
                return fail(saveRes.status, { error: "Failed to save configuration" });
            }

            return { success: true, message: "Schedule updated successfully" };

        } catch (err) {
            console.error('Update Schedule Error:', err);
            return fail(500, { error: 'Failed to update schedule' });
        }
    }
};