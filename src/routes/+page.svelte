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
  import { onMount } from "svelte";
  import { _ } from "svelte-i18n";

  let showLoginModal = $state(false);
  let isNavigating = $state(false);
  let gridCanvas: HTMLCanvasElement;

  function handleLoginSuccess(userData: any) {
    userState.set(userData);
    showLoginModal = false;
  }

  async function handleGoToDashboard() {
    isNavigating = true;
    await goto("/dashboard");
    isNavigating = false;
  }

  onMount(() => {
    if (!gridCanvas) return;
    const ctx = gridCanvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let offset = 0;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      gridCanvas.width = gridCanvas.offsetWidth * dpr;
      gridCanvas.height = gridCanvas.offsetHeight * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      const w = gridCanvas.offsetWidth;
      const h = gridCanvas.offsetHeight;
      const c = ctx!;

      c.clearRect(0, 0, w, h);

      // --- CONFIG ---
      const horizon = 0; // top of the canvas = horizon line
      const vanishX = w / 2; // center vanishing point
      const lineColor = "rgba(236, 72, 153, 0.5)";
      const lineColorFade = "rgba(236, 72, 153, 0.05)";
      const numVerticals = 100; // total vertical lines spreading from center
      const numHorizontals = 20; // horizontal lines
      const speed = 0.02; // scroll speed

      c.lineWidth = 1.5;

      // --- HORIZONTAL LINES (perspective-spaced) ---
      // Lines bunch up near the horizon and spread apart near the bottom
      offset = (offset + speed) % 100;

      for (let i = 0; i < numHorizontals; i++) {
        // Normalized position 0..1 with scroll offset
        const t = (i / numHorizontals + offset / 100) % 1;
        // Exponential spacing — bunches near horizon (t=0), spreads near bottom (t=1)
        const yNorm = t * t * t;
        const y = horizon + yNorm * (h - horizon);

        // Fade out near horizon
        const alpha = Math.min(1, yNorm * 4);

        c.strokeStyle = `rgba(236, 72, 153, ${0.15 + 0.5 * alpha})`;
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(w, y);
        c.stroke();
      }

      // --- VERTICAL LINES (converge to vanishing point) ---
      const spread = w * 10; // how wide the lines fan out at the bottom
      for (let i = -numVerticals / 2; i <= numVerticals / 2; i++) {
        const bottomX = vanishX + (i / (numVerticals / 2)) * (spread / 2);

        // Fade lines further from center
        const dist = Math.abs(i) / (numVerticals / 2);
        const alpha = 0.6 - dist * 0.4;

        c.strokeStyle = `rgba(236, 72, 153, ${Math.max(0.05, alpha)})`;
        c.beginPath();
        c.moveTo(vanishX, horizon);
        c.lineTo(bottomX, h);
        c.stroke();
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  });
</script>

<svelte:head>
  <title>Welcome | ITSupportHub</title>
  <link rel="icon" href={icon} />
</svelte:head>

<div
  class="relative min-h-screen bg-[#fafafa] dark:bg-[#05080f] overflow-hidden selection:bg-blue-500/30 font-sans"
>
  <!-- Warm Sky Gradient (behind the sun) -->
  <div
    class="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-transparent to-orange-200/30 dark:to-orange-900/10 pointer-events-none"
  ></div>
  <div
    class="absolute bottom-[30vh] md:bottom-[40vh] left-0 right-0 h-[30vh] z-0 bg-gradient-to-b from-transparent via-pink-300/15 to-purple-400/20 dark:via-pink-900/10 dark:to-purple-900/15 pointer-events-none"
  ></div>

  <!-- Giant Animated Synthwave Sun — sits on the horizon -->
  <div
    class="absolute left-1/2 bottom-[30vh] md:bottom-[38vh] -translate-x-1/2 translate-y-[40%] w-[80vw] h-[80vw] md:w-[45vw] md:h-[45vw] max-w-[700px] max-h-[700px] rounded-full bg-gradient-to-b from-[#ffed4a] via-[#ff6b6b] to-[#9b2c2c] z-0"
  >
    <!-- Soft outer glow that bleeds into the sky -->
    <div
      class="absolute inset-[-30%] rounded-full bg-gradient-radial from-orange-400/25 via-pink-500/10 to-transparent dark:from-orange-500/15 dark:via-pink-500/5 dark:to-transparent blur-[60px] pointer-events-none"
    ></div>
    <!-- Retro sun cutouts that blend into background -->
    <div
      class="absolute bottom-[5%] left-0 w-full h-[3%] bg-[#fafafa] dark:bg-[#05080f] transition-colors duration-1000"
    ></div>
    <div
      class="absolute bottom-[11%] left-0 w-full h-[4%] bg-[#fafafa] dark:bg-[#05080f] transition-colors duration-1000"
    ></div>
    <div
      class="absolute bottom-[18%] left-0 w-full h-[5%] bg-[#fafafa] dark:bg-[#05080f] transition-colors duration-1000"
    ></div>
    <div
      class="absolute bottom-[27%] left-0 w-full h-[7%] bg-[#fafafa] dark:bg-[#05080f] transition-colors duration-1000"
    ></div>
    <div
      class="absolute bottom-[38%] left-0 w-full h-[9%] bg-[#fafafa] dark:bg-[#05080f] transition-colors duration-1000"
    ></div>
  </div>

  <!-- Canvas-Drawn Synthwave Grid Floor -->
  <div
    class="absolute bottom-0 left-0 right-0 h-[35vh] md:h-[45vh] z-0 bg-[#fafafa] dark:bg-[#05080f] transition-colors duration-1000"
  >
    <canvas bind:this={gridCanvas} class="absolute inset-0 w-full h-full"
    ></canvas>
    <!-- Soft top-edge fade so grid melts into the sky instead of a hard line -->
    <div
      class="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#fafafa] dark:from-[#05080f] to-transparent pointer-events-none z-10"
    ></div>
    <!-- Neon horizon glow line -->
    <div
      class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-pink-500 to-transparent shadow-[0_0_20px_5px_rgba(236,72,153,0.3)] dark:shadow-[0_0_30px_8px_rgba(236,72,153,0.2)] z-10"
    ></div>
  </div>

  <!-- Ambient color washes to tie everything together -->
  <div
    class="absolute inset-0 z-0 pointer-events-none bg-gradient-to-t from-purple-500/5 via-transparent to-transparent dark:from-purple-900/10"
  ></div>

  <div
    class="pointer-events-none absolute inset-0 z-50 crt-scanlines opacity-30"
  ></div>

  <!-- Hero Section -->
  <div
    class="relative z-10 container mx-auto px-4 pt-40 pb-20 flex flex-col items-center justify-center min-h-[90vh]"
  >
    <div
      class="w-full max-w-5xl mx-auto flex flex-col items-center text-center"
    >
      <!-- Main Heading (Gradient Text) -->
      <h1
        class="text-6xl md:text-8xl font-black tracking-tight text-gray-900 dark:text-white mb-6"
      >
        <span
          class="bg-gradient-to-r from-pink-400 via-fuchsia-500 to-purple-600 dark:from-pink-400 dark:via-fuchsia-400 dark:to-purple-500 bg-clip-text text-transparent drop-shadow-sm"
        >
          Netblocker
        </span>
      </h1>

      <!-- CTA Buttons container -->
      <div class="flex flex-col sm:flex-row gap-4 mb-24">
        {#if userState.value}
          <Button
            size="lg"
            href="/creation"
            class="group relative h-14 px-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 overflow-hidden"
          >
            <div
              class="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-white/20 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
            ></div>
            <span class="relative font-bold text-lg flex items-center gap-2">
              {$_('landing.create_policy')}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 group-hover:rotate-90 transition-transform duration-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                /></svg
              >
            </span>
          </Button>
          <Button
            size="lg"
            onclick={handleGoToDashboard}
            disabled={isNavigating}
            class="group relative h-14 px-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 overflow-hidden"
          >
            <div
              class="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-white/20 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
            ></div>
            <span class="relative font-bold text-lg flex items-center gap-2">
              {isNavigating ? $_('common.loading') : $_('landing.go_to_dashboard')}
              {#if !isNavigating}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  /></svg
                >
              {/if}
            </span>
          </Button>
        {:else}
          <Button
            size="lg"
            onclick={() => (showLoginModal = true)}
            class="group relative h-14 px-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 overflow-hidden"
          >
            <div
              class="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-white/20 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
            ></div>
            <span class="relative font-bold text-lg">{$_('landing.get_started')}</span>
          </Button>
        {/if}
      </div>
    </div>
  </div>
</div>

<!-- Login Modal -->
<Modal
  bind:open={showLoginModal}
  size="xs"
  autoclose={false}
  class="!p-0 !rounded-[2rem] overflow-hidden border-white/10 shadow-2xl"
  classes={{ body: "p-0 bg-white dark:bg-gray-800" }}
>
  <LoginCard
    onSuccess={handleLoginSuccess}
    onClose={() => (showLoginModal = false)}
  />
</Modal>

<!-- Loading Overlay -->
<div
  class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-200 {isNavigating
    ? 'opacity-100 pointer-events-auto'
    : 'opacity-0 pointer-events-none'}"
>
  <img
    src={loaderFull}
    alt=""
    class="pointer-events-none object-contain w-[80vw] md:w-96 h-auto max-h-[80vh]"
  />
  {#if isNavigating}
    <div class="mt-4 text-center">
      <h3 class="text-xl font-bold text-white tracking-wide">
        {$_('landing.loading_dashboard')}
      </h3>
      <p class="text-gray-200 mt-2">{$_('landing.fetching_policies')}</p>
    </div>
  {/if}
</div>

<style>
  /* Scanlines */
  .crt-scanlines {
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0),
      rgba(255, 255, 255, 0) 50%,
      rgba(0, 0, 0, 0.2) 50%,
      rgba(0, 0, 0, 0.2)
    );
    background-size: 100% 4px;
    z-index: 50;
    pointer-events: none;
  }
</style>
