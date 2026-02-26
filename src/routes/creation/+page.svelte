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

  // --- 1. STATE: FORM DATA ---
  let policyName = $state("");
  let srcRooms = $state<string[]>([]);

  // Schedule State
  let dateValue = $state<CalendarDate | undefined>();
  let startTime = $state("");
  let endTime = $state("");

  let selectedProfiles = $state<string[]>([]);

  // --- 2. STATE: DROPDOWN OPTIONS (Mocked or Fetched) ---
  let { data } = $props();
  // We use data.templates fetched from SQLite via the backend +page.server.ts load function
  const templates = data.templates || [];

  let addresses = $state<{ value: string; name: string }[]>([]);
  let urlTemplates = $state<{ value: string; name: string }[]>([]);

  // Build the list by iterating through the database array directly,
  // since the Backend Database is strictly ordered by ID
  let availableTemplates: { value: string; name: string }[] = templates
    .filter((t: any) => !t.isHidden)
    .map((temp: any) => ({
      value: temp.name,
      name: temp.displayName || temp.name,
    }));

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

    // Auto-inject default URL filter UNLESS they are blocking AI/Chat exclusively
    if (!profiles.includes("block-ai") && !profiles.includes("block-chat")) {
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
</script>

<div
  class="relative min-h-screen bg-[#fafafa] dark:bg-[#05080f] overflow-hidden selection:bg-orange-500/30 font-sans flex flex-col items-center gap-6 p-8 pt-32"
>
  <!-- Abstract Ambient Background Orbs -->
  <div
    class="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-orange-400/20 dark:bg-orange-600/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-[blob_10s_infinite]"
  ></div>
  <div
    class="absolute top-[20%] right-[-10%] w-[35vw] h-[35vw] rounded-full bg-pink-400/20 dark:bg-pink-600/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-[blob_12s_infinite_2s]"
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
      Policy <span
        class="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 dark:from-yellow-400 dark:via-pink-500 dark:to-purple-500 bg-clip-text text-transparent"
        >Creation</span
      >
    </h1>
  </div>

  {#if userState.value}
    {#if userState.value.isAllowed}
      <div
        class="relative z-10 w-full max-w-4xl bg-white/70 dark:bg-[#0f1420]/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white/40 dark:border-white/5 shadow-2xl space-y-8"
      >
        <div class="space-y-4">
          <h3
            class="text-xl font-bold border-b border-gray-200/50 dark:border-white/10 pb-2 dark:text-white text-gray-800"
          >
            1. Policy Details
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="col-span-2">
              <Label class="mb-2">Policy Name</Label>
              <Input
                type="text"
                placeholder="ex. Midterm <name>"
                bind:value={policyName}
              />
              <p class="text-xs text-gray-500 mt-1">
                Please include "Midterm" followed by the exam name.
              </p>
            </div>

            <div class="col-span-2">
              <Label class="mb-2">Room</Label>
              <MultiSelect items={addresses} bind:value={srcRooms} />
              {#if srcRooms.length === 0}
                <p class="text-xs text-red-600 dark:text-red-400 mt-1">
                  ⚠️ At least one room must be selected
                </p>
              {:else}
                <p class="text-xs text-gray-500 mt-1">
                  Select one or more rooms to apply.
                </p>
              {/if}
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <h3
            class="text-xl font-bold border-b border-gray-200/50 dark:border-white/10 pb-2 dark:text-white text-gray-800"
          >
            2. Pass Services
          </h3>
          <div>
            <Label class="mb-2">Select Services to let it passthrough</Label>
            <MultiSelect items={urlTemplates} bind:value={selectedProfiles} />
            <p class="text-xs text-gray-500 mt-1">Select services to apply.</p>
          </div>
        </div>

        <div class="space-y-4">
          <h3
            class="text-xl font-bold border-b border-gray-200/50 dark:border-white/10 pb-2 dark:text-white text-gray-800"
          >
            3. Schedule
          </h3>
          <div class="flex flex-wrap gap-4 items-end">
            <div class="flex flex-col gap-2">
              <Label>Date</Label>
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
                        : "Select date"}
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
          <form
            method="POST"
            action="?/createPolicy"
            use:enhance={({ cancel, formData }) => {
              // Client-side validation
              if (policyName.trim() === "") {
                alert("Please enter a valid policy name.");
                cancel();
                return;
              }
              if (!/^[A-Za-z0-9 ]+$/.test(policyName)) {
                alert(
                  "Policy name must contain only English letters, numbers, and spaces.",
                );
                cancel();
                return;
              }
              if (policyName.length > 17) {
                alert("Policy name must not exceed 17 characters.");
                cancel();
                return;
              }
              if (!srcRooms || srcRooms.length === 0) {
                alert(
                  "Please select at least one room.\n\nAt least one source address must be specified.",
                );
                cancel();
                return;
              }
              if (!dateValue || !startTime || !endTime) {
                alert("Please complete the schedule fields.");
                cancel();
                return;
              }
              if (startTime >= endTime) {
                alert("Start time must be before end time.");
                cancel();
                return;
              }

              // Build and attach payload
              const payload = buildPolicyPayload();
              formData.set("policyData", JSON.stringify(payload));

              isDeploying = true;

              return async ({ result, update }) => {
                await update();
                isDeploying = false;

                if (result.type === "redirect") {
                  // Success - will redirect to /active
                  alert("Policy created successfully!");
                } else if (result.type === "failure") {
                  alert(result.data?.error || "Failed to create policy");
                } else if (result.type === "error") {
                  alert("An unexpected error occurred. Please try again.");
                }
              };
            }}
          >
            <Button
              type="submit"
              class="w-full text-lg h-14 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 hover:-translate-y-0.5 mt-4"
              disabled={isDeploying || srcRooms.length === 0}
            >
              {#if isDeploying}
                <Loader2 class="mr-2 h-5 w-5 animate-spin" />
                Deploying Configuration...
              {:else}
                <span class="font-bold">Deploy Configuration</span>
              {/if}
            </Button>
          </form>
        </div>
      </div>
    {:else}
      <div
        class="relative z-10 text-center p-10 bg-white/60 dark:bg-[#0f1420]/80 backdrop-blur-xl rounded-[2rem] border border-white/40 dark:border-white/5 shadow-2xl max-w-4xl w-full"
      >
        <h2 class="text-2xl font-bold mb-2 dark:text-white">Access Denied</h2>
        <p class="text-gray-600 dark:text-gray-400">
          You do not have permission to access this page.
        </p>
      </div>
    {/if}
  {:else}
    <div
      class="relative z-10 text-center p-10 bg-white/60 dark:bg-[#0f1420]/80 backdrop-blur-xl rounded-[2rem] border border-white/40 dark:border-white/5 shadow-2xl max-w-4xl w-full"
    >
      <h2 class="text-2xl font-bold mb-2 dark:text-white">Access Denied</h2>
      <p class="text-gray-600 dark:text-gray-400">
        Please log in to configure firewall policies.
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
