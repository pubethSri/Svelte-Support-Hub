<script lang="ts">
  import { userState } from "$lib/userState.svelte";
  import loaderFull from "$lib/loader/loader_full.webp";
  import MoveLeft from "@lucide/svelte/icons/move-left";
  import Terminal from "@lucide/svelte/icons/terminal";
</script>

<div
  class="fixed inset-0 bg-neutral-950 flex flex-col items-center justify-center p-8 text-center font-mono overflow-hidden selection:bg-red-500/30"
>
  <!-- TV Static Noise -->
  <div
    class="tv-static absolute inset-0 pointer-events-none opacity-[0.10] z-0 mix-blend-overlay w-[200%] h-[200%] -left-1/2 -top-1/2"
  ></div>

  <!-- CRT Scanline effect -->
  <div
    class="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[size:100%_4px] pointer-events-none z-50 opacity-30"
  ></div>

  <div class="relative z-10 flex flex-col items-center max-w-3xl w-full">
    <!-- Dokkaebi Logo / Loader -->
    <div class="relative mb-8 group">
      <!-- Glitch layers -->
      <div
        class="absolute inset-0 opacity-0 group-hover:opacity-100 group-hover:animate-pulse bg-red-500/20 blur-xl rounded-full transition-all duration-300"
      ></div>
      <img
        src={loaderFull}
        alt="Logic Bomb"
        class="w-48 h-48 md:w-64 md:h-64 object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
      />
      <div
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[20%] bg-white/5 opacity-0 animate-[glitch_4s_infinite_linear]"
      ></div>
    </div>

    <!-- Error Codes -->
    <div
      class="flex items-center gap-4 text-red-500 mb-6 text-sm md:text-base tracking-[0.2em] font-bold"
    >
      <Terminal class="w-5 h-5" />
      <span>ERR_CODE // 403 : FORBIDDEN</span>
    </div>

    <!-- Main Title -->
    <h1
      class="text-4xl md:text-6xl font-black text-white tracking-widest mb-6 uppercase"
      style="text-shadow: 2px 0 0 red, -2px 0 0 cyan;"
    >
      ACCESS DENIED
    </h1>

    <!-- Subtitle / Info -->
    <p
      class="text-lg md:text-xl text-red-500 font-bold mb-8 uppercase tracking-widest animate-pulse"
    >
      Request Terminated
    </p>

    <!-- Return Action -->
    <a
      href="/"
      class="mt-12 group relative inline-flex items-center gap-3 bg-white text-black px-8 py-4 font-bold tracking-widest uppercase hover:bg-neutral-200 transition-colors overflow-hidden"
    >
      <div
        class="absolute inset-0 bg-red-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0"
      ></div>
      <MoveLeft
        class="w-5 h-5 relative z-10 group-hover:text-white transition-colors"
      />
      <span class="relative z-10 group-hover:text-white transition-colors"
        >Return to Homepage</span
      >
    </a>
  </div>
</div>

<style>
  @keyframes glitch {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) skewX(0deg);
    }
    1% {
      opacity: 1;
      transform: translate(-50%, -100%) skewX(20deg);
    }
    2% {
      opacity: 0;
      transform: translate(-50%, -50%) skewX(0deg);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) skewX(0deg);
    }
  }

  /* TV Static Noise Background */
  .tv-static {
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 200px 200px;
    animation: tv-static-anim 0.2s steps(2) infinite;
  }

  @keyframes tv-static-anim {
    0% {
      transform: translate(0, 0);
    }
    10% {
      transform: translate(-1%, -1%);
    }
    20% {
      transform: translate(-2%, 1%);
    }
    30% {
      transform: translate(1%, -2%);
    }
    40% {
      transform: translate(-1%, 3%);
    }
    50% {
      transform: translate(-2%, 1%);
    }
    60% {
      transform: translate(3%, 0);
    }
    70% {
      transform: translate(0, 3%);
    }
    80% {
      transform: translate(1%, 7%);
    }
    90% {
      transform: translate(-2%, 2%);
    }
    100% {
      transform: translate(0, 0);
    }
  }
</style>
