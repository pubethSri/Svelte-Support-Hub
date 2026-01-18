<script lang="ts">
    import { onMount } from "svelte";
    import { userState } from "$lib/userState.svelte";
    import { Button } from "$lib/components/ui/button/index.js";
    import Loader2 from "@lucide/svelte/icons/loader-2";
    import RefreshCw from "@lucide/svelte/icons/refresh-cw";

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

    // 1. Update Type to include start/end times
    type Policy = {
        policyid: number;
        name: string;
        schedule: string;
        srcaddr: { name: string }[];
        dstaddr: { name: string }[];
        status: string;
        comments: string;
        // Fortigate API uses hyphenated keys sometimes, adjust based on your actual response
        "webfilter-profile"?: string; 
        
        // Enriched Data
        start?: string;
        end?: string;
        templateName?: string; // e.g. "Google Classroom"
    };

    let policies = $state<Policy[]>([]);
    let isLoading = $state(false);
    let isDeleting = $state(false);
    let error = $state("");

    function formatAddr(addrs: { name: string }[]) {
        return addrs
            .map((a) => {
                let cleanName = a.name.replace(/^\[.*?\]/, "").trim();
                if (cleanName.includes(" -")) {
                    cleanName = cleanName.split(" -")[0].trim();
                }
                return cleanName;
            })
            .join(", ");
    }

    async function fetchPolicies() {
        isLoading = true;
        error = "";
        try {
            const token = localStorage.getItem("authToken");
            const headers = { 'Authorization': `Bearer ${token}` };

            // A. Fetch Policies
            const res = await fetch(`${BACKEND_URL}/firewall/policies`, { headers });
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            
            let rawList: Policy[] = data.results || (Array.isArray(data) ? data : []);
            rawList = rawList.filter(p => p.comments === "Created via API don't edit or delete");

            // B. Enrich Policies (Schedule + WebFilter)
            const enrichedPolicies = await Promise.all(rawList.map(async (policy) => {
                const updates: Partial<Policy> = {};

                // 1. Fetch Schedule (Existing Logic)
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
                    } catch (e) { console.error(`Schedule fetch failed for ${policy.name}`); }
                }

                // 2. NEW: Fetch WebFilter to detect Template
                // We check if the policy has a webfilter profile attached
                const wfName = policy["webfilter-profile"]; 
                if (wfName) {
                    try {
                        // We assume the URL Filter Name matches the WebFilter Profile Name 
                        // (Based on your "Fullhouse" creation logic)
                        const wfRes = await fetch(`${BACKEND_URL}/firewall/webfilter/urlfilter/${encodeURIComponent(wfName)}`, { headers });
                        
                        if (wfRes.ok) {
                            const wfData = await wfRes.json();
                            // Access results[0].entries based on your JSON structure
                            if (wfData.results?.[0]?.entries) {
                                updates.templateName = detectTemplate(wfData.results[0].entries);
                            }
                        }
                    } catch (e) { console.error(`Webfilter fetch failed for ${policy.name}`); }
                }

                return { ...policy, ...updates };
            }));

            policies = enrichedPolicies;

        } catch (err) {
            console.error(err);
            error = "Failed to load active policies.";
        } finally {
            isLoading = false;
        }
    }

    // ... (handleDelete remains exactly the same) ...
    async function handleDelete(policyName: string) {
        if (!confirm(`Are you sure you want to delete policy: ${policyName}?`))
            return;
        isDeleting = true;
        try {
            const token = localStorage.getItem("authToken");
            const res = await fetch(
                `${BACKEND_URL}/firewall/policies/fullhouse/delete/${policyName}`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            if (res.ok) {
                policies = policies.filter((p) => p.name !== policyName);
            } else {
                alert("Failed to delete policy");
            }
        } catch (e) {
            console.error(e);
            alert("Error connecting to server");
        } finally {
            isDeleting = false;
        }
    }

    onMount(() => {
        if (userState.value) {
            fetchPolicies();
        }
    });

    function formatDate(raw: string | undefined) {
        if (!raw) return "--";

        // 1. Split "13:20 2026/01/19" into time and date parts
        const [time, dateStr] = raw.split(" ");
        
        // 2. Create a Date object
        const date = new Date(dateStr); 

        // 3. Format to "19 January 2026"
        const readableDate = date.toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });

        // 4. Return combined string (or just readableDate if you don't want time)
        return `${readableDate} ${time}`;
    }

    function getTimelyStatus(policy: Policy) {
        // 1. If admin manually disabled it, it's Disabled.
        if (policy.status === 'disable') return 'Disabled';

        // 2. If we don't have schedule data yet, assume standard active
        if (!policy.start || !policy.end) return 'Active';

        const now = new Date();

        // 3. Parse Start Time ("13:20 2026/01/19")
        const [sTime, sDate] = policy.start.split(' ');
        const start = new Date(`${sDate.replace(/\//g, '-')}T${sTime}:00`);

        // 4. Parse End Time
        const [eTime, eDate] = policy.end.split(' ');
        const end = new Date(`${eDate.replace(/\//g, '-')}T${eTime}:00`);

        // 5. Compare
        if (now < start) return 'Inactive'; // Not started yet
        if (now > end)   return 'Expired';  // Already finished
        return 'Active';                    // Currently running
    }

    function detectTemplate(entries: any[]): string | undefined {
        if (!entries || entries.length === 0) return undefined;

        // Map of Unique URL signatures to Readable Names
        const signatures: Record<string, string> = {
            "classroom.google.com": "Google Classroom",
            "onlearn.it.kmitl.ac.th": "On:Learn",
            "jlearn.it.kmitl.ac.th": "J:Learn",
            "ujudge.it.kmitl.ac.th": "<U>Judge",
            "ijudge.it.kmitl.ac.th": "<I>Judge",
            "ejudge.it.kmitl.ac.th": "<E>Judge", // Often SecSpace/Ejudge share similar patterns, verify if distinct
            "dblearning.it.kmitl.ac.th": "DB:Learn",
            "kits.it.kmitl.ac.th": "KITS",
            "webdev.it.kmitl.ac.th": "WebDev",
            "nolearn.it.kmitl.ac.th": "No:Learn",
            "ctf.it.kmitl.ac.th": "SecSpace (CTF)"
        };

        // Loop through our known signatures
        for (const [url, name] of Object.entries(signatures)) {
            // Check if ANY entry in the webfilter matches this URL
            // We use .includes() in case the API returns "wildcard" prefixes like *.
            if (entries.some(e => e.url === url || e.url.includes(url))) {
                return name;
            }
        }

        return undefined; // No known template matched
    }
</script>

<div
    class="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 flex flex-col items-center gap-6"
>
    <div class="w-full max-w-6xl flex justify-between items-center">
        <h1 class="text-2xl font-bold dark:text-white">Active Policies</h1>
        <Button variant="outline" onclick={fetchPolicies} disabled={isLoading}>
            {#if isLoading}
                <Loader2 class="h-4 w-4 animate-spin" />
            {:else}
                <RefreshCw class="h-4 w-4 mr-2" />
                Refresh
            {/if}
        </Button>
    </div>

    {#if userState.value && (userState.value.name.toLowerCase() === 'mr.jirathip kapanya' || userState.value.role.toLowerCase() === 'lecturer' || userState.value.name.toLowerCase() === 'montree kingkaew' || userState.value.name.toLowerCase() === 'mr.pubeth sriwattana' || userState.value.name.toLowerCase() === 'นายจารุกิตติ์ ศรีพาเพลิน' || userState.value.name.toLowerCase() === 'นายชญานนท์ สุภากิจ')}
        <div
            class="w-full max-w-6xl bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
        >
            {#if error}
                <div class="p-6 text-center text-red-500">{error}</div>
            {:else if policies.length === 0 && !isLoading}
                <div class="p-10 text-center text-gray-500 dark:text-gray-400">
                    No active policies found.
                </div>
            {:else}
                <div class="relative overflow-x-auto">
                    <table
                        class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400"
                    >
                        <thead
                            class="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400"
                        >
                            <tr>
                                <th scope="col" class="px-6 py-3"
                                    >Policy Name</th
                                >
                                <th scope="col" class="px-6 py-3">Services</th>

                                <th scope="col" class="px-6 py-3">Room</th>

                                <th scope="col" class="px-6 py-3">Start Time</th
                                >
                                <th scope="col" class="px-6 py-3">End Time</th>

                                <th scope="col" class="px-6 py-3">Status</th>
                                <th scope="col" class="px-6 py-3 text-right"
                                    >Actions</th
                                >
                            </tr>
                        </thead>
                        <tbody>
                            {#each policies as policy}
                                {@const status = getTimelyStatus(policy)}
                                <tr
                                    class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                                >
                                    <th
                                        scope="row"
                                        class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                                    >
                                        {policy.name}
                                    </th>

                                    <td class="px-6 py-4">
                                        {formatAddr(policy.templateName ? [{ name: policy.templateName }] : [])}
                                    </td>

                                    <td class="px-6 py-4">
                                        {formatAddr(policy.srcaddr)}
                                    </td>

                                    <td class="px-6 py-4">
                                        {#if policy.start}
                                            <span class="font-medium text-green-600 dark:text-green-400">
                                                {formatDate(policy.start)}
                                            </span>
                                        {:else}
                                            <span class="text-gray-400 italic">--</span>
                                        {/if}
                                    </td>

                                    <td class="px-6 py-4">
                                        {#if policy.end}
                                            <span class="font-medium text-red-600 dark:text-red-400">
                                                {formatDate(policy.end)}
                                            </span>
                                        {:else}
                                            <span class="text-gray-400 italic">--</span>
                                        {/if}
                                    </td>

                                    <td class="px-6 py-4">
                                        {#if status === 'Active'}
                                            <div class="flex items-center">
                                                <div class="h-2.5 w-2.5 rounded-full bg-green-500 mr-2"></div>
                                                <span class="text-green-700 dark:text-green-400 font-medium">Active</span>
                                            </div>
                                        
                                        {:else if status === 'Inactive'} 
                                            <div class="flex items-center">
                                                <div class="h-2.5 w-2.5 rounded-full bg-yellow-400 mr-2"></div>
                                                <span class="text-yellow-700 dark:text-yellow-400 font-medium">Inactive</span>
                                            </div>

                                        {:else if status === 'Expired'}
                                            <div class="flex items-center">
                                                <div class="h-2.5 w-2.5 rounded-full bg-gray-400 mr-2"></div>
                                                <span class="text-gray-500 dark:text-gray-400">Expired</span>
                                            </div>

                                        {:else}
                                            <div class="flex items-center">
                                                <div class="h-2.5 w-2.5 rounded-full bg-red-500 mr-2"></div>
                                                <span class="text-red-700 dark:text-red-400">Disabled</span>
                                            </div>
                                        {/if}
                                    </td>

                                    <td class="px-6 py-4 text-right">
                                        <button
                                            onclick={() =>
                                                handleDelete(policy.name)}
                                            class="font-medium text-red-600 dark:text-red-500 hover:underline disabled:opacity-50"
                                            disabled={isDeleting}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>
    {:else}
        <div class="text-center p-10 bg-white rounded shadow dark:bg-gray-800">
            <h2 class="text-xl font-bold mb-2">Access Denied</h2>
            <p>You do not have permission to view active policies.</p>
        </div>
    {/if}
</div>
