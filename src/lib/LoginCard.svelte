<script lang="ts">
  import ITLogo from "$lib/assets/img/it-logo.png";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Eye, EyeOff } from "@lucide/svelte/icons";
  import { enhance } from "$app/forms";

  // Icons for Social Login
  import Globe from "@lucide/svelte/icons/globe";
  import { _ } from "svelte-i18n";

  let revealPassword = $state(false);
  let usernameValue = $state("");
  let passwordValue = $state("");
  let errorMessage = $state("");
  let isLoading = $state(false);

  // Props
  let { onSuccess, onClose } = $props<{
    onSuccess?: (userData: any) => void;
    onClose?: () => void;
  }>();

  $effect(() => {
    if (!passwordValue) revealPassword = false;
  });
</script>

<div
  class="relative w-full bg-white dark:bg-gray-800 md:p-10 flex flex-col gap-6"
>
  <div class="flex flex-col items-center justify-center -mt-10">
    <img class="h-20 mb-6" src={ITLogo} alt="Logo" />
    <h2
      class="text-[26px] font-bold text-gray-900 dark:text-white tracking-tight"
    >
      {$_('login.title')}
    </h2>
  </div>

  <form
    method="POST"
    action="/?/login"
    use:enhance={({ cancel }) => {
      if (!usernameValue || !passwordValue) {
        cancel();
        return;
      }

      isLoading = true;
      errorMessage = "";

      return async ({ result }) => {
        isLoading = false;

        if (result.type === "success" && result.data?.success) {
          // Login successful - cookie is already set by server
          if (onSuccess) onSuccess(result.data.user);
        } else if (result.type === "failure") {
          errorMessage = String(result.data?.error || $_('login.login_failed'));
        } else {
          errorMessage = $_('login.unexpected_error');
        }
      };
    }}
    class="flex flex-col gap-5 mt-2"
  >
    <div class="relative group">
      <Input
        class="h-[50px] rounded-full bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-0 px-6 text-base"
        id="username"
        name="username"
        type="text"
        placeholder={$_('login.username_placeholder')}
        bind:value={usernameValue}
        required
      />
    </div>

    <div class="relative group">
      <Input
        class="h-[50px] rounded-full bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-0 px-6 pr-12 text-base"
        id="password"
        name="password"
        type={revealPassword ? "text" : "password"}
        placeholder={$_('login.password_placeholder')}
        bind:value={passwordValue}
        required
      />
      <button
        type="button"
        class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        onclick={() => (revealPassword = !revealPassword)}
      >
        {#if revealPassword}
          <Eye class="w-5 h-5" />
        {:else}
          <EyeOff class="w-5 h-5" />
        {/if}
      </button>
    </div>

    {#if errorMessage}
      <p class="text-red-500 text-sm text-center font-medium">{errorMessage}</p>
    {/if}

    <Button
      type="submit"
      class="h-[50px] w-full rounded-full text-[16px] font-medium mt-2 transition-all
                   {usernameValue && passwordValue
        ? 'bg-gray-900 hover:bg-black text-white'
        : 'bg-gray-200 text-gray-400 hover:bg-gray-200 cursor-not-allowed'}"
      disabled={!usernameValue || !passwordValue || isLoading}
    >
      {isLoading ? $_('login.logging_in') : $_('login.login_button')}
    </Button>
  </form>

  <div class="relative flex py-2 items-center mt-4">
    <div class="flex-grow border-t border-gray-200"></div>
    <span
      class="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase tracking-wider"
      >{$_('login.more_methods')}</span
    >
    <div class="flex-grow border-t border-gray-200"></div>
  </div>

  <div class="flex justify-center gap-6">
    <button
      class="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition shadow-sm"
    >
      <Globe class="w-5 h-5 text-gray-600" />
    </button>
  </div>
</div>
