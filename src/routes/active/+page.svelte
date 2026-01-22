<script lang="ts">
    import { userState } from "$lib/userState.svelte";
    import { Button } from "$lib/components/ui/button/index.js";
    import Loader2 from "@lucide/svelte/icons/loader-2";
    import RefreshCw from "@lucide/svelte/icons/refresh-cw";
    import { invalidateAll } from "$app/navigation"; // Used to re-run the load function
    import { enhance } from '$app/forms';
    import { fade } from 'svelte/transition';
    import loaderFull from '$lib/loader/loader_full.webp';


    // 1. Receive Data from Server
    let { data } = $props();

    // Initialize state with server data
    // We use $state so we can modify it (e.g. delete items) without a full reload if we want
    let policies = $state(data.policies);
    
    // Update local state when server data changes (e.g. after refresh)
    $effect(() => {
        policies = data.policies;
    });

    let isLoading = $state(false);
    let deletingPolicyName = $state<string | null>(null);

    // Helper: Format Address (View Logic stays here)
    function formatAddr(addrs: { name: string }[]) {
        return addrs.map((a) => {
            let cleanName = a.name.replace(/^\[.*?\]/, "").trim();
            if (cleanName.includes(" -")) cleanName = cleanName.split(" -")[0].trim();
            return cleanName;
        }).join(", ");
    }

    // Helper: Refresh Data
    async function handleRefresh() {
        isLoading = true;
        // invalidateAll re-runs the `load` function in +page.server.ts
        await invalidateAll(); 
        isLoading = false;
    }

    // Helper: Simulate Loading for 3 seconds
    function triggerLoadingForThreeSeconds() {
        isLoading = true;
        setTimeout(() => {
            isLoading = false;
        }, 3000);
    }

    // Date & Status Helpers
    function formatDate(raw: string | undefined) {
        if (!raw) return "--";
        const [time, dateStr] = raw.split(" ");
        const date = new Date(dateStr);
        const readableDate = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        return `${readableDate} ${time}`;
    }

    function getTimelyStatus(policy: any) {
        if (policy.status === 'disable') return 'Disabled';
        if (!policy.start || !policy.end) return 'Active';
        const now = new Date();
        const [sTime, sDate] = policy.start.split(' ');
        const start = new Date(`${sDate.replace(/\//g, '-')}T${sTime}:00`);
        const [eTime, eDate] = policy.end.split(' ');
        const end = new Date(`${eDate.replace(/\//g, '-')}T${eTime}:00`);
        if (now < start) return 'Inactive';
        if (now > end)   return 'Expired';
        return 'Active';
    }
</script>

<svelte:head>
    <link rel="preload" as="image" href={loaderFull} />
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 flex flex-col items-center gap-6">
    <img 
        src={loaderFull} 
        alt="Loading..." 
        aria-hidden="false"
        class="absolute w-0 h-0 opacity-0 pointer-events-none overflow-hidden" 
    />

    {#if deletingPolicyName || isLoading}
        <div 
            transition:fade={{ duration: 200 }}
            class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
        >
            <img 
                src={loaderFull} 
                alt="Loading..." 
                class="pointer-events-none object-contain w-[80vw] md:w-96 h-auto max-h-[80vh]"
            />

            {#if deletingPolicyName}
            <div class="mt-4 text-center">
                <h3 class="text-xl font-bold text-white tracking-wide">Deleting Policy...</h3>
                <p class="text-gray-200 mt-2">
                    Say goodbye to <span class="font-mono font-bold text-red-400">{deletingPolicyName}</span>
                </p>
            </div>
            {/if}
        </div>
    {/if}

    <div class="w-full max-w-6xl flex justify-between items-center">
        <h1 class="text-2xl font-bold dark:text-white">Active Policies</h1>
        <div class="flex items-center gap-2">
            <Button variant="secondary" onclick={triggerLoadingForThreeSeconds} disabled={isLoading}>
                Trigger Loading Animation (3s)
            </Button>
            <Button variant="outline" onclick={handleRefresh} disabled={isLoading}>
                {#if isLoading}
                    <Loader2 class="h-4 w-4 animate-spin" />
                {:else}
                    <RefreshCw class="h-4 w-4 mr-2" />
                    Refresh
                {/if}
            </Button>
        </div>
    </div>

    {#if userState.value && (userState.value.name.toLowerCase() === 'mr.jirathip kapanya' || userState.value.role.toLowerCase() === 'lecturer' || userState.value.name.toLowerCase() === 'montree kingkaew' || userState.value.name.toLowerCase() === 'mr.pubeth sriwattana' || userState.value.name.toLowerCase() === 'นายจารุกิตติ์ ศรีพาเพลิน' || userState.value.name.toLowerCase() === 'นายชญานนท์ สุภากิจ')}
        
        <div class="w-full max-w-6xl bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {#if policies.length === 0}
                <div class="p-10 text-center text-gray-500 dark:text-gray-400">
                    No active policies found.
                </div>
            {:else}
                <div class="relative overflow-x-auto">
                    <table class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                        <thead class="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" class="px-6 py-3">Policy Name</th>
                                <th scope="col" class="px-6 py-3">Services</th>
                                <th scope="col" class="px-6 py-3">Room</th>
                                <th scope="col" class="px-6 py-3">Start Time</th>
                                <th scope="col" class="px-6 py-3">End Time</th>
                                <th scope="col" class="px-6 py-3">Status</th>
                                <th scope="col" class="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each policies as policy}
                                {@const status = getTimelyStatus(policy)}
                                <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                        {policy.name}
                                    </th>
                                    <td class="px-6 py-4">
                                        <div class="flex flex-wrap gap-2">
                                            {#if policy.templateNames && policy.templateNames.length > 0}
                                                {#each policy.templateNames as service_usage}
                                                    <div class="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                                                        {service_usage}
                                                    </div>
                                                {/each}
                                            {:else}
                                                <span class="text-gray-400 italic">--</span>
                                            {/if}
                                        </div>
                                    </td>
                                    <td class="px-6 py-4">{formatAddr(policy.srcaddr)}</td>
                                    <td class="px-6 py-4">
                                        {#if policy.start}
                                            <span class="font-medium text-green-600 dark:text-green-400">{formatDate(policy.start)}</span>
                                        {:else}
                                            <span class="text-gray-400 italic">--</span>
                                        {/if}
                                    </td>
                                    <td class="px-6 py-4">
                                        {#if policy.end}
                                            <span class="font-medium text-red-600 dark:text-red-400">{formatDate(policy.end)}</span>
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
                                        <form 
                                            method="POST" 
                                            action="?/delete" 
                                            use:enhance={({ cancel }) => {
                                                if (!confirm(`Are you sure you want to delete policy: ${policy.name}?`)) {
                                                    cancel();
                                                }
                                                // Trigger Overlay
                                                deletingPolicyName = policy.name;

                                                return async ({ update }) => {
                                                    await update(); 
                                                    // Hide Overlay
                                                    deletingPolicyName = null;
                                                };
                                            }}
                                        >
                                            <input type="hidden" name="policyName" value={policy.name} />
                                            
                                            <button 
                                                type="submit"
                                                class="font-medium text-red-600 dark:text-red-500 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={deletingPolicyName !== null} 
                                            >
                                                Delete
                                            </button>
                                        </form>
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