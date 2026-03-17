<script lang="ts">
  import SunIcon from "@lucide/svelte/icons/sun";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import UserIcon from "@lucide/svelte/icons/user";
  import LogOutIcon from "@lucide/svelte/icons/log-out";
  import MenuIcon from "@lucide/svelte/icons/menu";
  import XIcon from "@lucide/svelte/icons/x";
  import Languages from "@lucide/svelte/icons/languages";

  import { toggleMode } from "mode-watcher";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import ITkmitlLogo from "$lib/assets/img/itkmitl.svg.svelte";
  import loaderFull from "$lib/loader/loader_full.webp";
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import { userState } from "$lib/userState.svelte";
  import { _, locale } from "svelte-i18n";

  function toggleLocale() {
    const next = $locale === 'th' ? 'en' : 'th';
    $locale = next;
    if (browser) {
      localStorage.setItem('locale', next);
      document.cookie = `locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    }
  }

  let isActiveNavigating = $state(false);
  let mobileMenuOpen = $state(false);

  async function handleGoToActive(e: MouseEvent) {
    if (window.location.pathname === "/dashboard") return;
    e.preventDefault();
    isActiveNavigating = true;
    mobileMenuOpen = false;
    await goto("/dashboard");
    isActiveNavigating = false;
  }

  // 1. Receive User Data & Emit Events
  let { currentUser, onLoginClick, onLogoutClick } = $props<{
    currentUser: { name: string; role: string; dbRole?: string | null } | null;
    onLoginClick: () => void;
    onLogoutClick: () => void;
  }>();

  function fetchLiveRole() {
    if (!browser || !currentUser) return;
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success && json.user) {
          if (userState.value && userState.value.dbRole !== json.user.dbRole) {
            userState.set({ ...userState.value, dbRole: json.user.dbRole });
          }
        }
      })
      .catch(() => {});
  }

  function canViewAdmin(user: any) {
    if (!user) return false;
    return !!user.isAllowed;
  }

  function isAdminRole(user: any) {
    if (!user) return false;
    return user.dbRole && user.dbRole.toLowerCase().includes("admin");
  }
</script>

<nav
  class="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-50 transition-all duration-300"
>
  <div
    class="bg-white/80 dark:bg-[#0a0f18]/80 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl rounded-[1.5rem] md:rounded-full px-4 md:px-6 py-3 relative overflow-hidden"
  >
    <!-- Subtle Animated gradient border inside the pill -->
    <div
      class="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-pink-500/10 to-purple-500/10 animate-[pulse_4s_ease-in-out_infinite] pointer-events-none"
    ></div>

    <!-- Main row -->
    <div class="flex justify-between items-center relative z-10">
      <div class="flex items-center gap-4 md:gap-6">
        <a
          href="/"
          class="flex items-center group transition-transform hover:scale-105 active:scale-95 duration-300"
        >
          <div
            class="h-6 md:h-8 w-auto flex items-center justify-center text-gray-800 dark:text-white"
          >
            <ITkmitlLogo />
          </div>
        </a>

        {#if canViewAdmin(currentUser)}
          <div
            class="hidden md:flex items-center gap-2 bg-gray-100/50 dark:bg-black/20 p-1 rounded-full border border-gray-200/50 dark:border-white/5"
          >
            <a
              href="/creation"
              class="text-sm font-semibold px-4 py-2 rounded-full transition-all duration-300 {$page
                .url.pathname === '/creation'
                ? 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 shadow-sm'
                : 'text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 hover:shadow-sm'}"
            >
              {$_('header.create_policy')}
            </a>
            <a
              href="/dashboard"
              onclick={handleGoToActive}
              class="text-sm font-semibold px-4 py-2 rounded-full transition-all duration-300 {isActiveNavigating
                ? 'animate-pulse text-pink-500'
                : $page.url.pathname === '/dashboard'
                  ? 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 hover:shadow-sm'}"
            >
              {isActiveNavigating ? $_('common.loading') : $_('header.dashboard')}
            </a>
            {#if isAdminRole(currentUser)}
              <a
                href="/admin"
                class="text-sm font-semibold px-4 py-2 rounded-full transition-all duration-300 {$page
                  .url.pathname === '/admin'
                  ? 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 hover:shadow-sm'}"
              >
                {$_('header.admin')}
              </a>
            {/if}
          </div>
        {/if}
      </div>

      <div class="flex items-center gap-2 md:gap-3">
        <Button
          onclick={toggleMode}
          variant="ghost"
          size="icon"
          class="rounded-full hover:bg-gray-200/50 dark:hover:bg-white/10 transition-colors h-9 w-9"
        >
          <SunIcon
            class="h-5 w-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90 text-yellow-500"
          />
          <MoonIcon
            class="absolute h-5 w-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0 text-purple-300"
          />
          <span class="sr-only">{$_('common.toggle_theme')}</span>
        </Button>

        <Button
          onclick={toggleLocale}
          variant="ghost"
          size="icon"
          class="rounded-full hover:bg-gray-200/50 dark:hover:bg-white/10 transition-colors h-9 w-9 font-bold text-xs"
          title={$locale === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
        >
          <Languages class="h-5 w-5 text-purple-500 dark:text-purple-400" />
          <span class="sr-only">{$locale === 'th' ? 'EN' : 'TH'}</span>
        </Button>

        {#if currentUser}
          <DropdownMenu.Root
            onOpenChange={(open) => {
              if (open) fetchLiveRole();
            }}
          >
            <DropdownMenu.Trigger
              class="flex items-center gap-2 md:gap-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 px-3 md:px-4 py-2 rounded-full hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-all duration-300 group"
            >
              <div
                class="h-6 w-6 rounded-full bg-gradient-to-tr from-orange-500 to-pink-500 flex items-center justify-center text-white shadow-inner"
              >
                <UserIcon class="h-3.5 w-3.5" />
              </div>
              <span
                class="hidden sm:inline font-bold text-sm bg-gradient-to-r from-orange-600 to-pink-600 dark:from-orange-400 dark:to-pink-400 bg-clip-text text-transparent group-hover:opacity-80 transition-opacity max-w-[100px] truncate"
              >
                {currentUser.name.split(" ")[0]}
              </span>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
              align="end"
              class="w-56 mt-2 rounded-2xl bg-white/95 dark:bg-[#0a0f18]/95 backdrop-blur-xl border border-gray-200 dark:border-white/10 shadow-2xl p-2"
            >
              <div class="px-2 py-3 flex flex-col gap-2">
                <div>
                  <span
                    class="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider"
                    >{$_('header.full_name')}</span
                  >
                  <p class="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {currentUser.name}
                  </p>
                </div>
                <div>
                  <span
                    class="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider"
                    >{$_('header.role')}</span
                  >
                  <p class="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {currentUser.role.toUpperCase()}
                  </p>
                </div>
                {#if currentUser.dbRole}
                  <div>
                    <span
                      class="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider"
                      >{$_('header.special_role')}</span
                    >
                    <p
                      class="text-sm font-bold text-purple-600 dark:text-purple-400"
                    >
                      {currentUser.dbRole.toUpperCase()}
                    </p>
                  </div>
                {/if}
              </div>
              <DropdownMenu.Separator
                class="bg-gray-100 dark:bg-white/10 my-1"
              />
              <DropdownMenu.Item
                onclick={onLogoutClick}
                class="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 cursor-pointer rounded-xl px-3 py-2.5 transition-colors focus:bg-red-50 dark:focus:bg-red-500/10 focus:text-red-600 font-medium"
              >
                <LogOutIcon class="mr-2 h-4 w-4" />
                <span>{$_('header.logout')}</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        {:else}
          <Button
            onclick={onLoginClick}
            class="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-[0_4px_14px_0_rgba(0,118,255,0.39)] hover:shadow-[0_6px_20px_rgba(0,118,255,0.23)] hover:-translate-y-0.5 transition-all duration-300 font-bold px-4 md:px-6 text-sm"
          >
            {$_('header.login')}
          </Button>
        {/if}

        <!-- Mobile hamburger (only shown on small screens when user has admin access) -->
        {#if canViewAdmin(currentUser)}
          <Button
            variant="ghost"
            size="icon"
            onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
            class="md:hidden rounded-full hover:bg-gray-200/50 dark:hover:bg-white/10 h-9 w-9 active:scale-90 transition-transform duration-200"
          >
            {#if mobileMenuOpen}
              <XIcon class="h-5 w-5" />
            {:else}
              <MenuIcon class="h-5 w-5" />
            {/if}
          </Button>
        {/if}
      </div>
    </div>

    <!-- Mobile nav links (slides open) -->
    {#if mobileMenuOpen && canViewAdmin(currentUser)}
      <div
        class="md:hidden mt-3 pt-3 border-t border-gray-200/50 dark:border-white/10 flex flex-col gap-2 relative z-10"
      >
        <a
          href="/creation"
          onclick={() => (mobileMenuOpen = false)}
          class="text-sm font-semibold px-4 py-3 rounded-xl hover:translate-x-2 active:scale-95 transition-all duration-300 shadow-sm hover:shadow-md {$page
            .url.pathname === '/creation'
            ? 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20'
            : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/10'}"
        >
          {$_('header.create_policy')}
        </a>
        <a
          href="/dashboard"
          onclick={(e) => {
            mobileMenuOpen = false;
            handleGoToActive(e);
          }}
          class="text-sm font-semibold px-4 py-3 rounded-xl hover:translate-x-2 active:scale-95 transition-all duration-300 shadow-sm hover:shadow-md {isActiveNavigating
            ? 'animate-pulse text-pink-500'
            : $page.url.pathname === '/dashboard'
              ? 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20'
              : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/10'}"
        >
          {isActiveNavigating ? $_('common.loading') : $_('header.active_policies')}
        </a>
        {#if isAdminRole(currentUser)}
          <a
            href="/admin"
            onclick={() => (mobileMenuOpen = false)}
            class="text-sm font-semibold px-4 py-3 rounded-xl hover:translate-x-2 active:scale-95 transition-all duration-300 shadow-sm hover:shadow-md {$page
              .url.pathname === '/admin'
              ? 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20'
              : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/10'}"
          >
            {$_('header.admin_panel')}
          </a>
        {/if}
      </div>
    {/if}
  </div>
</nav>

<!-- Loading Overlay -->
<div
  class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-200 {isActiveNavigating
    ? 'opacity-100 pointer-events-auto'
    : 'opacity-0 pointer-events-none'}"
>
  <img
    src={loaderFull}
    alt=""
    class="pointer-events-none object-contain w-[80vw] md:w-96 h-auto max-h-[80vh]"
  />
  {#if isActiveNavigating}
    <div class="mt-4 text-center">
      <h3 class="text-xl font-bold text-white tracking-wide">
        {$_('header.loading_dashboard')}
      </h3>
      <p class="text-gray-200 mt-2">{$_('header.fetching_policies')}</p>
    </div>
  {/if}
</div>
