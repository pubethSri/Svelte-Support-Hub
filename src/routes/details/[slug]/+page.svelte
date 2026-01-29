<script lang="ts">
  import { enhance } from "$app/forms";
  import { fade } from "svelte/transition";
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import Calendar from "@lucide/svelte/icons/calendar";
  import ShieldAlert from "@lucide/svelte/icons/shield-alert";
  import Globe from "@lucide/svelte/icons/globe";
  import Trash from "@lucide/svelte/icons/trash-2";
  import FloppyDisk from "@lucide/svelte/icons/save";
  import Maximize from "@lucide/svelte/icons/maximize";
  import Minimize from "@lucide/svelte/icons/minimize";
  import MoreVertical from "@lucide/svelte/icons/more-vertical";

  // Import your loaders
  import loaderFull from "$lib/loader/loader_full.webp";

  let { data } = $props(); // Data from server

  const { policy, schedule, webfilter } = data;

  // --- LOADER LOGIC ---
  let isDeleting = $state(false);

  // --- EXPAND/COLLAPSE LOGIC ---
  let isExpanded = $state(false);

  // Helper to format dates
  function formatDate(dateStr: string) {
    if (!dateStr) return "N/A";
    // Convert "10:00 2025/12/01" -> Date Object
    const [time, date] = dateStr.split(" ");
    const d = new Date(date);
    return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} at ${time}`;
  }

  function formatAddr(addrs: { name: string }[]) {
    return addrs
      .map((a) => {
        let cleanName = a.name.replace(/^\[.*?\]/, "").trim();
        if (cleanName.includes(" -"))
          cleanName = cleanName.split(" -")[0].trim();
        return cleanName;
      })
      .join(", ");
  }
</script>

<img
  src={loaderFull}
  alt=""
  aria-hidden="true"
  class="absolute w-0 h-0 opacity-0 pointer-events-none"
/>

<div
  class="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 flex flex-col items-center gap-8 relative"
>
  {#if isDeleting}
    <div
      transition:fade={{ duration: 200 }}
      class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <img
        src={loaderFull}
        alt="Loading..."
        class="pointer-events-none object-contain w-[80vw] md:w-96 h-auto max-h-[80vh]"
      />
      <div class="mt-4 text-center">
        <h3 class="text-xl font-bold text-white tracking-wide">
          Deleting Policy...
        </h3>
        <p class="text-gray-200 mt-2">
          Removing <span class="font-mono font-bold text-red-400"
            >{policy.name}</span
          >
        </p>
      </div>
    </div>
  {/if}

  <div class="w-full max-w-4xl space-y-6">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="icon" href="/active">
        <ArrowLeft class="h-6 w-6" />
      </Button>
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {policy.name}
        </h1>
        <span
          class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${policy.status === "enable" ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"}`}
        >
          {policy.status.toUpperCase()}
        </span>
      </div>
      <div class="ml-auto flex items-center gap-2">
        <Button
          size="lg"
          type="submit"
          class="cursor-pointer dark:bg-blue-900 text-white dark:hover:bg-blue-800 hover:bg-blue-600 bg-blue-700"
        >
          <FloppyDisk class="w-5 h-5" />
          Save Changes
        </Button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10"
          >
            <MoreVertical class="h-5 w-5" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <form
              method="POST"
              action="?/delete"
              use:enhance={({ cancel }) => {
                if (!confirm(`Permanently delete policy ${policy.name}?`)) {
                  cancel();
                  return;
                }
                isDeleting = true;
                return async ({ update }) => {
                  await update();
                  isDeleting = false;
                };
              }}
            >
              <DropdownMenu.Item
                class="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950 cursor-pointer"
                disabled={isDeleting}
                onclick={(e) => {
                  e.preventDefault();
                  e.currentTarget.closest("form")?.requestSubmit();
                }}
              >
                <Trash class="w-4 h-4 mr-2" />
                Delete Policy
              </DropdownMenu.Item>
            </form>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </div>

    <div class="grid gap-6 md:grid-cols-2">
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border dark:border-gray-700"
      >
        <h2
          class="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-white"
        >
          <ShieldAlert class="h-5 w-5 text-blue-500" />
          General Info
        </h2>
        <dl class="space-y-3 text-sm">
          <div class="flex justify-between">
            <dt class="text-gray-500">ID</dt>
            <dd class="font-medium dark:text-white">{policy.policyid}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-gray-500">Source Address</dt>
            {#if policy.srcaddr.length > 0}
              <dd class="font-medium dark:text-white">
                {formatAddr(policy.srcaddr)}
              </dd>
            {:else}
              <dd class="font-medium dark:text-white">--</dd>
            {/if}
          </div>
          <div class="flex justify-between">
            <dt class="text-gray-500">Destination Address</dt>
            {#if policy.dstaddr.length > 0}
              {#each policy.dstaddr as dst}
                <dd class="font-medium dark:text-white">{dst.name}</dd>
              {/each}
            {:else}
              <dd class="font-medium dark:text-white">--</dd>
            {/if}
          </div>
          <div class="flex justify-between">
            <dt class="text-gray-500">Action</dt>
            <dd class="font-medium dark:text-white">{policy.action}</dd>
          </div>
        </dl>
      </div>

      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border dark:border-gray-700"
      >
        <h2
          class="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-white"
        >
          <Calendar class="h-5 w-5 text-purple-500" />
          Schedule
        </h2>
        {#if schedule}
          <dl class="space-y-3 text-sm">
            <div class="border-t pt-2 mt-2 dark:border-gray-700">
              <dt class="text-gray-500 mb-1">Start Time</dt>
              <dd class="font-medium text-green-600 text-base">
                {formatDate(schedule.start)}
              </dd>
            </div>
            <div class="">
              <dt class="text-gray-500 mb-1">End Time</dt>
              <dd class="font-medium text-red-700 text-base">
                {formatDate(schedule.end)}
              </dd>
            </div>
          </dl>
        {:else}
          <p class="text-gray-500 italic">No schedule details found.</p>
        {/if}
      </div>

      <div
        class="md:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6 border dark:border-gray-700"
      >
        <div class="flex items-center justify-between mb-4">
          <h2
            class="text-lg font-semibold flex items-center gap-2 dark:text-white"
          >
            <Globe class="h-5 w-5 text-orange-500" />
            Web Filter Rules
          </h2>
          {#if webfilter && webfilter.entries && webfilter.entries.length > 5}
            <Button
              variant="outline"
              size="sm"
              onclick={() => (isExpanded = !isExpanded)}
              class="flex items-center gap-2"
            >
              {#if isExpanded}
                <Minimize class="h-4 w-4" />
                Collapse
              {:else}
                <Maximize class="h-4 w-4" />
                Expand
              {/if}
            </Button>
          {/if}
        </div>
        {#if webfilter && webfilter.entries}
          <div
            class="overflow-x-auto {isExpanded
              ? ''
              : 'max-h-80 overflow-y-auto'} transition-all duration-300"
          >
            <table
              class="w-full text-sm text-left text-gray-500 dark:text-gray-400"
            >
              <thead
                class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0"
              >
                <tr>
                  <th class="px-4 py-2">URL / Pattern</th>
                  <th class="px-4 py-2">Type</th>
                  <th class="px-4 py-2">Action</th>
                  <th class="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {#each webfilter.entries as entry}
                  <tr
                    class="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                  >
                    <td
                      class="px-4 py-2 font-medium text-gray-900 dark:text-white"
                      >{entry.url}</td
                    >
                    <td class="px-4 py-2">{entry.type}</td>
                    <td class="px-4 py-2">
                      <span
                        class={`px-2 py-0.5 rounded text-xs border ${entry.action === "block" ? "bg-red-50 text-red-600 border-red-200" : "bg-green-50 text-green-600 border-green-200"}`}
                      >
                        {entry.action}
                      </span>
                    </td>
                    <td class="px-4 py-2">{entry.status}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <p class="text-gray-500 italic">No webfilter rules configured.</p>
        {/if}
      </div>
    </div>
  </div>
</div>
