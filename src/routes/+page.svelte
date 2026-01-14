<script lang="ts">
    import { onMount } from "svelte";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { A, MultiSelect } from "flowbite-svelte"; 
    import Calendar from "$lib/components/ui/calendar/calendar.svelte";
    import * as Popover from "$lib/components/ui/popover/index.js";
    import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
    import { getLocalTimeZone, type CalendarDate } from "@internationalized/date";
    import { userState } from "$lib/userState.svelte";
    import ServicesData from "$lib/services_ex.json";
    import onlearn from '$lib/data/onlearn.json';
    import jlearn from '$lib/data/jlearn.json';
    import googleLogin from '$lib/data/google-login.json';
    import defaultUrlFilter from '$lib/data/default-urlfilter.json';
    import Loader2 from "@lucide/svelte/icons/loader-2";

    type UrlFilterEntry = {
    id: number | null;
    url: string;
    type: 'simple' | 'wildcard';
    action: 'monitor' | 'block';
    };

    type UrlFilterPayload = {
    urlfilter: UrlFilterEntry[];
    };

    type Profile = 'onlearn' | 'jlearn' | 'googleLogin' | 'default';

    let isDeploying = $state(false);

    // --- 1. STATE: FORM DATA ---
    let policyName = $state("");
    let srcRooms = $state<string[]>([]);
    
    // URL Filter Selection
    let selectedUrlFilters = $state<string[]>([]);
    
    // Schedule State
    let dateValue = $state<CalendarDate | undefined>();
    let startTime = $state("");
    let endTime = $state("");

    let selectedProfiles = $state<Profile[]>([]);

    // --- 2. STATE: DROPDOWN OPTIONS (Mocked or Fetched) ---
    let interfaces = $state<{value: string, name: string}[]>([]);
    let addresses = $state<{value: string, name: string}[]>([]);
    let urlTemplates = $state<{value: string, name: string}[]>([]);

    let internalServices: { value: string; name: string }[] = ServicesData.services.map(
        (service) => ({ value: service, name: service })
    );

    // --- 3. FETCH OPTIONS ON LOAD ---
    onMount(async () => {
        const token = localStorage.getItem("authToken");
        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            const addrData = [203, 205, 207, 304, 306, 308, 428, 434];
            if (addrData && addrData.length > 0) {
                addresses = addrData.map((a: any) => ({ value: a.toString(), name: a.toString() }));
            }

            // Fetch URL Filter Templates (if available)
            // If you have a predefined list, you can hardcode it here instead
            urlTemplates = internalServices

        } catch (err) {
            console.error("Failed to load form options", err);
        }
    });

    // --- 4. SUBMIT HANDLER ---
    async function handleMasterSubmit() {
        if (!dateValue || !startTime || !endTime) {
            alert("Please complete the schedule fields.");
            return;
        }
        if (startTime >= endTime) {
            alert("Start time must be before end time.");
            return;
        }

        isDeploying = true;

        const dateStr = dateValue.toString();
        
        // Calculate Unix Timestamps
        const startUnix = Math.floor(Date.parse(`${dateStr}T${startTime}:00+07:00`) / 1000);
        const endUnix = Math.floor(Date.parse(`${dateStr}T${endTime}:00+07:00`) / 1000);

        // Construct the Payload
        const finalPayload = {
            "policies": {
                "json": {
                    "name": policyName,
                    "srcintf": [{ "name": "[Zone]Lab" }],
                    "dstintf": [{ "name": "any" }],
                    "srcaddr": srcRooms.map(room => ({
                        name: `VLAN ${room} address`
                    })),
                    "dstaddr": [{ "name": "all" }]
                },
                "service": [
                {
                    "name": "ALL"
                }
                ],
                "action": "accept",
                "schedule": "",
                "inspection-mode": "proxy",
                "webfilter-profile": "",
                "utm-status": "enable",
                "ssl-ssh-profile": "certificate-inspection",
                "logtraffic": "all",
                "status": "enable"
            },
            "urlfilter": {
                "id": 0,
                "name": policyName,
                "comment": "This WebFilter is created via API",
                "entries": buildUrlFilterPayload(selectedProfiles).urlfilter
            },
            "onetime_schedule": {
                "name": policyName,
                "start-utc": startUnix,
                "end-utc": endUnix,
                "expiration-days": 0
            }
        };

        console.log("Submitting Payload:", JSON.stringify(finalPayload, null, 2));

        try{
            const response = await fetch('http://localhost:3000/firewall/policy/create/fullhouse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(finalPayload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            alert("Policy created successfully!");
        } catch (error) {
            console.error("Error creating policy:", error);
            alert("Failed to create policy. Please try again.");
        } finally {
            // 3. Stop Loading (runs whether success or failure)
            isDeploying = false;
        }
    }

    function buildUrlFilterPayload(profiles: Profile[]): UrlFilterPayload {
        let entries: UrlFilterEntry[] = [];

        for (const profile of profiles) {
            if (profile === 'onlearn') {
            entries.push(...(onlearn.urlfilter as UrlFilterEntry[]));
            }

            if (profile === 'jlearn') {
            entries.push(...(jlearn.urlfilter as UrlFilterEntry[]));
            entries.push(...(googleLogin.urlfilter as UrlFilterEntry[])); // mandatory add-on
            }
        }

        // default filter must always be last
        entries.push(...(defaultUrlFilter.urlfilter as UrlFilterEntry[]));

        // assign IDs based on final size
        return {
            urlfilter: entries.map((entry, index) => ({
            ...entry,
            id: index + 1
            }))
        };
    }
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 flex flex-col items-center gap-6">
    
    <div class="w-full max-w-4xl flex justify-between items-center">
        <h1 class="text-2xl font-bold dark:text-white">Firewall Policy Configuration</h1>
    </div>

    {#if userState.value} 
        {#if userState.value.role.toLowerCase() === 'student'}
        <div class="w-full max-w-4xl bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-8">
            
            <div class="space-y-4">
                <h3 class="text-lg font-semibold border-b pb-2 dark:text-white">1. Policy Details</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <div class="col-span-2">
                        <Label class="mb-2">Policy Name</Label>
                        <Input type="text" placeholder="e.g. Allow-Web-Access" bind:value={policyName} />
                    </div>

                    <div class="col-span-2">
                        <Label class="mb-2">Room</Label>
                        <MultiSelect items={addresses} bind:value={srcRooms}/>
                        <p class="text-xs text-gray-500 mt-1">Select one or more rooms to apply.</p>
                    </div>

                </div>
            </div>

            <div class="space-y-4">
                <h3 class="text-lg font-semibold border-b pb-2 dark:text-white">2. URL Filter Profiles</h3>
                <div>
                    <Label class="mb-2">Select Profiles</Label>
                    <MultiSelect items={urlTemplates} bind:value={selectedUrlFilters} />
                    <p class="text-xs text-gray-500 mt-1">Select one or more templates to apply.</p>
                </div>
            </div>

            <div class="space-y-4">
                <h3 class="text-lg font-semibold border-b pb-2 dark:text-white">3. One-Time Schedule</h3>
                <div class="flex flex-wrap gap-4 items-end">
                    
                    <div class="flex flex-col gap-2">
                        <Label>Date</Label>
                        <Popover.Root>
                            <Popover.Trigger>
                                {#snippet child({ props })}
                                    <Button {...props} variant="outline" class="w-[200px] justify-between font-normal">
                                        {dateValue ? dateValue.toDate(getLocalTimeZone()).toLocaleDateString() : "Select date"}
                                        <ChevronDownIcon class="h-4 w-4 opacity-50" />
                                    </Button>
                                {/snippet}
                            </Popover.Trigger>
                            <Popover.Content class="w-auto p-0">
                                <Calendar type="single" bind:value={dateValue} />
                            </Popover.Content>
                        </Popover.Root>
                    </div>

                    <div class="flex flex-col gap-2">
                        <Label>Start Time</Label>
                        <Input type="time" bind:value={startTime} class="w-32" />
                    </div>

                    <div class="flex flex-col gap-2">
                        <Label>End Time</Label>
                        <Input type="time" bind:value={endTime} class="w-32" />
                    </div>
                </div>
            </div>

            <div class="pt-6">
                <Button 
                    onclick={handleMasterSubmit} 
                    class="w-full text-lg h-12 bg-blue-600 hover:bg-blue-700"
                    disabled={isDeploying} 
                >
                    {#if isDeploying}
                        <Loader2 class="mr-2 h-5 w-5 animate-spin" />
                        Deploying...
                    {:else}
                        Deploy Configuration
                    {/if}
            </Button>
            </div>
        </div>
        {:else}
            <div class="text-center p-10 bg-white rounded shadow dark:bg-gray-800">
                <h2 class="text-xl font-bold mb-2">Access Denied</h2>
                <p>You do not have permission to access this page.</p>
            </div>
        {/if}

    {:else}
        <div class="text-center p-10 bg-white rounded shadow dark:bg-gray-800">
            <h2 class="text-xl font-bold mb-2">Access Denied</h2>
            <p>Please log in to configure firewall policies.</p>
        </div>
    {/if}
</div>