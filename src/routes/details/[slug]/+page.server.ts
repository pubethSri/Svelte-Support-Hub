import { env } from "$env/dynamic/public";
import { error, fail, redirect, isRedirect } from "@sveltejs/kit";

const BACKEND_URL = env.PUBLIC_BACKEND_URL || 'http://localhost:3000';

export const load = async ({ params, cookies, fetch, depends }) => {
    // Add dependency to allow explicit invalidation
    depends('policy:details');
    
    const slug = decodeURIComponent(params.slug);
    const token = cookies.get("authToken");

    if (!token) {
        throw redirect(302, '/login');
    }

    // Add timestamp to force cache busting
    const timestamp = Date.now();
    const headers = { 
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    };

    try {
        // 1. Fetch All Policies to find the correct one
        // Add timestamp query param to prevent caching
        const res = await fetch(`${BACKEND_URL}/firewall/policies?t=${timestamp}`, { 
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
        // Add timestamp to URLs
        const [scheduleRes, webfilterRes] = await Promise.all([
            // Fetch Schedule (Use policy.schedule as the reference)
            fetch(`${BACKEND_URL}/firewall/schedule/onetime/${encodeURIComponent(policy.schedule)}?t=${timestamp}`, { 
                headers,
                cache: 'no-store'
            }),
            
            // Fetch Webfilter (Use policy["webfilter-profile"] as the reference)
            fetch(`${BACKEND_URL}/firewall/webfilter/urlfilter/name/${encodeURIComponent(policy["webfilter-profile"])}?t=${timestamp}`, { 
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
            webfilter,
            timestamp // Include timestamp to make data unique
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
    
    updatePolicy: async ({ cookies, request, fetch }) => {
        const token = cookies.get("authToken");
        
        if (!token) return fail(401, { error: "Unauthorized" });

        try {
            const formData = await request.formData();
            const policyName = formData.get('policyName') as string;
            const scheduleName = formData.get('scheduleName') as string;
            const startUtc = formData.get('startUtc') as string;
            const endUtc = formData.get('endUtc') as string;
            const srcRooms = formData.get('srcRooms') as string; // JSON string array

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

            // Prepare the schedule payload
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

            // Update source addresses if provided
            if (srcRooms && policyName) {
                const roomsArray = JSON.parse(srcRooms);
                
                // Validate that at least one room is selected
                if (!Array.isArray(roomsArray) || roomsArray.length === 0) {
                    return fail(400, { error: "At least one source address must be selected" });
                }
                
                const srcaddrPayload = {
                    json: {
                        srcaddr: roomsArray.map((room: string) => ({
                            name: `[Subnet]Lab ${room} - VLAN ${room}`
                        }))
                    }
                };

                const srcAddrRes = await fetch(
                    `${BACKEND_URL}/firewall/policy/srcaddress/change/${encodeURIComponent(policyName)}`,
                    {
                        method: "PUT",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(srcaddrPayload)
                    }
                );

                if (!srcAddrRes.ok) {
                    return fail(srcAddrRes.status, { error: "Failed to update source addresses" });
                }
            }

            // Save configuration
            const saveRes = await fetch(`${BACKEND_URL}/firewall/save`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!saveRes.ok) {
                return fail(saveRes.status, { error: "Failed to save configuration" });
            }

            return { success: true, message: "Policy updated successfully" };

        } catch (err) {
            console.error('Update Policy Error:', err);
            return fail(500, { error: 'Failed to update policy' });
        }
    },

    updateUrlFilter: async ({ cookies, request, fetch }) => {
        const token = cookies.get("authToken");
        if (!token) return fail(401, { error: "Unauthorized" });

        try {
            const formData = await request.formData();
            const urlFilterId = formData.get('urlFilterId') as string;
            const entriesJson = formData.get('entries') as string;

            if (!urlFilterId || !entriesJson) {
                return fail(400, { error: "Missing urlFilterId or entries" });
            }

            const entries = JSON.parse(entriesJson);

            const res = await fetch(
                `${BACKEND_URL}/firewall/webfilter/urlfilter/change/${encodeURIComponent(urlFilterId)}`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ entries })
                }
            );

            if (!res.ok) {
                return fail(res.status, { error: "Failed to update URL filter" });
            }

            // Save FortiGate config
            await fetch(`${BACKEND_URL}/firewall/save`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });

            return { success: true, message: "URL filter updated successfully" };

        } catch (err) {
            console.error('Update URL Filter Error:', err);
            return fail(500, { error: 'Failed to update URL filter' });
        }
    }
};