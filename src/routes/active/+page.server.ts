import { env } from "$env/dynamic/public";
import { fail } from "@sveltejs/kit";

const BACKEND_URL = env.PUBLIC_BACKEND_URL || 'http://localhost:3000';

// Define Types (Shared)
type Policy = {
    policyid: number;
    name: string;
    schedule: string;
    srcaddr: { name: string }[];
    dstaddr: { name: string }[];
    status: string;
    comments: string;
    "webfilter-profile"?: string;
    start?: string;
    end?: string;
    templateNames?: string[];
};

// Helper: Detect Template (Moved to Server)
function detectTemplate(entries: any[]): string[] {
    if (!entries || entries.length === 0) return [];
    const signatures: Record<string, string> = {
        "classroom.google.com": "Google Classroom",
        "onlearn.it.kmitl.ac.th": "On:Learn",
        "jlearn.it.kmitl.ac.th": "J:Learn",
        "ujudge.it.kmitl.ac.th": "<U>Judge",
        "ijudge.it.kmitl.ac.th": "<I>Judge",
        "ejudge.it.kmitl.ac.th": "<E>Judge",
        "dblearning.it.kmitl.ac.th": "DB:Learn",
        "kits.it.kmitl.ac.th": "KITS",
        "webdev.it.kmitl.ac.th": "WebDev",
        "nolearn.it.kmitl.ac.th": "No:Learn",
        "ctf.it.kmitl.ac.th": "SecSpace (CTF)",
        "*.chatgpt.*": "Block AI",
        "*discord*": "Block Chat",
    };

    const detected: string[] = [];
    for (const [url, name] of Object.entries(signatures)) {
        if (entries.some((e: any) => e.url === url || e.url.includes(url))) {
            detected.push(name);
        }
    }
    return detected;
}

export const load = async ({ cookies, fetch }) => {
    // 1. Get Token from Cookie (SSR cannot read localStorage)
    const token = cookies.get("authToken");

    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        // A. Fetch Policies
        const res = await fetch(`${BACKEND_URL}/firewall/policies`, { headers });
        if (!res.ok) return { policies: [] }; // Handle error gracefully or throw

        const data = await res.json();
        let rawList: Policy[] = data.results || (Array.isArray(data) ? data : []);
        
        // Filter
        rawList = rawList.filter(p => p.comments === "Created via API don't edit or delete");

        // B. Enrich Policies (Parallel Fetching)
        const enrichedPolicies = await Promise.all(rawList.map(async (policy) => {
            const updates: Partial<Policy> = {};

            // 1. Fetch Schedule
            if (policy.schedule) {
                try {
                    const schedRes = await fetch(`${BACKEND_URL}/firewall/schedule/onetime/${encodeURIComponent(policy.schedule)}`, { headers });
                    if (schedRes.ok) {
                        const schedData = await schedRes.json();
                        if (schedData.results?.[0]) {
                            updates.start = schedData.results[0].start;
                            updates.end = schedData.results[0].end;
                        }
                    }
                } catch (e) { console.error(`Schedule error: ${policy.name}`); }
            }

            // 2. Fetch WebFilter
            if (policy["webfilter-profile"]) {
                try {
                    const wfRes = await fetch(`${BACKEND_URL}/firewall/webfilter/urlfilter/${encodeURIComponent(policy["webfilter-profile"])}`, { headers });
                    if (wfRes.ok) {
                        const wfData = await wfRes.json();
                        if (wfData.results?.[0]?.entries) {
                            updates.templateNames = detectTemplate(wfData.results[0].entries);
                        }
                    }
                } catch (e) { console.error(`Webfilter error: ${policy.name}`); }
            }

            return { ...policy, ...updates };
        }));

        // Return data to the page
        return {
            policies: enrichedPolicies
        };

    } catch (err) {
        console.error("SSR Fetch Error", err);
        return { policies: [] };
    }
};

export const actions = {
    delete: async ({ request, cookies, fetch }) => {
        // 1. Get Form Data
        const formData = await request.formData();
        const policyName = formData.get('policyName');

        if (!policyName) return fail(400, { error: "Policy Name is missing" });

        // 2. Get Token from Cookie
        const token = cookies.get("authToken");
        if (!token) return fail(401, { error: "Unauthorized" });

        // 3. Call Backend
        try {
            const res = await fetch(`${BACKEND_URL}/firewall/policies/fullhouse/delete/${policyName}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                return fail(res.status, { error: "Failed to delete policy at backend" });
            }

            // Success! SvelteKit will automatically re-run the `load` function.
            return { success: true };

        } catch (err) {
            console.error("Delete Action Error:", err);
            return fail(500, { error: "Server connection failed" });
        }
    }
};