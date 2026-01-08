<script lang="ts">
    import { MultiSelect, Tags, Card} from "flowbite-svelte";
    import { Button } from "$lib/components/ui/button/index.js";
    import Calendar from "$lib/components/ui/calendar/calendar.svelte";
    import * as Popover from "$lib/components/ui/popover/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import CDNCard from "../lib/CDNCard/CDNCard.svelte";
    import ServicesData from "$lib/sevices_ex.json";
    import webFilterData from "$lib/web_filter_ex.json";
    import { userState } from "$lib/userState.svelte";
    import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
    import { getLocalTimeZone } from "@internationalized/date";
    import type { CalendarDate } from "@internationalized/date";

    
    let selectedService: string[] = $state([]);
    let internalServices: { value: string; name: string }[] = ServicesData.services.map(
        (service) => ({ value: service, name: service })
    );
    let allowedWebsites: string[] = $state([]);
    
    let apiImage: string = $state("https://www.shutterstock.com/image-vector/default-ui-image-placeholder-wireframes-600nw-1037719192.jpg");
    let isLoading = $state(false);

    const id = $props.id();
    let schedulerName = $state("");
    let startTime = $state("");
    let endTime = $state("");
    let open = $state(false);
    let value = $state<CalendarDate | undefined>();

    type UrlEntry = {
        id: number;
        url: string;
        type: string;
        action: "allow" | "block";
    };

    type UrlFilterList = {
        id: number;
        name: string;
        comment: string;
        entries: UrlEntry[];
    };

    let policyCards = $state(
        webFilterData["web-filter"].map((service, sIndex) => ({
            name: service.name,
            items: service.domains.map((domain, dIndex) => ({
                id: `${sIndex}-${dIndex}`, // Unique ID
                done: true,                // Default to Pass
                description: domain
            }))
        }))
    );

    async function handleLogSelection() {
        let counter = 1;
        const urlFilterList: UrlFilterList = {
            id: 0,
            name: "[Exam] {Placeholder}",
            comment: "This {Placeholder} Url Filter is created via API",
            entries: []
        };

        const payload: UrlEntry[] = [];
        for (const group of policyCards) {
            for (const item of group.items) {
                payload.push({
                    id: counter++,
                    url: item.description,
                    type: "wildcard",
                    action: item.done ? "allow" : "block"
                });
            }
        }

        urlFilterList.entries = payload;
        console.log(urlFilterList);

        // This will call backend API
        // try {
        //     const response = await fetch('http://localhost:3000/firewall/webfilter/create', { 
        //         method: 'POST',
        //         headers: {
        //             'Content-Type': 'application/json'
        //         },
        //         body: JSON.stringify(urlFilterList)
        //     });

        //     const result = await response.json();
        //     console.log(result);

        //     if (response.ok) {
        //         alert(`Success! Policy Created. (Name: ${result.mkey || 'N/A'})`);
        //     } else {
        //         console.error("Server Error:", result);
        //         alert(`Error: ${result.error || "Failed to create policy"}`);
        //     }

        // } catch (error) {
        //     console.error("Network Error:", error);
        //     alert("Failed to connect to backend.");
        // }
    }

    async function handleDateTimeLog() {
        if (!value) {
            alert("Please select a date first.");
            return;
        }
        if (!startTime || !endTime) {
            alert("Please select both Start and End times.");
            return;
        }

        if (startTime >= endTime) {
            alert("Invalid Time: Start time must be earlier than End time.");
            return;
        }

        // Convert CalendarDate to string (YYYY-MM-DD)
        const dateStr = value.toString();

        const logData = {
            name: schedulerName,
            "start-utc": Math.floor(Date.parse(`${dateStr}T${startTime}:00+07:00`) / 1000),
            "end-utc": Math.floor(Date.parse(`${dateStr}T${endTime}:00+07:00`) / 1000)
        };
        const token = localStorage.getItem("authToken");
        try{
            const res = await fetch('http://localhost:3000/firewall/schedule/onetime/create', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(logData)
            });
            console.log(res)
            if (res.status === 401) {
                return;
            }
        } catch (error) {
            console.error(error);
        } finally{
            isLoading = false;
        }

        console.log("Captured Schedule:", logData);
    }

    async function getImage() {
        isLoading = true;
        const token = localStorage.getItem("authToken");

        try{
            const res = await fetch('http://localhost:3000/image', {
                method: 'GET',
                headers: {
                    // 👇 This matches the backend code above
                    'Authorization': `Bearer ${token}` 
                }
            });
            if (res.status === 401) {
                apiImage = "https://http.cat/401";
                return;
            }
            apiImage = (await res.json()).image || "https://http.cat/404";
            console.log(apiImage);
        } catch (error) {
            console.error(error);
            apiImage = "https://http.cat/404";
        } finally{
            isLoading = false;
        }
    }
</script>

<div class="flex flex-col items-center bg-gray-50 dark:bg-gray-900 p-10 gap-6">
    <Button onclick={getImage}
    disabled={isLoading}
    variant="outline" class="cursor-pointer dark:bg-gray-800 dark:text-gray-300"
    >

        {isLoading ? "Loading..." : "Get Image"}
    </Button>
    <img class="content-center h-150" src={apiImage} alt="">
</div>

{#if userState.value && (userState.value.role.toLowerCase() === 'student')}
    <div class="min-h-screen flex flex-col items-center bg-gray-50 dark:bg-gray-900 gap-6">
        <div class="w-full max-w-md p-6 bg-white rounded-lg shadow-md dark:bg-gray-800 dark:text-white">
            <h2 class="mb-4 text-xl font-bold dark:text-white">Create Policy</h2>
            <h3 class="mb-4 text-m dark:text-white">Select ITKMITL Services</h3>
            <MultiSelect class="mt-2" items={internalServices} bind:value={selectedService} />
            <Label class="mb-2">Allowed Websites (Type & Enter)</Label>
            <Tags 
                bind:value={allowedWebsites} 
                placeholder="Add website (e.g. google.com)..." 
                class="mt-2"
            />
            <p class="text-xs text-gray-500 mt-1">Press Enter to add a website.</p>
            <strong>Websites to Allow:</strong> {JSON.stringify(selectedService.concat(allowedWebsites))}
            <Button onclick={handleLogSelection} size="lg" color="blue" class="w-full mt-2">
                Log Selected CDNs
            </Button>
        </div>
        
        <div class="flex gap-4">
            <div class="flex flex-col gap-3">
                <Label for="{id}-scheduler-name" class="px-1">Scheduler Name</Label>
                <Input
                type="text"
                placeholder="Enter scheduler name"
                id="{id}-scheduler-name"
                bind:value={schedulerName}
                />
            </div>
            <div class="flex flex-col gap-3">
                <Label for="{id}-date" class="px-1">Date</Label>
                <Popover.Root bind:open>
                <Popover.Trigger id="{id}-date">
                    {#snippet child({ props })}
                    <Button
                        {...props}
                        variant="outline"
                        class="w-32 justify-between font-normal"
                    >
                        {value
                        ? value.toDate(getLocalTimeZone()).toLocaleDateString()
                        : "Select date"}
                        <ChevronDownIcon />
                    </Button>
                    {/snippet}
                </Popover.Trigger>
                <Popover.Content class="w-auto overflow-hidden p-0" align="start">
                    <Calendar
                    type="single"
                    bind:value
                    onValueChange={() => {
                        open = false;
                    }}
                    captionLayout="dropdown"
                    />
                </Popover.Content>
                </Popover.Root>
            </div>
            <div class="flex flex-col gap-3">
                <Label for="{id}-time" class="px-1">Start</Label>
                <Input
                type="time"
                id="{id}-time"
                bind:value={startTime}
                class="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
            </div>
            <div class="flex flex-col gap-3">
                <Label for="{id}-time" class="px-1">End</Label>
                <Input
                type="time"
                id="{id}-time"
                bind:value={endTime}
                class="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
            </div>
            <Button onclick={handleDateTimeLog} size="sm" color="blue" class="h-15">
                Log Date&Time
            </Button>
        </div>

        {#if userState.value && (userState.value.role.toLowerCase() === 'lecturer')}
        <div class="flex flex-wrap md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-7xl">
            
            {#each policyCards as service}
                <CDNCard 
                    title={service.name} 
                    bind:items={service.items} 
                />
            {/each}

        </div>
        {/if}
    </div>
{:else if userState.value}
    <div class="text-center p-10 text-gray-500">
        <h2 class="text-xl">Access Restricted</h2>
        <p>You do not have permission to configure firewall policies.</p>
    </div>
{:else}
    <div class="text-center p-10 text-gray-500">
        <h2 class="text-xl">Nothing to be shown here</h2>
        <p>You need to be signed in to access something.</p>
    </div>
{/if}
