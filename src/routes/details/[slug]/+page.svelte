<script lang="ts">
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import { fade } from "svelte/transition";
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import Calendar from "@lucide/svelte/icons/calendar";
  import ShieldAlert from "@lucide/svelte/icons/shield-alert";
  import Globe from "@lucide/svelte/icons/globe";
  import Trash from "@lucide/svelte/icons/trash-2";
  import FloppyDisk from "@lucide/svelte/icons/save";
  import Maximize from "@lucide/svelte/icons/maximize";
  import Minimize from "@lucide/svelte/icons/minimize";
  import MoreVertical from "@lucide/svelte/icons/more-vertical";
  import Edit from "@lucide/svelte/icons/edit";
  import AlertCircle from "@lucide/svelte/icons/alert-circle";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import Loader2 from "@lucide/svelte/icons/loader-2";

  // Import your loaders
  import loaderFull from "$lib/loader/loader_full.webp";

  let { data } = $props(); // Data from server

  const { policy, schedule, webfilter } = data;

  // --- LOADER LOGIC ---
  let isDeleting = $state(false);
  let isSaving = $state(false);
  let isRefreshing = $state(false);

  // --- EXPAND/COLLAPSE LOGIC ---
  let isExpanded = $state(false);

  // --- SCHEDULE STATUS ---
  const scheduleStatus = $derived(getTimelyStatus(schedule));

  // --- EDIT SCHEDULE LOGIC ---
  let isEditingSchedule = $state(false);
  let editedStartTime = $state("");
  let editedEndTime = $state("");

  // Track if schedule has been modified
  const hasUnsavedChanges = $derived(
    isEditingSchedule && (editedStartTime !== "" || editedEndTime !== ""),
  );

  // Validate schedule times
  const isScheduleValid = $derived(() => {
    if (!editedStartTime || !editedEndTime) return true; // Don't show error if empty
    const start = new Date(editedStartTime);
    const end = new Date(editedEndTime);
    return start < end;
  });

  // Helper to format dates
  function formatDate(dateStr: string) {
    if (!dateStr) return "N/A";
    // Convert "10:00 2025/12/01" -> Date Object
    const [time, date] = dateStr.split(" ");
    const d = new Date(date);
    return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} at ${time}`;
  }

  // Helper to determine schedule status
  function getTimelyStatus(scheduleData: any) {
    if (policy.status === "disable") return "Disabled";
    if (!scheduleData || !scheduleData.start || !scheduleData.end)
      return "Always Active";

    const now = new Date();
    const [sTime, sDate] = scheduleData.start.split(" ");
    const start = new Date(`${sDate.replace(/\//g, "-")}T${sTime}:00`);
    const [eTime, eDate] = scheduleData.end.split(" ");
    const end = new Date(`${eDate.replace(/\//g, "-")}T${eTime}:00`);

    if (now < start) return "Inactive";
    if (now > end) return "Expired";
    return "Active";
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

  // Helper: Convert datetime-local format to Unix timestamp
  function datetimeToUnix(datetimeStr: string): number {
    return new Date(datetimeStr).getTime() / 1000;
  }

  // Helper: Convert schedule format "HH:MM YYYY/MM/DD" to datetime-local "YYYY-MM-DDTHH:MM"
  function scheduleToDatetimeLocal(scheduleStr: string): string {
    if (!scheduleStr) return "";
    const [time, date] = scheduleStr.split(" ");
    const [year, month, day] = date.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${time}`;
  }

  // Handle Edit button click
  function handleEditSchedule() {
    if (schedule) {
      editedStartTime = scheduleToDatetimeLocal(schedule.start);
      editedEndTime = scheduleToDatetimeLocal(schedule.end);
    }
    isEditingSchedule = true;
  }

  // Handle Cancel edit
  function handleCancelEdit() {
    isEditingSchedule = false;
    editedStartTime = "";
    editedEndTime = "";
  }

  // Handle Refresh
  async function handleRefresh() {
    isRefreshing = true;
    await invalidateAll();
    isRefreshing = false;
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
  {#if isDeleting || isSaving || isRefreshing}
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
        {#if isDeleting}
          <h3 class="text-xl font-bold text-white tracking-wide">
            Deleting Policy...
          </h3>
          <p class="text-gray-200 mt-2">
            Removing <span class="font-mono font-bold text-red-400"
              >{policy.name}</span
            >
          </p>
        {:else if isSaving}
          <h3 class="text-xl font-bold text-white tracking-wide">
            Saving Schedule...
          </h3>
          <p class="text-gray-200 mt-2">
            Updating schedule for <span
              class="font-mono font-bold text-blue-400">{policy.name}</span
            >
          </p>
        {:else if isRefreshing}
          <h3 class="text-xl font-bold text-white tracking-wide">
            Refreshing Data...
          </h3>
          <p class="text-gray-200 mt-2">
            Loading latest information for <span
              class="font-mono font-bold text-green-400">{policy.name}</span
            >
          </p>
        {/if}
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
          variant="outline"
          size="sm"
          onclick={handleRefresh}
          disabled={isRefreshing || isSaving}
          class="flex items-center gap-2"
        >
          {#if isRefreshing}
            <Loader2 class="h-4 w-4 animate-spin" />
          {:else}
            <RefreshCw class="h-4 w-4" />
          {/if}
          Refresh
        </Button>

        {#if hasUnsavedChanges}
          <div
            class="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-sm"
          >
            <AlertCircle class="h-4 w-4" />
            <span>Unsaved changes</span>
          </div>
        {/if}

        {#if hasUnsavedChanges}
          <form
            method="POST"
            action="?/updateSchedule"
            use:enhance={({ cancel }) => {
              // Validate that start time is before end time
              const startDate = new Date(editedStartTime);
              const endDate = new Date(editedEndTime);

              if (!editedStartTime || !editedEndTime) {
                alert("Please select both start and end times.");
                cancel();
                return;
              }

              if (startDate >= endDate) {
                alert(
                  "Error: Start time must be before end time.\n\nPlease adjust your schedule and try again.",
                );
                cancel();
                return;
              }

              // Check if start time is in the past
              const now = new Date();
              if (startDate < now) {
                const confirmPast = confirm(
                  "Warning: The start time is in the past.\n\nDo you want to continue anyway?",
                );
                if (!confirmPast) {
                  cancel();
                  return;
                }
              }

              if (
                !confirm(
                  `Save schedule changes for policy "${policy.name}"?\n\nStart: ${startDate.toLocaleString()}\nEnd: ${endDate.toLocaleString()}`,
                )
              ) {
                cancel();
                return;
              }
              isSaving = true;
              return async ({ result, update }) => {
                await update();
                isSaving = false;

                if (result.type === "success") {
                  alert("Schedule updated successfully!");
                  isEditingSchedule = false;
                  editedStartTime = "";
                  editedEndTime = "";
                  window.location.reload();
                } else if (result.type === "failure") {
                  alert(result.data?.error || "Failed to update schedule");
                }
              };
            }}
          >
            <input
              type="hidden"
              name="scheduleName"
              value={schedule?.name || ""}
            />
            <input
              type="hidden"
              name="startUtc"
              value={datetimeToUnix(editedStartTime).toString()}
            />
            <input
              type="hidden"
              name="endUtc"
              value={datetimeToUnix(editedEndTime).toString()}
            />

            <Button
              size="lg"
              type="submit"
              disabled={isSaving || !isScheduleValid}
              class="cursor-pointer dark:bg-blue-900 text-white dark:hover:bg-blue-800 hover:bg-blue-600 bg-blue-700"
            >
              {#if isSaving}
                <svg
                  class="animate-spin h-5 w-5 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              {:else}
                <FloppyDisk class="w-5 h-5" />
                Save Schedule
              {/if}
            </Button>
          </form>
        {:else}
          <Button
            size="lg"
            disabled={isEditingSchedule}
            class="cursor-pointer dark:bg-blue-900 text-white dark:hover:bg-blue-800 hover:bg-blue-600 bg-blue-700 opacity-50"
          >
            <FloppyDisk class="w-5 h-5" />
            Save Changes
          </Button>
        {/if}

        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10"
          >
            <MoreVertical class="h-5 w-5" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            {#if schedule && !isEditingSchedule}
              <DropdownMenu.Item
                class="cursor-pointer"
                onclick={handleEditSchedule}
              >
                <Edit class="w-4 h-4 mr-2" />
                Edit Schedule
              </DropdownMenu.Item>
            {/if}
            {#if isEditingSchedule}
              <DropdownMenu.Item
                class="cursor-pointer"
                onclick={handleCancelEdit}
              >
                <AlertCircle class="w-4 h-4 mr-2" />
                Cancel Edit
              </DropdownMenu.Item>
            {/if}
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
        <div class="flex items-center justify-between mb-4">
          <h2
            class="text-lg font-semibold flex items-center gap-2 dark:text-white"
          >
            <Calendar class="h-5 w-5 text-purple-500" />
            Schedule
          </h2>
          {#if scheduleStatus === "Active"}
            <div class="flex items-center">
              <div class="h-2.5 w-2.5 rounded-full bg-green-500 mr-2"></div>
              <span
                class="text-green-700 dark:text-green-400 font-medium text-sm"
                >Active</span
              >
            </div>
          {:else if scheduleStatus === "Inactive"}
            <div class="flex items-center">
              <div class="h-2.5 w-2.5 rounded-full bg-yellow-400 mr-2"></div>
              <span
                class="text-yellow-700 dark:text-yellow-400 font-medium text-sm"
                >Inactive</span
              >
            </div>
          {:else if scheduleStatus === "Expired"}
            <div class="flex items-center">
              <div class="h-2.5 w-2.5 rounded-full bg-gray-400 mr-2"></div>
              <span class="text-gray-500 dark:text-gray-400 font-medium text-sm"
                >Expired</span
              >
            </div>
          {:else if scheduleStatus === "Disabled"}
            <div class="flex items-center">
              <div class="h-2.5 w-2.5 rounded-full bg-red-500 mr-2"></div>
              <span class="text-red-700 dark:text-red-400 font-medium text-sm"
                >Disabled</span
              >
            </div>
          {:else}
            <div class="flex items-center">
              <div class="h-2.5 w-2.5 rounded-full bg-blue-500 mr-2"></div>
              <span class="text-blue-700 dark:text-blue-400 font-medium text-sm"
                >Always Active</span
              >
            </div>
          {/if}
        </div>
        {#if schedule}
          {#if isEditingSchedule}
            <div class="space-y-4 text-sm">
              <div class="border-t pt-3 mt-2 dark:border-gray-700">
                <Label
                  for="start-time"
                  class="text-gray-700 dark:text-gray-300 mb-2 block"
                  >Start Time</Label
                >
                <Input
                  id="start-time"
                  type="datetime-local"
                  bind:value={editedStartTime}
                  class="w-full"
                />
              </div>
              <div>
                <Label
                  for="end-time"
                  class="text-gray-700 dark:text-gray-300 mb-2 block"
                  >End Time</Label
                >
                <Input
                  id="end-time"
                  type="datetime-local"
                  bind:value={editedEndTime}
                  class="w-full"
                />
              </div>

              {#if !isScheduleValid}
                <div
                  class="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md"
                >
                  <AlertCircle
                    class="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0"
                  />
                  <p class="text-sm text-red-600 dark:text-red-400">
                    Start time must be before end time
                  </p>
                </div>
              {/if}
            </div>
          {:else}
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
          {/if}
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
