<script lang="ts">
    import { MultiSelect, Label, Tags, Card, Button} from "flowbite-svelte";
    import CDNCard from "../lib/CDNCard/CDNCard.svelte";
    import ServicesData from "$lib/sevices_ex.json";
    import webFilterData from "$lib/web_filter_ex.json";
    import LoginCard from "$lib/LoginCard.svelte";
    import { userState } from "$lib/userState.svelte";

    
    let selectedService: string[] = $state([]);
    let internalServices: { value: string; name: string }[] = ServicesData.services.map(
        (service) => ({ value: service, name: service })
    );
    let allowedWebsites: string[] = $state([]);

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
</script>

<!-- <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 gap-6">
    <LoginCard bind:currentUser={currentUser}/>
</div> -->

{#if userState.value && (userState.value.role.toLowerCase() === 'student')}
    <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 gap-6">
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

        <div class="flex flex-wrap md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-7xl">
            
            {#each policyCards as service}
                <CDNCard 
                    title={service.name} 
                    bind:items={service.items} 
                />
            {/each}

        </div>
    </div>
{:else if userState.value}
    <div class="text-center p-10 text-gray-500">
        <h2 class="text-xl">Access Restricted</h2>
        <p>You do not have permission to configure firewall policies.</p>
    </div>
{/if}
