<script lang="ts">
    import { MultiSelect, Label, Tags, Card, Button} from "flowbite-svelte";
    import CDNCard from "../lib/CDNCard/CDNCard.svelte";
    import { TrashBinSolid } from 'flowbite-svelte-icons';
    import ServicesData from "$lib/sevices_ex.json";
    import web_filter from "$lib/web_filter_ex.json";
    
    let selectedService: string[] = [];
    let internalServices: { value: string; name: string }[] = ServicesData.services.map(
        (service) => ({ value: service, name: service })
    );
    let allowedWebsites: string[] = [];
</script>

<header
    class="bg-gradient-to-r from-blue-500 to-indigo-600 py-20 md:py-28 text-white relative overflow-hidden"
>
    <!-- Background Elements -->
    <div class="absolute inset-0 overflow-hidden opacity-10">
        <i
            class="fas fa-laptop text-white absolute top-10 left-10 text-6xl transform -rotate-12 bg-icon"
        ></i>
        <i
            class="fas fa-server text-white absolute top-40 right-20 text-5xl bg-icon"
        ></i>
        <i
            class="fas fa-network-wired text-white absolute bottom-20 left-1/4 text-4xl transform rotate-12 bg-icon"
        ></i>
        <i
            class="fas fa-globe text-white absolute bottom-40 right-1/3 text-5xl bg-icon"
        ></i>
    </div>

    <div class="container mx-auto px-6 text-center relative z-10">
        <div
            class="inline-block mb-6 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full"
        >
            <span class="text-white flex items-center justify-center">
                <i class="fas fa-headset mr-2"></i> ระบบคำขอบริการ IT Support ใหม่กว่า
            </span>
        </div>

        <h1 class="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            ITSupportHub: <span class="text-blue-200"
                >ศูนย์กลางคำขอบริการ IT</span
            >
        </h1>
        <p
            class="text-lg md:text-xl text-blue-100 mb-10 max-w-3xl mx-auto leading-relaxed"
        >
            ระบบสำหรับยื่นคำร้องขอยืมอุปกรณ์ไอที, ขอใช้งาน Virtual Machine (VM),
            และขอ Subdomain พร้อมติดตามสถานะคำขอของคุณแบบเรียลไทม์
        </p>
    </div>
</header>

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
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-7xl">
        
        {#each Array(7) as _}
            <CDNCard />
        {/each}

    </div>
</div>
