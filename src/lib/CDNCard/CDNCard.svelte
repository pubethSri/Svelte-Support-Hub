<script lang="ts">
    import { Card, Button } from "flowbite-svelte";
    import CDNList from './CDNList.svelte';
    let { title, items = $bindable() } = $props<{ 
        title: string, 
        items: any[] 
    }>();
</script>

<div class="flex-grow basis-[22%] min-w-[300px]">
    <Card class="p-4 text-center sm:p-8 md:p-10 min-h-[24rem]">
        <h1 class="text-3xl dark:text-white mb-6">{ title }</h1>
        
        <div class="flex gap-4 w-full dark:text-white text-left">
            
            <div class="flex-1 basis-0 min-w-0">
                <h2 class="text-2xl font-normal text-center mb-4 text-green-800 dark:text-green-500">Pass</h2>
                <div class="break-words">
                    <CDNList cdn={items.filter((t: { done: boolean }) => t.done)}/>
                </div>
            </div>

            <div class="flex-1 basis-0 min-w-0">
                <h2 class="text-2xl font-normal text-center mb-4 text-red-800 dark:text-red-500">Block</h2>
                <div class="break-words">
                    <CDNList cdn={items.filter((t: { done: boolean }) => !t.done)}/>
                </div>
            </div>

        </div>
    </Card>
</div>