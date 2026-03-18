<script lang="ts">
  import { enhance } from "$app/forms";
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
  import Loader2 from "@lucide/svelte/icons/loader-2";
  import HelpCircle from "@lucide/svelte/icons/help-circle";
  import { driver } from "driver.js";
  import "driver.js/dist/driver.css";
  import { _ } from "svelte-i18n";
  import { fade } from "svelte/transition";
  import XCircle from "@lucide/svelte/icons/x-circle";
  import CheckCircle from "@lucide/svelte/icons/check-circle";

  type UrlFilterEntry = {
    id: number | null;
    url: string;
    type: "simple" | "wildcard";
    action: "monitor" | "block";
  };

  type UrlFilterPayload = {
    urlfilter: UrlFilterEntry[];
  };

  let isDeploying = $state(false);
  let queuePosition = $state<number | null>(null);
  let queueStatus = $state<string>("");

  // Notification state
  let showSuccessModal = $state(false);
  let successMessage = $state("");
  let showErrorModal = $state(false);
  let errorMessage = $state("");
  let successTimeout: ReturnType<typeof setTimeout> | null = null;

  function showSuccess(msg: string) {
    successMessage = msg;
    showSuccessModal = true;
    if (successTimeout) clearTimeout(successTimeout);
  }

  function showError(msg: string) {
    errorMessage = msg;
    showErrorModal = true;
  }

  // --- 1. STATE: FORM DATA ---
  let policyName = $state("");
  let srcRooms = $state<string[]>([]);

  // Schedule State
  let dateValue = $state<CalendarDate | undefined>();
  let startTime = $state("");
  let endTime = $state("");
  let selectedProfiles = $state<string[]>([]);
  let serviceMode = $state<"pass" | "block">("block");

  // --- 2. STATE: DROPDOWN OPTIONS (Fetched) ---
  let { data } = $props();
  // We use data.templates fetched from SQLite via the backend +page.server.ts load function
  const templates = data.templates || [];

  let addresses = $state<{ value: string; name: string }[]>([]);
  let urlTemplates = $state<{ value: string; name: string }[]>([]);

  // Dynamically derive the available templates based on the selected mode
  const availableTemplates = $derived(
    templates
      .filter((t: any) => !t.isHidden && t.mode === serviceMode)
      .map((temp: any) => ({
        value: temp.name,
        name: temp.displayName || temp.name,
      })),
  );

  // When availableTemplates (i.e. serviceMode) changes, clear the selection and update dropdown
  $effect(() => {
    selectedProfiles = [];
    urlTemplates = availableTemplates;
  });

  // --- 3. FETCH OPTIONS ON LOAD ---
  onMount(async () => {
    try {
      const addrData = [203, 205, 207, 304, 306, 308, 428, 434];
      if (addrData && addrData.length > 0) {
        addresses = addrData.map((a: any) => ({
          value: a.toString(),
          name: a.toString(),
        }));
      }

      urlTemplates = availableTemplates;
    } catch (err) {
      console.error("Failed to load form options", err);
    }
  });

  // --- 4. BUILD PAYLOAD FUNCTION ---
  function buildPolicyPayload() {
    const dateStr = dateValue!.toString();

    // Calculate Unix Timestamps
    const startUnix = Math.floor(
      Date.parse(`${dateStr}T${startTime}:00+07:00`) / 1000,
    );
    const endUnix = Math.floor(
      Date.parse(`${dateStr}T${endTime}:00+07:00`) / 1000,
    );

    // Construct the Payload
    return {
      policies: {
        json: {
          name: `[EXAM][API] ${policyName}`,
          srcintf: [{ name: "[Zone]Lab" }],
          dstintf: [{ name: "any" }],
          srcaddr: srcRooms.map((room) => ({
            name: `[Subnet]Lab ${room} - VLAN ${room}`,
          })),
          dstaddr: [{ name: "all" }],
          service: [
            {
              name: "ALL",
            },
          ],
          action: "accept",
          schedule: "",
          "inspection-mode": "flow",
          "webfilter-profile": "",
          "utm-status": "enable",
          "ssl-ssh-profile": "full-deep-inspection",
          "application-list": "allow-web-only",
          logtraffic: "all",
          status: "enable",
          comments: "Created via API don't edit or delete",
        },
      },
      urlfilter: {
        id: 0,
        name: `[EXAM][API] ${policyName}`,
        comment: "This WebFilter is created via API",
        entries: generateUrlFilter(selectedProfiles).urlfilter,
      },
      onetime_schedule: {
        name: `[EXAM][API] ${policyName}`,
        "start-utc": startUnix,
        "end-utc": endUnix,
        "expiration-days": 0,
      },
    };
  }

  function generateUrlFilter(profiles: string[]) {
    const entries: UrlFilterEntry[] = [];
    const injectedTemplateNames = new Set<string>();

    // Map selected template names into entries
    for (const profileName of profiles) {
      const template = templates.find((t: any) => t.name === profileName);
      if (template) {
        if (template.entries) entries.push(...template.entries);

        // Read auto-inject dependencies from DB
        if (template.autoInject && Array.isArray(template.autoInject)) {
          template.autoInject.forEach((dep: string) =>
            injectedTemplateNames.add(dep),
          );
        }
      }
    }

    // Process auto-injected templates dynamically from DB
    for (const depName of injectedTemplateNames) {
      if (!profiles.includes(depName)) {
        // Don't duplicate if explicitly selected manually
        const depTemplate = templates.find((t: any) => t.name === depName);
        if (depTemplate?.entries) {
          entries.push(...depTemplate.entries);
        }
      }
    }

    // Auto-inject default URL filter ONLY if they are in "block" mode
    if (serviceMode === "block") {
      const defaultFilterTemplate = templates.find(
        (t: any) => t.name === "default-urlfilter",
      );
      if (defaultFilterTemplate?.entries)
        entries.push(...defaultFilterTemplate.entries);
    }

    // assign IDs based on final size
    return {
      urlfilter: entries.map((entry, index) => ({
        ...entry,
        id: index + 1,
      })),
    };
  }

  // --- 5. HOW TO USE TOUR (driver.js) ---
  function startTour() {
    const tour = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      onDestroyed: () => {
        // Force cleanup of any lingering driver.js styles that might block scrolling
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        // Scroll back to the top automatically after finishing/exiting the tour
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
      steps: [
        {
          element: '#step-policy-details',
          popover: {
            title: $_('creation.tour.policy_details_title'),
            description: $_('creation.tour.policy_details_desc'),
            side: "top", align: 'start'
          }
        },
        {
          element: '#step-services',
          popover: {
            title: $_('creation.tour.services_title'),
            description: $_('creation.tour.services_desc'),
            side: "top", align: 'start'
          }
        },
        {
          element: '#step-schedule',
          popover: {
            title: $_('creation.tour.schedule_title'),
            description: $_('creation.tour.schedule_desc'),
            side: "top", align: 'start'
          }
        },
        {
          element: '#step-deploy',
          popover: {
            title: $_('creation.tour.deploy_title'),
            description: $_('creation.tour.deploy_desc'),
            side: "top", align: 'start'
          }
        }
      ]
    });

    tour.drive();
  }
</script>

<div
  class="relative min-h-screen bg-[#fafafa] dark:bg-[#05080f] overflow-x-hidden selection:bg-purple-500/30 font-sans flex flex-col items-center gap-6 p-8 pt-32"
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

  <div
    class="w-full max-w-4xl flex justify-between items-center relative z-10 mb-2"
  >
    <h1
      class="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white drop-shadow-sm"
    >
      {$_('creation.title_policy')} <span
        class="bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-600 dark:from-purple-400 dark:via-fuchsia-500 dark:to-indigo-500 bg-clip-text text-transparent"
        >{$_('creation.title_creation')}</span
      >
    </h1>
    {#if userState.value?.isAllowed}
      <Button
        variant="outline"
        size="sm"
        class="flex items-center gap-2 bg-white/50 dark:bg-black/30 backdrop-blur-md border-purple-500/30 hover:bg-purple-50 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium transition-all"
        onclick={startTour}
      >
        <HelpCircle class="w-4 h-4" />
        <span class="hidden sm:inline">{$_('creation.how_to_use')}</span>
      </Button>
    {/if}
  </div>

  {#if userState.value}
    {#if userState.value.isAllowed}
      <div
        class="relative z-10 w-full max-w-4xl bg-white/70 dark:bg-[#0f1420]/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white/40 dark:border-white/5 shadow-2xl space-y-8"
      >
        <div class="space-y-4" id="step-policy-details">
          <h3
            class="text-xl font-bold border-b border-gray-200/50 dark:border-white/10 pb-2 dark:text-white text-gray-800"
          >
            {$_('creation.policy_details')}
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="col-span-2">
              <div class="flex items-center justify-between mb-2">
                <Label>{$_('creation.policy_name')}</Label>
                <span
                  class="text-xs font-medium {17 - policyName.length <= 3
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-gray-400 dark:text-gray-500'}"
                >
                  {$_('creation.characters_left', { values: { count: 17 - policyName.length } })}
                </span>
              </div>
              <Input
                type="text"
                maxlength={17}
                placeholder={$_('creation.policy_name_placeholder')}
                bind:value={policyName}
              />
              <p class="text-xs text-gray-500 mt-1">
                {$_('creation.name_restriction')}
              </p>
            </div>

            <div class="col-span-2">
              <Label class="mb-2">{$_('creation.room')}</Label>
              <MultiSelect items={addresses} bind:value={srcRooms} />
              {#if srcRooms.length === 0}
                <p class="text-xs text-red-600 dark:text-red-400 mt-1">
                  {$_('creation.room_required')}
                </p>
              {:else}
                <p class="text-xs text-gray-500 mt-1">
                  {$_('creation.room_hint')}
                </p>
              {/if}
            </div>
          </div>
        </div>

        <div class="space-y-4" id="step-services">
          <h3
            class="text-xl font-bold border-b border-gray-200/50 dark:border-white/10 pb-2 dark:text-white text-gray-800"
          >
            {$_('creation.services')}
          </h3>
          <div>
            <div class="flex items-center gap-4 mb-4">
              <div
                class="inline-flex rounded-lg border border-gray-200 dark:border-white/10 p-1 bg-gray-50 dark:bg-black/20"
              >
                <button
                  type="button"
                  class="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 {serviceMode ===
                  'block'
                    ? 'bg-white dark:bg-white/10 shadow-sm text-red-600 dark:text-red-400'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}"
                  onclick={() => {
                    serviceMode = "block";
                  }}
                >
                  {$_('creation.block_mode')}
                </button>
                <button
                  type="button"
                  class="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 {serviceMode ===
                  'pass'
                    ? 'bg-white dark:bg-white/10 shadow-sm text-green-600 dark:text-green-400'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}"
                  onclick={() => {
                    serviceMode = "pass";
                  }}
                >
                  {$_('creation.pass_mode')}
                </button>
              </div>
            </div>

            <Label class="mb-2">
              {#if serviceMode === "pass"}
                {$_('creation.pass_mode_desc')}
              {:else}
                {$_('creation.block_mode_desc')}
              {/if}
            </Label>
            <MultiSelect
              items={urlTemplates}
              bind:value={selectedProfiles}
              placeholder={serviceMode === "pass"
                ? $_('creation.pass_everything')
                : $_('creation.block_everything')}
            />
            <p class="text-xs text-gray-500 mt-1">
              {serviceMode === "pass"
                ? $_('creation.services_hint_pass')
                : $_('creation.services_hint_block')}
            </p>
          </div>
        </div>

        <div class="space-y-4" id="step-schedule">
          <h3
            class="text-xl font-bold border-b border-gray-200/50 dark:border-white/10 pb-2 dark:text-white text-gray-800"
          >
            {$_('creation.schedule')}
          </h3>
          <div class="flex flex-wrap gap-4 items-end">
            <div class="flex flex-col gap-2">
              <Label>{$_('creation.date')}</Label>
              <Popover.Root>
                <Popover.Trigger>
                  {#snippet child({ props })}
                    <div
                      {...props}
                      class="inline-flex items-center justify-between w-[200px] h-10 px-3 py-2 text-sm font-normal rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer"
                    >
                      {dateValue
                        ? dateValue
                            .toDate(getLocalTimeZone())
                            .toLocaleDateString()
                        : $_('creation.select_date')}
                      <ChevronDownIcon class="h-4 w-4 opacity-50" />
                    </div>
                  {/snippet}
                </Popover.Trigger>
                <Popover.Content class="w-auto p-0">
                  <Calendar type="single" bind:value={dateValue} />
                </Popover.Content>
              </Popover.Root>
            </div>

            <div class="flex flex-col gap-2">
              <Label>{$_('creation.start_time')}</Label>
              <Input type="time" bind:value={startTime} class="w-32" />
            </div>

            <div class="flex flex-col gap-2">
              <Label>{$_('creation.end_time')}</Label>
              <Input type="time" bind:value={endTime} class="w-32" />
            </div>
          </div>
        </div>

        <div class="pt-6">
          <form
            method="POST"
            action="?/createPolicy"
            use:enhance={({ cancel, formData }) => {
              // Client-side validation
              if (policyName.trim() === "") {
                showError($_('creation.validation.name_required') as string);
                cancel();
                return;
              }
              if (!/^[A-Za-z0-9 ]+$/.test(policyName)) {
                showError(
                  $_('creation.validation.name_english_only') as string,
                );
                cancel();
                return;
              }
              if (policyName.length > 17) {
                showError($_('creation.validation.name_too_long') as string);
                cancel();
                return;
              }
              if (!srcRooms || srcRooms.length === 0) {
                showError(
                  $_('creation.validation.room_required') as string,
                );
                cancel();
                return;
              }
              if (!dateValue || !startTime || !endTime) {
                showError($_('creation.validation.schedule_required') as string);
                cancel();
                return;
              }
              if (startTime >= endTime) {
                showError($_('creation.validation.time_order') as string);
                cancel();
                return;
              }

              // Build and attach payload
              const payload = buildPolicyPayload();
              formData.set("policyData", JSON.stringify(payload));

              isDeploying = true;
              queueStatus = "waiting";
              queuePosition = null;

              return async ({ result, update }) => {
                await update({ reset: false });

                if (result.type === "success" && result.data?.success) {
                  const jobId = result.data.jobId;

                  // Start polling
                  const pollInterval = window.setInterval(async () => {
                    try {
                      const res = await fetch(`/api/queue/${jobId}`);
                      if (!res.ok) return;

                      const statusData = await res.json();

                      if (statusData.status === "completed") {
                        clearInterval(pollInterval);
                        isDeploying = false;
                        queuePosition = null;
                        showSuccess($_('creation.success') as string);
                        setTimeout(() => {
                           window.location.href = "/dashboard";
                        }, 2000);
                      } else if (statusData.status === "failed") {
                        clearInterval(pollInterval);
                        isDeploying = false;
                        queuePosition = null;
                        showError(statusData.error || String($_('creation.failed')));
                      } else {
                        // "waiting" or "processing"
                        queueStatus = statusData.status;
                        queuePosition = statusData.position;
                      }
                    } catch (e) {
                      console.error("Failed to poll queue:", e);
                    }
                  }, 2000);
                } else if (result.type === "failure") {
                  isDeploying = false;
                  showError(result.data?.error || ($_('creation.failed') as any));
                } else if (result.type === "error") {
                  isDeploying = false;
                  showError($_('creation.error') as string);
                } else {
                  isDeploying = false;
                }
              };
            }}
          >
            <div id="step-deploy">
              <Button
                type="submit"
                class="w-full text-lg h-14 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 hover:-translate-y-0.5 mt-4"
                disabled={isDeploying || srcRooms.length === 0}
              >
                {#if isDeploying}
                  <Loader2 class="mr-2 h-5 w-5 animate-spin" />
                  {#if queueStatus === "processing"}
                    {String($_('creation.processing'))}
                  {:else if queuePosition !== null}
                    {queuePosition - 1 > 0
                      ? String($_('creation.queue_waiting', { values: { position: queuePosition - 1 } }))
                      : String($_('creation.queue_next'))}
                  {:else}
                    {String($_('creation.queuing'))}
                  {/if}
                {:else}
                  <span class="font-bold">{String($_('creation.deploy'))}</span>
                {/if}
              </Button>
            </div>
          </form>
        </div>
      </div>
    {:else}
      <div
        class="relative z-10 text-center p-10 bg-white/60 dark:bg-[#0f1420]/80 backdrop-blur-xl rounded-[2rem] border border-white/40 dark:border-white/5 shadow-2xl max-w-4xl w-full"
      >
        <h2 class="text-2xl font-bold mb-2 dark:text-white">{$_('common.access_denied') as string}</h2>
        <p class="text-gray-600 dark:text-gray-400">
          {$_('creation.access_denied_msg') as string}
        </p>
      </div>
    {/if}
  {:else}
    <div
      class="relative z-10 text-center p-10 bg-white/60 dark:bg-[#0f1420]/80 backdrop-blur-xl rounded-[2rem] border border-white/40 dark:border-white/5 shadow-2xl max-w-4xl w-full"
    >
      <h2 class="text-2xl font-bold mb-2 dark:text-white">{$_('common.access_denied') as string}</h2>
      <p class="text-gray-600 dark:text-gray-400">
        {$_('creation.login_required_msg') as string}
      </p>
    </div>
  {/if}
</div>

<!-- Transaction Complete Modal -->
{#if showSuccessModal}
  <div
    transition:fade={{ duration: 200 }}
    class="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="transaction-card bg-white/95 dark:bg-[#0f1420]/95 backdrop-blur-2xl rounded-[2rem] border border-white/40 dark:border-white/10 shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-5 relative overflow-hidden"
    >
      <!-- Animated SVG Checkmark -->
      <div class="check-container w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 dark:from-emerald-500 dark:to-green-700 flex items-center justify-center shadow-lg shadow-green-500/30">
        <svg class="check-svg w-10 h-10" viewBox="0 0 24 24" fill="none">
          <path
            class="check-path"
            d="M4 12.5L9.5 18L20 6"
            stroke="white"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>

      <!-- Title -->
      <div class="text-center space-y-1">
        <h3 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          {$_('creation.success_title') as string}
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {successMessage}
        </p>
      </div>

      <!-- Receipt-style details -->
      <div class="w-full space-y-3 px-2">
        <div class="flex justify-between items-center">
          <span class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Policy</span>
          <span class="text-sm font-semibold text-gray-800 dark:text-gray-200 font-mono">{policyName || '—'}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Rooms</span>
          <span class="text-sm font-semibold text-gray-800 dark:text-gray-200 font-mono">{srcRooms.length > 0 ? srcRooms.join(', ') : '—'}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Mode</span>
          <span class="text-sm font-semibold text-gray-800 dark:text-gray-200 font-mono capitalize">{serviceMode}</span>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-100 dark:bg-gray-800">
        <div
          class="h-full bg-gradient-to-r from-emerald-400 to-green-500"
          style="animation: shrink 1.5s linear forwards"
        ></div>
      </div>
    </div>
  </div>
{/if}

<!-- Error Modal (requires click) -->
{#if showErrorModal}
  <div
    transition:fade={{ duration: 150 }}
    class="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="bg-white/95 dark:bg-[#0f1420]/95 backdrop-blur-2xl rounded-[2rem] border border-white/40 dark:border-white/10 shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-4"
    >
      <div
        class="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center"
      >
        <XCircle class="w-7 h-7 text-red-600 dark:text-red-400" />
      </div>
      <div class="text-center">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {$_('creation.error_title') as string}
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {errorMessage}
        </p>
      </div>
      <Button
        onclick={() => {
          showErrorModal = false;
        }}
        class="w-full mt-2 bg-red-600 hover:bg-red-700 text-white rounded-full"
      >
        OK
      </Button>
    </div>
  </div>
{/if}

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

  /* Transaction Complete animations */
  .transaction-card {
    animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  }

  @keyframes popIn {
    0% {
      opacity: 0;
      transform: scale(0.85) translateY(20px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .check-container {
    animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.2s both;
  }

  .check-path {
    stroke-dasharray: 28;
    stroke-dashoffset: 28;
    animation: drawCheck 0.5s ease-out 0.5s forwards;
  }

  @keyframes drawCheck {
    to {
      stroke-dashoffset: 0;
    }
  }

  .status-badge {
    animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.7s both;
  }

  :global {
    @keyframes shrink {
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }
  }
</style>
