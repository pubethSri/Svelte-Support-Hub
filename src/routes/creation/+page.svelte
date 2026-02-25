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

  // Filter out automatically injected templates from the MultiSelect dropdown options
  const hiddenTemplateNames = [
    "google-login",
    "google-drive",
    "default-urlfilter",
  ];
  let availableTemplates: { value: string; name: string }[] = templates
    .filter((t: any) => !hiddenTemplateNames.includes(t.name))
    .map((template: any) => ({ value: template.name, name: template.name }));
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
  class="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 flex flex-col items-center gap-6"
>
  <div class="w-full max-w-4xl flex justify-between items-center">
    <h1 class="text-2xl font-bold dark:text-white">Policy Creation</h1>
  </div>

  {#if userState.value}
    {#if userState.value.isAllowed}
      <div
        class="w-full max-w-4xl bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-8"
      >
        <div class="space-y-4">
          <h3 class="text-lg font-semibold border-b pb-2 dark:text-white">
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
          <h3 class="text-lg font-semibold border-b pb-2 dark:text-white">
            2. Pass Services
          </h3>
          <div>
            <Label class="mb-2">Select Services to let it passthrough</Label>
            <MultiSelect items={urlTemplates} bind:value={selectedProfiles} />
            <p class="text-xs text-gray-500 mt-1">Select services to apply.</p>
          </div>
        </div>

        <div class="space-y-4">
          <h3 class="text-lg font-semibold border-b pb-2 dark:text-white">
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
              class="w-full text-lg h-12 bg-blue-600 hover:bg-blue-700"
              disabled={isDeploying || srcRooms.length === 0}
            >
              {#if isDeploying}
                <Loader2 class="mr-2 h-5 w-5 animate-spin" />
                Deploying...
              {:else}
                Deploy Configuration
              {/if}
            </Button>
          </form>
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
