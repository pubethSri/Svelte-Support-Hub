<script lang="ts">
  import LoginCard from "$lib/LoginCard.svelte";
  import { userState } from "$lib/userState.svelte";
  import { goto } from "$app/navigation";
  import { Modal } from "flowbite-svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import icon from "$lib/assets/img/it-logo.png";
  import loaderFull from "$lib/loader/loader_full.webp";
  import Shield from "@lucide/svelte/icons/shield";
  import Clock from "@lucide/svelte/icons/clock";
  import Zap from "@lucide/svelte/icons/zap";
  import { fade } from "svelte/transition";

  let showLoginModal = $state(false);
  let isNavigating = $state(false);

  function handleLoginSuccess(userData: any) {
    userState.set(userData);
    showLoginModal = false;
    // Redirect to policy creation page after successful login
    goto("/creation");
  }

  async function handleGoToDashboard() {
    isNavigating = true;
    await goto("/active");
    // Navigation complete (this might not execute if page unloads)
    isNavigating = false;
  }
</script>

<svelte:head>
  <title>Welcome | ITSupportHub</title>
  <link rel="icon" href={icon} />
</svelte:head>

<div
  class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950"
>
  <!-- Hero Section -->
  <div class="container mx-auto px-4 py-20">
    <div class="max-w-4xl mx-auto text-center">
      <!-- Logo -->
      <div class="mb-8">
        <img src={icon} alt="IT Logo" class="h-24 w-24 mx-auto" />
      </div>

      <!-- Main Heading -->
      <h1
        class="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6"
      >
        Welcome to <span class="text-blue-600 dark:text-blue-400"
          >IT Support Hub</span
        >
      </h1>

      <!-- Subheading -->
      <p
        class="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto"
      >
        Manage your network policies, control firewall configurations, and
        monitor your infrastructure with ease.
      </p>

      <!-- CTA Button -->
      {#if userState.value}
        <!-- User is logged in - go to active page -->
        <Button
          size="lg"
          onclick={handleGoToDashboard}
          disabled={isNavigating}
          class="text-lg px-8 py-6 h-auto bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isNavigating ? "Loading..." : "Go to Dashboard"}
        </Button>
      {:else}
        <!-- User not logged in - show login modal -->
        <Button
          size="lg"
          onclick={() => (showLoginModal = true)}
          class="text-lg px-8 py-6 h-auto bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Get Started - Login
        </Button>
      {/if}

      <!-- Features -->
      <div class="grid md:grid-cols-3 gap-8 mt-20">
        <div
          class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700"
        >
          <div class="flex justify-center mb-4">
            <div class="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Shield class="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h3 class="text-xl font-semibold mb-2 dark:text-white">
            Easy Policy Creation
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            Create firewall policies with prepared templates
          </p>
        </div>

        <div
          class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700"
        >
          <div class="flex justify-center mb-4">
            <div class="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
              <Clock class="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <h3 class="text-xl font-semibold mb-2 dark:text-white">
            Scheduled Controls
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            Set time-based policies for exams and special events
          </p>
        </div>

        <div
          class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700"
        >
          <div class="flex justify-center mb-4">
            <div class="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <Zap class="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h3 class="text-xl font-semibold mb-2 dark:text-white">
            Almost Real-time Monitoring
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            Monitor active policies and network status in almost real-time
          </p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Login Modal -->
<Modal
  bind:open={showLoginModal}
  size="xs"
  autoclose={false}
  class="!p-0 !rounded-[24px] overflow-hidden"
  classes={{ body: "p-0" }}
>
  <LoginCard
    onSuccess={handleLoginSuccess}
    onClose={() => (showLoginModal = false)}
  />
</Modal>

<!-- Loading Overlay -->
{#if isNavigating}
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
        Loading Dashboard...
      </h3>
      <p class="text-gray-200 mt-2">Fetching active policies</p>
    </div>
  </div>
{/if}
