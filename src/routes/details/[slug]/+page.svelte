<script lang="ts">
  import { enhance } from "$app/forms";
  import { invalidateAll, invalidate } from "$app/navigation";
  import { fade } from "svelte/transition";
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { MultiSelect } from "flowbite-svelte";
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
  import Lock from "@lucide/svelte/icons/lock";
  import CheckCircle from "@lucide/svelte/icons/check-circle";
  import XCircle from "@lucide/svelte/icons/x-circle";

  import defaultUrlFilter from "$lib/data/default-urlfilter.json";

  // Notification state
  let showSuccessToast = $state(false);
  let successMessage = $state("");
  let showErrorModal = $state(false);
  let errorMessage = $state("");
  let successTimeout: ReturnType<typeof setTimeout> | null = null;

  function showSuccess(msg: string) {
    successMessage = msg;
    showSuccessToast = true;
    if (successTimeout) clearTimeout(successTimeout);
    successTimeout = setTimeout(() => {
      showSuccessToast = false;
    }, 2500);
  }

  function showError(msg: string) {
    errorMessage = msg;
    showErrorModal = true;
  }

  // Import your loaders
  import loaderFull from "$lib/loader/loader_full.webp";

  let { data } = $props(); // Data from server

  // Use $derived to make these reactive to data changes
  const policy = $derived(data.policy);
  const schedule = $derived(data.schedule);
  const webfilter = $derived(data.webfilter);

  // --- LOADER LOGIC ---
  let isDeleting = $state(false);
  let isSaving = $state(false);
  let isRefreshing = $state(false);

  // --- DELETE CONFIRMATION MODAL ---
  let showDeleteModal = $state(false);
  let deleteFormRef = $state<HTMLFormElement | null>(null);
  let deleteConfirmText = $state("");

  // --- URL FILTER EDIT ---
  let isEditingUrlFilter = $state(false);
  let isSavingUrlFilter = $state(false);
  let newUrl = $state("");
  let newUrlType = $state<"simple" | "wildcard">("simple");
  // Local copy of entries with pending additions
  let pendingEntries = $state<any[]>([]);

  function startUrlFilterEdit() {
    pendingEntries = webfilter?.entries ? [...webfilter.entries] : [];
    isEditingUrlFilter = true;
  }

  function cancelUrlFilterEdit() {
    isEditingUrlFilter = false;
    newUrl = "";
    newUrlType = "simple";
    pendingEntries = [];
  }

  function addUrlEntry() {
    if (!newUrl.trim()) return;
    const newEntry = {
      id: 0,
      url: newUrl.trim(),
      type: newUrlType,
      action: "monitor",
    };
    pendingEntries = [newEntry, ...pendingEntries];
    newUrl = "";
    newUrlType = "simple";
  }

  function removeUrlEntry(idx: number) {
    if (isDefaultUrl(pendingEntries[idx].url)) return;
    pendingEntries = pendingEntries.filter((_, i) => i !== idx);
  }

  function isDefaultUrl(url: string) {
    // Treat any URL found in the default list as un-removable
    return defaultUrlFilter.urlfilter.some((d: any) => d.url === url);
  }

  // --- EXPAND/COLLAPSE LOGIC ---
  let isExpanded = $state(false);

  // --- SCHEDULE STATUS ---
  const scheduleStatus = $derived(getTimelyStatus(schedule));

  // --- EDIT LOGIC ---
  let isEditing = $state(false);

  // Schedule editing
  let editedStartTime = $state("");
  let editedEndTime = $state("");
  let originalStartTime = $state("");
  let originalEndTime = $state("");

  // Source address editing
  let editedSrcRooms = $state<string[]>([]);
  let originalSrcRooms = $state<string[]>([]);

  // Available room options
  const availableRooms = [203, 205, 207, 304, 306, 308, 428, 434].map(
    (room) => ({
      value: room.toString(),
      name: room.toString(),
    }),
  );

  // Track if anything has been modified from original values
  const hasUnsavedChanges = $derived(
    isEditing &&
      (editedStartTime !== originalStartTime ||
        editedEndTime !== originalEndTime ||
        JSON.stringify([...editedSrcRooms].sort()) !==
          JSON.stringify([...originalSrcRooms].sort())),
  );

  // Validate schedule times
  const isScheduleValid = $derived(
    !editedStartTime ||
      !editedEndTime ||
      new Date(editedStartTime) < new Date(editedEndTime),
  );

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
  function handleEdit() {
    if (schedule) {
      const startLocal = scheduleToDatetimeLocal(schedule.start);
      const endLocal = scheduleToDatetimeLocal(schedule.end);

      editedStartTime = startLocal;
      editedEndTime = endLocal;

      // Store originals for change detection
      originalStartTime = startLocal;
      originalEndTime = endLocal;
    }

    // Extract room numbers from srcaddr names
    // Format: "[Subnet]Lab 304 - VLAN 304" -> "304"
    const roomNumbers = policy.srcaddr
      .map((addr: { name: string }) => {
        const match = addr.name.match(/Lab (\d+)/);
        return match ? match[1] : null;
      })
      .filter((room: string | null): room is string => room !== null);

    editedSrcRooms = roomNumbers;
    originalSrcRooms = [...roomNumbers];

    isEditing = true;
  }

  // Handle Cancel edit
  function handleCancelEdit() {
    isEditing = false;
    editedStartTime = "";
    editedEndTime = "";
    originalStartTime = "";
    originalEndTime = "";
    editedSrcRooms = [];
    originalSrcRooms = [];
  }

  // Handle Refresh
  async function handleRefresh() {
    // Warn if there are unsaved changes
    if (hasUnsavedChanges) {
      const confirmed = confirm(
        "You have unsaved schedule changes.\n\nRefreshing will discard your changes. Continue?",
      );
      if (!confirmed) return;
    }

    isRefreshing = true;

    // Exit edit mode if currently editing
    if (isEditing) {
      isEditing = false;
      editedStartTime = "";
      editedEndTime = "";
    }

    // Invalidate specific dependency to force fresh fetch
    await invalidate("policy:details");
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
  class="relative min-h-screen bg-[#fafafa] dark:bg-[#05080f] overflow-hidden selection:bg-orange-500/30 font-sans flex flex-col items-center gap-6 md:gap-8 px-4 md:px-8 pt-24 md:pt-32 pb-8"
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
    class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-200 {isDeleting ||
    isSaving ||
    isRefreshing
      ? 'opacity-100 pointer-events-auto'
      : 'opacity-0 pointer-events-none'}"
  >
    <img
      src={loaderFull}
      alt="Loading"
      class="pointer-events-none object-contain w-[80vw] md:w-96 h-auto max-h-[80vh] relative z-10"
    />
  </div>

  <div class="w-full max-w-4xl space-y-6 relative z-10">
    <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div class="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          href="/dashboard"
          class="hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
        >
          <ArrowLeft class="h-6 w-6" />
        </Button>
        <div class="min-w-0">
          <h1
            class="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white drop-shadow-sm truncate"
          >
            {policy.name}
          </h1>
          <span
            class={`inline-flex items-center px-3 py-1 mt-1 rounded-full text-xs font-bold shadow-sm ${policy.status === "enable" ? "bg-green-100/80 text-green-800 border border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800" : "bg-red-100/80 text-red-800 border border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800"}`}
          >
            {policy.status.toUpperCase()}
          </span>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-wrap sm:ml-auto">
        <Button
          variant="outline"
          size="sm"
          onclick={handleRefresh}
          disabled={isRefreshing || isSaving}
          class="flex items-center gap-2 rounded-full border-gray-300 dark:border-white/20 bg-white/50 dark:bg-black/50 backdrop-blur-md hover:bg-orange-50 dark:hover:bg-white/10 dark:text-white transition-all duration-300 shadow-sm"
        >
          {#if isRefreshing}
            <Loader2
              class="h-4 w-4 animate-spin text-orange-500 dark:text-pink-400"
            />
          {:else}
            <RefreshCw class="h-4 w-4 text-orange-500 dark:text-pink-400" />
          {/if}
          <span
            class="hidden sm:inline font-semibold text-gray-800 dark:text-gray-100"
            >Refresh</span
          >
        </Button>

        {#if hasUnsavedChanges}
          <div
            class="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs sm:text-sm font-bold bg-orange-100 dark:bg-orange-900/30 px-2 sm:px-3 py-1 rounded-full shadow-sm"
          >
            <AlertCircle class="h-4 w-4 flex-shrink-0" />
            <span class="whitespace-nowrap">Unsaved</span>
          </div>
        {/if}

        {#if hasUnsavedChanges}
          <form
            method="POST"
            action="?/updatePolicy"
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

              // Validate source addresses
              if (!editedSrcRooms || editedSrcRooms.length === 0) {
                alert(
                  "Error: At least one source address (room) must be selected.\n\nPlease select one or more rooms.",
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
                  `Save policy changes for "${policy.name}"?\n\nStart: ${startDate.toLocaleString()}\nEnd: ${endDate.toLocaleString()}\nRooms: ${editedSrcRooms.join(", ")}`,
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
                  showSuccess("Policy updated successfully!");
                  isEditing = false;
                  editedStartTime = "";
                  editedEndTime = "";
                  editedSrcRooms = [];
                  originalSrcRooms = [];
                  setTimeout(() => invalidate("policy:details"), 500);
                } else if (result.type === "failure") {
                  showError(
                    (result.data as any)?.error || "Failed to update policy",
                  );
                }
              };
            }}
          >
            <input type="hidden" name="policyName" value={policy.name} />
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
            <input
              type="hidden"
              name="srcRooms"
              value={JSON.stringify(editedSrcRooms)}
            />
            <input
              type="hidden"
              name="scheduleChanged"
              value={editedStartTime !== originalStartTime ||
              editedEndTime !== originalEndTime
                ? "true"
                : "false"}
            />
            <input
              type="hidden"
              name="srcAddrChanged"
              value={JSON.stringify([...editedSrcRooms].sort()) !==
              JSON.stringify([...originalSrcRooms].sort())
                ? "true"
                : "false"}
            />

            <Button
              size="lg"
              type="submit"
              disabled={isSaving ||
                !isScheduleValid ||
                editedSrcRooms.length === 0}
              class="cursor-pointer bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 shadow-lg shadow-orange-500/25 text-white rounded-full transition-all duration-300"
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
                Save Changes
              {/if}
            </Button>
          </form>
        {:else}
          <Button
            size="lg"
            disabled={isEditing}
            class="cursor-pointer bg-gradient-to-r from-orange-500 to-pink-500 text-white opacity-50 rounded-full"
          >
            <FloppyDisk class="w-5 h-5 mr-2" />
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
            {#if schedule && !isEditing}
              <DropdownMenu.Item class="cursor-pointer" onclick={handleEdit}>
                <Edit class="w-4 w-4 mr-2" />
                Edit Policy
              </DropdownMenu.Item>
            {/if}
            {#if isEditing}
              <DropdownMenu.Item
                class="cursor-pointer"
                onclick={handleCancelEdit}
              >
                <AlertCircle class="w-4 h-4 mr-2" />
                Cancel Edit
              </DropdownMenu.Item>
            {/if}
            <DropdownMenu.Item
              class="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950 cursor-pointer"
              disabled={isDeleting}
              onkeydown={(e: KeyboardEvent) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  showDeleteModal = true;
                }
              }}
              onclick={(e) => {
                e.preventDefault();
                showDeleteModal = true;
              }}
            >
              <Trash class="w-4 h-4 mr-2" />
              Delete Policy
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </div>

    <!-- Hidden delete form — lives outside the dropdown so it stays in DOM -->
    <form
      method="POST"
      action="?/delete"
      bind:this={deleteFormRef}
      use:enhance={() => {
        isDeleting = true;
        return async ({ update }) => {
          await update();
          isDeleting = false;
        };
      }}
      class="hidden"
    ></form>

    <div class="grid gap-6 md:grid-cols-2">
      <div
        class="relative z-10 bg-white/70 dark:bg-[#0f1420]/80 backdrop-blur-xl rounded-2xl md:rounded-[2rem] border border-white/40 dark:border-white/5 shadow-2xl p-4 sm:p-6 md:p-8"
      >
        <h2
          class="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-white"
        >
          <ShieldAlert class="h-5 w-5 text-blue-500" />
          General Info
        </h2>
        <dl class="space-y-3 text-sm">
          <div class="flex flex-col gap-0.5">
            <dt class="text-gray-500">ID</dt>
            <dd class="font-medium dark:text-white">{policy.policyid}</dd>
          </div>
          <div class="flex flex-col gap-0.5">
            <dt class="text-gray-500">Source Address</dt>
            {#if isEditing}
              <dd class="font-medium dark:text-white w-full">
                <MultiSelect
                  items={availableRooms}
                  bind:value={editedSrcRooms}
                />
                {#if editedSrcRooms.length === 0}
                  <p class="text-xs text-red-600 dark:text-red-400 mt-1">
                    ⚠️ At least one room must be selected
                  </p>
                {:else}
                  <p class="text-xs text-gray-500 mt-1">
                    Select one or more rooms
                  </p>
                {/if}
              </dd>
            {:else if policy.srcaddr.length > 0}
              <dd class="font-medium dark:text-white">
                {formatAddr(policy.srcaddr)}
              </dd>
            {:else}
              <dd class="font-medium dark:text-white">--</dd>
            {/if}
          </div>
          <div class="flex flex-col gap-0.5">
            <dt class="text-gray-500">Destination Address</dt>
            {#if policy.dstaddr.length > 0}
              {#each policy.dstaddr as dst}
                <dd class="font-medium dark:text-white break-all">
                  {dst.name}
                </dd>
              {/each}
            {:else}
              <dd class="font-medium dark:text-white">--</dd>
            {/if}
          </div>
          <div class="flex flex-col gap-0.5">
            <dt class="text-gray-500">Action</dt>
            <dd class="font-medium dark:text-white">{policy.action}</dd>
          </div>
        </dl>
      </div>

      <div
        class="relative z-10 bg-white/70 dark:bg-[#0f1420]/80 backdrop-blur-xl rounded-2xl md:rounded-[2rem] border border-white/40 dark:border-white/5 shadow-2xl p-4 sm:p-6 md:p-8 overflow-hidden"
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
          {#if isEditing}
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
        class="relative z-10 md:col-span-2 bg-white/70 dark:bg-[#0f1420]/80 backdrop-blur-xl rounded-2xl md:rounded-[2rem] border border-white/40 dark:border-white/5 shadow-2xl p-4 sm:p-6 md:p-8"
      >
        <div
          class="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2"
        >
          <h2
            class="text-lg font-semibold flex items-center gap-2 dark:text-white"
          >
            <Globe class="h-5 w-5 text-orange-500" />
            Web Filter Rules
          </h2>
          <div class="flex gap-2 flex-wrap">
            {#if webfilter && webfilter.entries && webfilter.entries.length > 5 && !isEditingUrlFilter}
              <Button
                variant="outline"
                size="sm"
                onclick={() => (isExpanded = !isExpanded)}
                class="flex items-center gap-2"
              >
                {#if isExpanded}
                  <Minimize class="h-4 w-4" /> Collapse
                {:else}
                  <Maximize class="h-4 w-4" /> Expand
                {/if}
              </Button>
            {/if}
            {#if !isEditingUrlFilter}
              <Button
                variant="outline"
                size="sm"
                onclick={startUrlFilterEdit}
                class="flex items-center gap-2"
              >
                <Edit class="h-4 w-4" /> Edit Rules
              </Button>
            {:else}
              <Button
                variant="outline"
                size="sm"
                onclick={cancelUrlFilterEdit}
                class="flex items-center gap-2"
              >
                <AlertCircle class="h-4 w-4" /> Cancel
              </Button>
            {/if}
          </div>
        </div>

        {#if isEditingUrlFilter}
          <!-- Add entry form -->
          <div class="flex gap-2 mb-4 items-end flex-wrap">
            <div class="flex flex-col gap-1 flex-1 min-w-[200px]">
              <Label class="text-xs text-gray-500">URL / Pattern</Label>
              <Input
                type="text"
                placeholder="e.g. example.com or *.example.com"
                bind:value={newUrl}
                class="h-9 text-sm"
                onkeydown={(e: KeyboardEvent) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addUrlEntry();
                  }
                }}
              />
            </div>
            <div class="flex flex-col gap-1">
              <Label class="text-xs text-gray-500">Type</Label>
              <select
                bind:value={newUrlType}
                class="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="simple">simple</option>
                <option value="wildcard">wildcard</option>
              </select>
            </div>
            <Button
              size="sm"
              onclick={addUrlEntry}
              disabled={!newUrl.trim()}
              class="h-9"
            >
              <Globe class="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          <!-- Pending entries table -->
          <div
            class="overflow-x-auto max-h-80 overflow-y-auto mb-4 rounded-xl border border-gray-200 dark:border-white/10"
          >
            <table
              class="w-full text-sm text-left text-gray-500 dark:text-gray-400"
            >
              <thead
                class="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-[#1a2133] dark:text-gray-300 sticky top-0 z-10 shadow-sm"
              >
                <tr>
                  <th class="px-2 sm:px-4 py-2 text-xs">URL / Pattern</th>
                  <th class="px-2 sm:px-4 py-2 text-xs">Type</th>
                  <th class="px-2 sm:px-4 py-2 text-xs">Action</th>
                  <th class="px-2 sm:px-4 py-2 text-xs">Remove</th>
                </tr>
              </thead>
              <tbody>
                {#each pendingEntries as entry, i}
                  <tr
                    class="bg-transparent border-b border-gray-100 dark:border-white/5 {i ===
                      0 &&
                    entry.action === 'monitor' &&
                    !webfilter?.entries?.find((e: any) => e.url === entry.url)
                      ? 'bg-green-50/50 dark:bg-green-900/10'
                      : 'hover:bg-white/50 dark:hover:bg-white/5'} transition-colors duration-200"
                  >
                    <td
                      class="px-2 sm:px-4 py-2 font-medium text-gray-900 dark:text-white break-all text-xs sm:text-sm"
                      >{entry.url}</td
                    >
                    <td class="px-2 sm:px-4 py-2 text-xs sm:text-sm"
                      >{entry.type}</td
                    >
                    <td class="px-2 sm:px-4 py-2">
                      <span
                        class="px-2 py-0.5 rounded text-xs border {entry.action ===
                        'block'
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : 'bg-green-50 text-green-600 border-green-200'}"
                      >
                        {entry.action}
                      </span>
                    </td>
                    <td class="px-2 sm:px-4 py-2">
                      {#if isDefaultUrl(entry.url)}
                        <span
                          title="Default URL filter cannot be removed"
                          class="text-gray-400 inline-flex items-center"
                        >
                          <Lock class="w-4 h-4" />
                        </span>
                      {:else}
                        <button
                          type="button"
                          onclick={() => removeUrlEntry(i)}
                          class="text-red-500 hover:text-red-700 text-xs"
                        >
                          ✕
                        </button>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          <!-- Save form -->
          <form
            method="POST"
            action="?/updateUrlFilter"
            use:enhance={({ formData, cancel }) => {
              if (pendingEntries.length === 0) {
                cancel();
                return;
              }
              formData.set("urlFilterId", String(webfilter?.id ?? ""));
              formData.set("policyName", policy.name);
              formData.set("entries", JSON.stringify(pendingEntries));
              isSavingUrlFilter = true;
              return async ({ result, update }) => {
                await update();
                isSavingUrlFilter = false;
                if (result.type === "success") {
                  showSuccess("URL filter updated successfully!");
                  isEditingUrlFilter = false;
                  pendingEntries = [];
                  await invalidate("policy:details");
                } else {
                  showError(
                    (result as any).data?.error ?? "Failed to save URL filter",
                  );
                }
              };
            }}
          >
            <Button
              type="submit"
              class="w-full bg-orange-500 hover:bg-orange-600 text-white"
              disabled={isSavingUrlFilter || pendingEntries.length === 0}
            >
              {#if isSavingUrlFilter}
                <Loader2 class="h-4 w-4 mr-2 animate-spin" /> Saving...
              {:else}
                <FloppyDisk class="h-4 w-4 mr-2" /> Save URL Filter
              {/if}
            </Button>
          </form>
        {:else}
          <!-- Read-only view -->
          {#if webfilter && webfilter.entries}
            <div
              class="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10 {isExpanded
                ? ''
                : 'max-h-80 overflow-y-auto'} transition-all duration-300"
            >
              <table
                class="w-full text-sm text-left text-gray-500 dark:text-gray-400"
              >
                <thead
                  class="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-[#1a2133] dark:text-gray-300 sticky top-0 z-10 shadow-sm"
                >
                  <tr>
                    <th class="px-2 sm:px-4 py-2 text-xs">URL / Pattern</th>
                    <th class="px-2 sm:px-4 py-2 text-xs">Type</th>
                    <th class="px-2 sm:px-4 py-2 text-xs">Action</th>
                    <th class="px-2 sm:px-4 py-2 text-xs">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {#each webfilter.entries as entry}
                    <tr
                      class="bg-transparent border-b border-gray-100 dark:border-white/5 hover:bg-white/50 dark:hover:bg-white/5 transition-colors duration-200"
                    >
                      <td
                        class="px-2 sm:px-4 py-2 font-medium text-gray-900 dark:text-white break-all text-xs sm:text-sm"
                        >{entry.url}</td
                      >
                      <td class="px-2 sm:px-4 py-2 text-xs sm:text-sm"
                        >{entry.type}</td
                      >
                      <td class="px-2 sm:px-4 py-2">
                        <span
                          class="px-2 py-0.5 rounded text-xs border {entry.action ===
                          'block'
                            ? 'bg-red-50 text-red-600 border-red-200'
                            : 'bg-green-50 text-green-600 border-green-200'}"
                        >
                          {entry.action}
                        </span>
                      </td>
                      <td class="px-2 sm:px-4 py-2 text-xs sm:text-sm"
                        >{entry.status}</td
                      >
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else}
            <p class="text-gray-500 italic">No webfilter rules configured.</p>
          {/if}
        {/if}
      </div>
    </div>
  </div>
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteModal}
  <div
    transition:fade={{ duration: 150 }}
    class="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="delete-modal-title"
  >
    <div
      class="relative bg-white/90 dark:bg-[#0f1420]/95 backdrop-blur-2xl rounded-[2rem] border border-white/40 dark:border-white/10 shadow-2xl w-full max-w-md p-6 flex flex-col gap-5"
    >
      <!-- Icon + Title -->
      <div class="flex items-start gap-4">
        <div
          class="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center"
        >
          <Trash class="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h2
            id="delete-modal-title"
            class="text-lg font-semibold text-gray-900 dark:text-white"
          >
            Delete Policy
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            This action <span
              class="font-semibold text-red-600 dark:text-red-400"
              >cannot be undone</span
            >. The following policy and all associated schedules and web filters
            will be permanently deleted.
          </p>
        </div>
      </div>

      <!-- Policy name highlight -->
      <div
        class="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3"
      >
        <p
          class="text-xs font-medium text-red-600 dark:text-red-400 mb-1 uppercase tracking-wide"
        >
          Policy Name
        </p>
        <p
          class="font-mono text-sm font-semibold text-gray-900 dark:text-white break-all"
        >
          {policy.name}
        </p>
      </div>

      <!-- Confirmation Input -->
      <div class="flex flex-col gap-1.5">
        <Label class="text-sm text-gray-600 dark:text-gray-400">
          Type <span
            class="font-mono font-bold tracking-widest text-red-600 dark:text-red-400"
            >DELETE</span
          > to confirm
        </Label>
        <Input
          type="text"
          placeholder="DELETE"
          bind:value={deleteConfirmText}
          class="font-mono {deleteConfirmText === 'DELETE'
            ? 'border-red-500 focus-visible:ring-red-500'
            : ''}"
          autocomplete="off"
        />
      </div>

      <!-- Actions -->
      <div class="flex gap-3 justify-between">
        <Button
          variant="outline"
          onclick={() => {
            showDeleteModal = false;
            deleteConfirmText = "";
          }}
          disabled={isDeleting}
          class="min-w-[90px]"
        >
          Cancel
        </Button>
        <Button
          class="min-w-[120px] bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
          disabled={isDeleting || deleteConfirmText !== "DELETE"}
          onclick={() => {
            showDeleteModal = false;
            deleteConfirmText = "";
            deleteFormRef?.requestSubmit();
          }}
        >
          {#if isDeleting}
            <Loader2 class="w-4 h-4 mr-2 animate-spin" />
            Deleting...
          {:else}
            <Trash class="w-4 h-4 mr-2" />
            Yes, Delete
          {/if}
        </Button>
      </div>
    </div>
  </div>
{/if}

<!-- Success Toast (auto-dismiss) -->
{#if showSuccessToast}
  <div
    transition:fade={{ duration: 200 }}
    class="fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-4 rounded-2xl bg-green-50/95 dark:bg-green-950/95 border border-green-200 dark:border-green-800 shadow-2xl backdrop-blur-xl max-w-sm"
  >
    <div
      class="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/60 flex items-center justify-center"
    >
      <CheckCircle class="w-5 h-5 text-green-600 dark:text-green-400" />
    </div>
    <div>
      <p class="text-sm font-semibold text-green-800 dark:text-green-200">
        Success
      </p>
      <p class="text-xs text-green-600 dark:text-green-400 mt-0.5">
        {successMessage}
      </p>
    </div>
    <!-- Shrinking progress bar -->
    <div
      class="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl overflow-hidden"
    >
      <div
        class="h-full bg-green-500/60 dark:bg-green-400/60"
        style="animation: shrink 2.5s linear forwards"
      ></div>
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
          Operation Failed
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
