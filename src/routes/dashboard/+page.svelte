<script lang="ts">
  import { userState } from "$lib/userState.svelte";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import Loader2 from "@lucide/svelte/icons/loader-2";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import Timer from "@lucide/svelte/icons/timer";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import { goto, invalidateAll } from "$app/navigation";
  import { enhance } from "$app/forms";
  import { fade } from "svelte/transition";
  import { browser } from "$app/environment";
  import { onDestroy } from "svelte";
  import loaderFull from "$lib/loader/loader_full.webp";
  import Eye from "@lucide/svelte/icons/eye";
  import Plus from "@lucide/svelte/icons/plus";
  import { _ } from "svelte-i18n";

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

  // --- AUTO-REFRESH ---
  const refreshOptions = [
    { label: 'Off', value: 0 },
    { label: '30s', value: 30 },
    { label: '1m', value: 60 },
    { label: '5m', value: 300 },
    { label: '1h', value: 3600 },
  ];

  let refreshInterval = $state(
    browser ? parseInt(localStorage.getItem('dashboard-refresh') || '0') : 0
  );
  let countdown = $state(0);
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let countdownId: ReturnType<typeof setInterval> | null = null;
  let showRefreshDropdown = $state(false);

  function setRefreshInterval(seconds: number) {
    refreshInterval = seconds;
    showRefreshDropdown = false;
    if (browser) localStorage.setItem('dashboard-refresh', String(seconds));
    startAutoRefresh();
  }

  function startAutoRefresh() {
    // Clear existing timers
    if (intervalId) clearInterval(intervalId);
    if (countdownId) clearInterval(countdownId);
    intervalId = null;
    countdownId = null;

    if (refreshInterval <= 0) {
      countdown = 0;
      return;
    }

    countdown = refreshInterval;

    // Countdown ticker (every second)
    countdownId = setInterval(() => {
      countdown--;
      if (countdown < 0) countdown = refreshInterval;
    }, 1000);

    // Actual refresh
    intervalId = setInterval(async () => {
      await handleRefresh();
      countdown = refreshInterval;
    }, refreshInterval * 1000);
  }

  // Start auto-refresh on mount if configured
  $effect(() => {
    if (browser && refreshInterval > 0) {
      startAutoRefresh();
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
      if (countdownId) clearInterval(countdownId);
    };
  });

  // Close dropdown on outside click
  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('#refresh-dropdown-container')) {
      showRefreshDropdown = false;
    }
  }

  $effect(() => {
    if (browser) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  });

  // Format countdown for display
  function formatCountdown(sec: number): string {
    if (sec >= 3600) {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
    if (sec >= 60) {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
    return `${sec}s`;
  }

  const currentRefreshLabel = $derived(
    refreshOptions.find(o => o.value === refreshInterval)?.label || 'Off'
  );

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
          {$_('dashboard.deleting_policy')}
        </h3>
        <p class="text-gray-200 mt-2">
          {$_('dashboard.say_goodbye')} <span class="font-mono font-bold text-red-400"
            >{deletingPolicyName}</span
          >
        </p>
      </div>
    {/if}
  </div>

  <div class="w-full max-w-6xl flex justify-between items-center relative z-20">
    <h1
      class="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white drop-shadow-sm"
    >
      {$_('dashboard.title_active')} <span
        class="bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-600 dark:from-purple-400 dark:via-fuchsia-500 dark:to-indigo-500 bg-clip-text text-transparent"
        >{$_('dashboard.title_policies')}</span
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
          >{$_('common.create')}</span
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
            >{$_('common.refresh')}</span
          >
        {/if}
      </Button>

      <!-- Auto-Refresh Dropdown -->
      <div id="refresh-dropdown-container" class="relative">
        <button
          type="button"
          onclick={() => showRefreshDropdown = !showRefreshDropdown}
          class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-full border border-gray-300 dark:border-white/20 bg-white/50 dark:bg-black/50 backdrop-blur-md hover:bg-purple-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 transition-all duration-300"
        >
          <Timer class="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <span class="font-semibold">{currentRefreshLabel}</span>
          {#if refreshInterval > 0}
            <span class="text-xs text-gray-400 dark:text-gray-500 tabular-nums">({formatCountdown(countdown)})</span>
          {/if}
          <ChevronDown class="h-3 w-3 text-gray-400" />
        </button>

        {#if showRefreshDropdown}
          <div
            transition:fade={{ duration: 100 }}
            class="absolute right-0 mt-2 w-36 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1f2e] shadow-xl backdrop-blur-xl z-50 overflow-hidden"
          >
            {#each refreshOptions as opt}
              <button
                type="button"
                onclick={() => setRefreshInterval(opt.value)}
                class="w-full px-4 py-2.5 text-sm text-left transition-colors duration-150
                  {refreshInterval === opt.value
                    ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}"
              >
                {opt.label}
              </button>
            {/each}
          </div>
        {/if}
      </div>
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
          {$_('dashboard.no_policies')}
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
                <th scope="col" class="px-6 py-3">{$_('dashboard.th_policy_name')}</th>
                <th scope="col" class="px-6 py-3">{$_('dashboard.th_services')}</th>
                <th scope="col" class="px-6 py-3">{$_('dashboard.th_room')}</th>
                <th scope="col" class="px-6 py-3">{$_('dashboard.th_start_time')}</th>
                <th scope="col" class="px-6 py-3">{$_('dashboard.th_end_time')}</th>
                <th scope="col" class="px-6 py-3">{$_('dashboard.th_status')}</th>
                <th scope="col" class="px-6 py-3">{$_('dashboard.th_owner')}</th>
                <th scope="col" class="px-6 py-3 text-right">{$_('dashboard.th_actions')}</th>
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
                          >{$_('common.inactive')}</span
                        >
                      </div>
                    {:else if status === "Expired"}
                      <div class="flex items-center">
                        <div
                          class="h-2.5 w-2.5 rounded-full bg-gray-400 mr-2"
                        ></div>
                        <span class="text-gray-500 dark:text-gray-400"
                          >{$_('common.expired')}</span
                        >
                      </div>
                    {:else}
                      <div class="flex items-center">
                        <div
                          class="h-2.5 w-2.5 rounded-full bg-red-500 mr-2"
                        ></div>
                        <span class="text-red-700 dark:text-red-400"
                          >{$_('common.disabled')}</span
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
                      <span class="text-sm text-gray-400 italic">{$_('common.not_found')}</span
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
                      /> <span class="font-medium">{$_('common.details')}</span>
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
      <h2 class="text-2xl font-bold mb-2 dark:text-white">{$_('common.access_denied')}</h2>
      <p class="text-gray-600 dark:text-gray-400">
        {$_('dashboard.access_denied_msg')}
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
