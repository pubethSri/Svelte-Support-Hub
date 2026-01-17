<script lang="ts">
    import { onMount } from "svelte";
    import { userState } from "$lib/userState.svelte";
    import { Button } from "$lib/components/ui/button/index.js";
    import Loader2 from "@lucide/svelte/icons/loader-2";
    import RefreshCw from "@lucide/svelte/icons/refresh-cw";
    import Trash2 from "@lucide/svelte/icons/trash-2";

    // Define the shape of a Policy object based on Fortigate structure
    type Policy = {
        policyid: number;
        name: string;
        schedule: string;
        srcaddr: { name: string }[];
        dstaddr: { name: string }[];
        status: string;
    };

    let policies = $state<Policy[]>([]);
    let isLoading = $state(false);
    let isDeleting = $state(false);
    let error = $state("");

    // Helper to format Source Addresses (which is an array)
    function formatAddr(addrs: { name: string }[]) {
        return addrs.map(a => a.name).join(", ");
    }

    async function fetchPolicies() {
        isLoading = true;
        error = "";
        try {
            const token = localStorage.getItem("authToken");
            
            // Call your existing backend route
            const res = await fetch('http://localhost:3000/firewall/policies', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Failed to fetch");

            const data = await res.json();
            
            // Handle different API response structures (e.g., { results: [...] } vs [...])
            const rawList: Policy[] = data.results || (Array.isArray(data) ? data : []);

            policies = rawList;

        } catch (err) {
            console.error(err);
            error = "Failed to load active policies.";
        } finally {
            isLoading = false;
        }
    }

    // Optional: Delete Handler
    async function handleDelete(policyName: string) {
        if (!confirm(`Are you sure you want to delete policy: ${policyName}?`)) return;
        
        isDeleting = true;
        try {
            const token = localStorage.getItem("authToken");
            const res = await fetch(`http://localhost:3000/firewall/schedule/onetime/${policyName}`, { // Adjust endpoint if needed
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                // Remove from local list to update UI instantly
                policies = policies.filter(p => p.name !== policyName);
            } else {
                alert("Failed to delete policy");
            }
        } catch(e) {
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
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 flex flex-col items-center gap-6">
    
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

    {#if userState.value && (userState.value.name.toLowerCase() === 'mr.jirathip kapanya' || userState.value.role.toLowerCase() === 'lecturer' || userState.value.name.toLowerCase() === 'montree')}
        
        <div class="w-full max-w-6xl bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            
            {#if error}
                <div class="p-6 text-center text-red-500">{error}</div>
            {:else if policies.length === 0 && !isLoading}
                <div class="p-10 text-center text-gray-500 dark:text-gray-400">
                    No active policies found.
                </div>
            {:else}
                <div class="relative overflow-x-auto">
                    <table class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                        <thead class="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" class="px-6 py-3">Policy Name</th>
                                <th scope="col" class="px-6 py-3">Schedule</th>
                                <th scope="col" class="px-6 py-3">Source Address</th>
                                <th scope="col" class="px-6 py-3">Status</th>
                                <th scope="col" class="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each policies as policy}
                                <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                        {policy.name}
                                    </th>

                                    <td class="px-6 py-4">
                                        {formatAddr(policy.srcaddr)}
                                    </td>
                                    
                                    <td class="px-6 py-4">
                                        <span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                                            {policy.schedule}
                                        </span>
                                    </td>

                                    <td class="px-6 py-4">
                                        {#if policy.status === 'enable'}
                                            <div class="flex items-center">
                                                <div class="h-2.5 w-2.5 rounded-full bg-green-500 mr-2"></div>
                                                Active
                                            </div>
                                        {:else}
                                            <div class="flex items-center">
                                                <div class="h-2.5 w-2.5 rounded-full bg-red-500 mr-2"></div>
                                                Inactive
                                            </div>
                                        {/if}
                                    </td>

                                    <td class="px-6 py-4 text-right">
                                        <button 
                                            onclick={() => handleDelete(policy.name)} 
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