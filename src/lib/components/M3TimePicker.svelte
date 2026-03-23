<script lang="ts">
  import { fade } from "svelte/transition";

  // Props
  let {
    hour = $bindable("00"),
    minute = $bindable("00"),
    label = "Select time",
  }: {
    hour: string;
    minute: string;
    label?: string;
  } = $props();

  let showPicker = $state(false);
  let mode = $state<"hour" | "minute">("hour");
  let containerEl = $state<HTMLDivElement | null>(null);

  const hours = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0"),
  );
  const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

  function selectHour(h: string) {
    hour = h;
    // Stay open and advance to minute selection
    mode = "minute";
  }

  function selectMinute(m: string) {
    minute = m;
    showPicker = false;
    mode = "hour";
  }

  function closePicker() {
    showPicker = false;
    mode = "hour";
  }

  function handleClickOutside(e: MouseEvent) {
    if (containerEl && !e.composedPath().includes(containerEl)) {
      closePicker();
    }
  }

  $effect(() => {
    if (showPicker) {
      // Use setTimeout to avoid the opening click from immediately triggering close
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
  <!-- Trigger: M3 Input-style time display -->
  <div class="flex items-center gap-0.5">
    <button
      type="button"
      onclick={() => {
        if (showPicker && mode === "hour") closePicker();
        else {
          showPicker = true;
          mode = "hour";
        }
      }}
      class="flex items-center justify-center w-[58px] h-[48px] rounded-lg text-2xl font-medium transition-all duration-200 cursor-pointer
        {showPicker && mode === 'hour'
        ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500'
        : 'bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/15'}"
    >
      {hour}
    </button>
    <span class="text-2xl font-bold text-gray-400 dark:text-gray-500 mx-0.5">:</span>
    <button
      type="button"
      onclick={() => {
        if (showPicker && mode === "minute") closePicker();
        else {
          showPicker = true;
          mode = "minute";
        }
      }}
      class="flex items-center justify-center w-[58px] h-[48px] rounded-lg text-2xl font-medium transition-all duration-200 cursor-pointer
        {showPicker && mode === 'minute'
        ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500'
        : 'bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/15'}"
    >
      {minute}
    </button>
  </div>

  <!-- Picker Popup -->
  {#if showPicker}
    <div
      transition:fade={{ duration: 120 }}
      class="absolute bottom-full left-0 mb-2 z-50 bg-white dark:bg-[#1a1f2e] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl p-4 min-w-[280px]"
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <div class="flex gap-1">
          <button
            type="button"
            onclick={() => (mode = "hour")}
            class="px-2.5 py-1 text-xs font-semibold rounded-md transition-all duration-150
              {mode === 'hour'
              ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}"
          >
            Hour
          </button>
          <button
            type="button"
            onclick={() => (mode = "minute")}
            class="px-2.5 py-1 text-xs font-semibold rounded-md transition-all duration-150
              {mode === 'minute'
              ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}"
          >
            Min
          </button>
        </div>
      </div>

      <!-- Hour Grid -->
      {#if mode === "hour"}
        <div class="grid grid-cols-6 gap-1">
          {#each hours as h}
            <button
              type="button"
              onclick={() => selectHour(h)}
              class="w-10 h-10 rounded-full text-sm font-medium transition-all duration-150 flex items-center justify-center
                {hour === h
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}"
            >
              {h}
            </button>
          {/each}
        </div>
      {:else}
        <!-- Minute Grid -->
        <div class="grid grid-cols-4 gap-1.5">
          {#each minutes as m}
            <button
              type="button"
              onclick={() => selectMinute(m)}
              class="h-10 rounded-full text-sm font-medium transition-all duration-150 flex items-center justify-center
                {minute === m
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}"
            >
              {m}
            </button>
          {/each}
        </div>
      {/if}

    </div>
  {/if}
</div>
