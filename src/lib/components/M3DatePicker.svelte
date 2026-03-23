<script lang="ts">
  import { fade } from "svelte/transition";
  import { getLocalTimeZone, type CalendarDate } from "@internationalized/date";
  import CalendarIcon from "@lucide/svelte/icons/calendar";
  import Calendar from "$lib/components/ui/calendar/calendar.svelte";

  let {
    dateValue = $bindable(),
    label = "Select date",
  }: {
    dateValue: CalendarDate | undefined;
    label?: string;
  } = $props();

  let showPicker = $state(false);
  let containerEl = $state<HTMLDivElement | null>(null);

  // Derive the formatted display string
  const displayDate = $derived(
    dateValue 
      ? dateValue.toDate(getLocalTimeZone()).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' }) 
      : "Select date"
  );

  const displayYear = $derived(
    dateValue ? dateValue.toDate(getLocalTimeZone()).getFullYear() : new Date().getFullYear()
  );

  function closePicker() {
    showPicker = false;
  }

  function handleClickOutside(e: MouseEvent) {
    if (containerEl && !e.composedPath().includes(containerEl)) {
      closePicker();
    }
  }

  $effect(() => {
    if (showPicker) {
      const timer = setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener("click", handleClickOutside);
      };
    }
  });
</script>

<div class="relative" bind:this={containerEl}>
  <!-- Trigger Button -->
  <button
    type="button"
    onclick={() => (showPicker = !showPicker)}
    class="flex items-center gap-3 w-[200px] h-[48px] px-4 rounded-lg text-left font-medium transition-all duration-200 cursor-pointer
      {showPicker
      ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500'
      : 'bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/15'}"
  >
    <CalendarIcon class="h-5 w-5 opacity-70" />
    <span class="text-base truncate flex-1">{displayDate}</span>
  </button>

  <!-- M3 Style Picker Popup -->
  {#if showPicker}
    <div
      transition:fade={{ duration: 120 }}
      class="absolute bottom-full left-0 mb-2 z-50 bg-white dark:bg-[#1a1f2e] rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl min-w-[320px] overflow-hidden flex flex-col"
    >
      <!-- M3 Header Section -->
      <div class="bg-purple-50 dark:bg-purple-900/20 p-6 border-b border-gray-100 dark:border-white/5 flex flex-col gap-1">
        <span class="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">
          {label}
        </span>
        <div class="flex flex-col">
          <span class="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mt-1">
            {displayDate}
          </span>
          <span class="text-base font-medium text-gray-500 dark:text-gray-400 mt-1">
            {displayYear}
          </span>
        </div>
      </div>

      <!-- Calendar Body -->
      <div class="p-4 flex justify-center bg-white dark:bg-[#1a1f2e]">
        <Calendar 
          type="single" 
          bind:value={dateValue} 
          onValueChange={(val) => {
            if (val) setTimeout(() => showPicker = false, 150);
          }}
          class="border-0 shadow-none bg-transparent dark:bg-transparent scale-105 origin-center my-2" 
        />
      </div>
    </div>
  {/if}
</div>
