<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";
  import { _ } from "svelte-i18n";

  // Check if this is a redirect-worthy error
  const shouldRedirect = $derived(
    $page.status === 400 || $page.status === 404
  );

  // Auto-redirect to landing page for 400 and 404 errors
  $effect(() => {
    if (browser && shouldRedirect) {
      goto("/", { replaceState: true });
    }
  });
</script>

<!-- Show nothing for 400/404 (instant redirect), only show UI for other errors -->
{#if !shouldRedirect}
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0f1a]">
    <div class="text-center p-8 rounded-2xl bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-xl backdrop-blur-sm max-w-md mx-4">
      <div class="text-6xl font-bold text-gray-300 dark:text-white/20 mb-4">
        {$page.status}
      </div>
      <h1 class="text-xl font-semibold text-gray-800 dark:text-white mb-2">
        {$page.error?.message || "Something went wrong"}
      </h1>
      <p class="text-gray-500 dark:text-gray-400 mb-6">
        An unexpected error occurred. Please try again later.
      </p>
      <a
        href="/"
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors duration-200"
      >
        Go to Home
      </a>
    </div>
  </div>
{/if}
