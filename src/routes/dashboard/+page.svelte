<script lang="ts">
  import { userState } from "$lib/userState.svelte";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import Loader2 from "@lucide/svelte/icons/loader-2";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import { goto, invalidateAll } from "$app/navigation"; // Used to re-run the load function
  import { enhance } from "$app/forms";
  import { fade } from "svelte/transition";
  import loaderFull from "$lib/loader/loader_full.webp";
  import Eye from "@lucide/svelte/icons/eye";
  import Plus from "@lucide/svelte/icons/plus";

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
    return addrs
      .map((a) => {
        let cleanName = a.name.replace(/^\[.*?\]/, "").trim();
        if (cleanName.includes(" -"))
          cleanName = cleanName.split(" -")[0].trim();
        return cleanName;
      })
      .join(", ");
  }

  // Helper: Refresh Data
  async function handleRefresh() {
    isLoading = true;
    // invalidateAll re-runs the `load` function in +page.server.ts
    await invalidateAll();
    isLoading = false;
  }

  // Date & Status Helpers
  function formatDate(raw: string | undefined) {
    if (!raw) return "--";
    const [time, dateStr] = raw.split(" ");
    const date = new Date(dateStr);
    const readableDate = date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return `${readableDate} ${time}`;
  }

  function getTimelyStatus(policy: any) {
    if (policy.status === "disable") return "Disabled";
    if (!policy.start || !policy.end) return "Active";
    const now = new Date();
    const [sTime, sDate] = policy.start.split(" ");
    const start = new Date(`${sDate.replace(/\//g, "-")}T${sTime}:00`);
    const [eTime, eDate] = policy.end.split(" ");
    const end = new Date(`${eDate.replace(/\//g, "-")}T${eTime}:00`);
    if (now < start) return "Inactive";
    if (now > end) return "Expired";
    return "Active";
  }
</script>

<svelte:head>
  <link rel="preload" as="image" href={loaderFull} />
</svelte:head>

<div
  class="relative min-h-screen bg-[#fafafa] dark:bg-[#05080f] overflow-hidden selection:bg-purple-500/30 font-sans flex flex-col items-center gap-6 p-8 pt-32"
>
  <!-- Abstract Ambient Background Orbs -->
  <div
    class="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-400/20 dark:bg-indigo-600/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-[blob_10s_infinite]"
  ></div>
  <div
    class="absolute top-[20%] right-[-10%] w-[35vw] h-[35vw] rounded-full bg-fuchsia-400/20 dark:bg-fuchsia-600/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-[blob_12s_infinite_2s]"
  ></div>
  <div
    class="absolute bottom-[-20%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-purple-400/20 dark:bg-purple-600/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-[blob_14s_infinite_4s]"
  ></div>

  <!-- Subtle Grid Pattern -->
  <div
    class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMTUwLCAxNTAsIDE1MCwgMC4yKSIvPjwvc3ZnPg==')] [mask-image:linear-gradient(to_bottom,white,transparent_80%)]"
  ></div>
  <img
    src={loaderFull}
    alt=""
    aria-hidden="true"
    class="absolute w-0 h-0 opacity-0 pointer-events-none overflow-hidden"
  />

  <div
    class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-200 {deletingPolicyName ||
    isLoading
      ? 'opacity-100 pointer-events-auto'
      : 'opacity-0 pointer-events-none'}"
  >
    <img
      src={loaderFull}
      alt=""
      class="pointer-events-none object-contain w-[80vw] md:w-96 h-auto max-h-[80vh]"
    />

    {#if deletingPolicyName}
      <div class="mt-4 text-center">
        <h3 class="text-xl font-bold text-white tracking-wide">
          Deleting Policy...
        </h3>
        <p class="text-gray-200 mt-2">
          Say goodbye to <span class="font-mono font-bold text-red-400"
            >{deletingPolicyName}</span
          >
        </p>
      </div>
    {/if}
  </div>

  <div class="w-full max-w-6xl flex justify-between items-center relative z-10">
    <h1
      class="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white drop-shadow-sm"
    >
      Active <span
        class="bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-600 dark:from-purple-400 dark:via-fuchsia-500 dark:to-indigo-500 bg-clip-text text-transparent"
        >Policies</span
      >
    </h1>
    <div class="flex items-center gap-2">
      <Button
        variant="outline"
        onclick={() => goto("/creation")}
        class="rounded-full border-gray-300 dark:border-white/20 bg-white/50 dark:bg-black/50 backdrop-blur-md hover:bg-purple-50 dark:hover:bg-white/10 dark:text-white transition-all duration-300"
      >
        <Plus class="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
        <span class="font-semibold text-gray-800 dark:text-gray-100"
          >Create</span
        >
      </Button>

      <Button
        variant="outline"
        onclick={handleRefresh}
        disabled={isLoading}
        class="rounded-full border-gray-300 dark:border-white/20 bg-white/50 dark:bg-black/50 backdrop-blur-md hover:bg-purple-50 dark:hover:bg-white/10 dark:text-white transition-all duration-300"
      >
        {#if isLoading}
          <Loader2
            class="h-4 w-4 animate-spin text-purple-600 dark:text-purple-400"
          />
        {:else}
          <RefreshCw class="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
          <span class="font-semibold text-gray-800 dark:text-gray-100"
            >Refresh</span
          >
        {/if}
      </Button>
    </div>
  </div>

  {#if userState.value && userState.value.isAllowed}
    <div
      class="relative z-10 w-full max-w-6xl bg-white/70 dark:bg-[#0f1420]/80 backdrop-blur-xl rounded-[2rem] border border-white/40 dark:border-white/5 shadow-2xl overflow-hidden"
    >
      {#if policies.length === 0}
        <div
          class="p-10 text-center text-gray-600 dark:text-gray-400 font-medium"
        >
          No active policies found.
        </div>
      {:else}
        <div class="relative overflow-x-auto">
          <table
            class="w-full text-sm text-left rtl:text-right text-gray-600 dark:text-gray-300"
          >
            <thead
              class="text-xs uppercase bg-gray-100/50 dark:bg-white/5 text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-white/10"
            >
              <tr>
                <th scope="col" class="px-6 py-3">Policy Name</th>
                <th scope="col" class="px-6 py-3">Services</th>
                <th scope="col" class="px-6 py-3">Room</th>
                <th scope="col" class="px-6 py-3">Start Time</th>
                <th scope="col" class="px-6 py-3">End Time</th>
                <th scope="col" class="px-6 py-3">Status</th>
                <th scope="col" class="px-6 py-3">Owner</th>
                <th scope="col" class="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each policies as policy}
                {@const status = getTimelyStatus(policy)}
                <tr
                  class="bg-transparent border-b border-gray-100 dark:border-white/5 hover:bg-white/50 dark:hover:bg-white/5 transition-colors duration-200"
                >
                  <th
                    scope="row"
                    class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                  >
                    {policy.name}
                  </th>
                  <td class="px-6 py-4">
                    <div class="flex flex-wrap gap-2">
                      {#if policy.templateNames && policy.templateNames.length > 0}
                        {#each policy.templateNames as service_usage}
                          <div
                            class="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300"
                          >
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
                      <span
                        class="font-medium text-green-600 dark:text-green-400"
                        >{formatDate(policy.start)}</span
                      >
                    {:else}
                      <span class="text-gray-400 italic">--</span>
                    {/if}
                  </td>
                  <td class="px-6 py-4">
                    {#if policy.end}
                      <span class="font-medium text-red-600 dark:text-red-400"
                        >{formatDate(policy.end)}</span
                      >
                    {:else}
                      <span class="text-gray-400 italic">--</span>
                    {/if}
                  </td>
                  <td class="px-6 py-4">
                    {#if status === "Active"}
                      <div class="flex items-center">
                        <div
                          class="h-2.5 w-2.5 rounded-full bg-green-500 mr-2"
                        ></div>
                        <span
                          class="text-green-700 dark:text-green-400 font-medium"
                          >Active</span
                        >
                      </div>
                    {:else if status === "Inactive"}
                      <div class="flex items-center">
                        <div
                          class="h-2.5 w-2.5 rounded-full bg-yellow-400 mr-2"
                        ></div>
                        <span
                          class="text-yellow-700 dark:text-yellow-400 font-medium"
                          >Inactive</span
                        >
                      </div>
                    {:else if status === "Expired"}
                      <div class="flex items-center">
                        <div
                          class="h-2.5 w-2.5 rounded-full bg-gray-400 mr-2"
                        ></div>
                        <span class="text-gray-500 dark:text-gray-400"
                          >Expired</span
                        >
                      </div>
                    {:else}
                      <div class="flex items-center">
                        <div
                          class="h-2.5 w-2.5 rounded-full bg-red-500 mr-2"
                        ></div>
                        <span class="text-red-700 dark:text-red-400"
                          >Disabled</span
                        >
                      </div>
                    {/if}
                  </td>
                  <td class="px-6 py-4">
                    {#if policy.owner}
                      <span
                        class="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >{policy.owner}</span
                      >
                    {:else}
                      <span class="text-sm text-gray-400 italic">Not found</span
                      >
                    {/if}
                  </td>
                  <td class="px-6 py-4 text-right">
                    <a
                      href={`/details/${policy.encryptedSlug}`}
                      class="{buttonVariants({
                        variant: 'outline',
                        size: 'sm',
                      })} rounded-full border-gray-300 dark:border-white/20 bg-white/50 dark:bg-black/20 hover:bg-orange-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-all duration-300 shadow-sm hover:shadow-md"
                      aria-label={`View details for ${policy.name}`}
                    >
                      <Eye
                        class="h-4 w-4 mr-1 text-orange-500 dark:text-pink-400"
                      /> <span class="font-medium">Details</span>
                    </a>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {:else}
    <div
      class="relative z-10 text-center p-10 bg-white/60 dark:bg-[#0f1420]/80 backdrop-blur-xl rounded-[2rem] border border-white/40 dark:border-white/5 shadow-2xl max-w-4xl w-full"
    >
      <h2 class="text-2xl font-bold mb-2 dark:text-white">Access Denied</h2>
      <p class="text-gray-600 dark:text-gray-400">
        You do not have permission to view active policies.
      </p>
    </div>
  {/if}
</div>

<style>
  @keyframes blob {
    0% {
      transform: translate(0px, 0px) scale(1);
    }
    33% {
      transform: translate(30px, -50px) scale(1.1);
    }
    66% {
      transform: translate(-20px, 20px) scale(0.9);
    }
    100% {
      transform: translate(0px, 0px) scale(1);
    }
  }
</style>
