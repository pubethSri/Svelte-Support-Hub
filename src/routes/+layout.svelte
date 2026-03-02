<script lang="ts">
  import "./layout.css";
  import icon from "$lib/assets/img/it-logo.png";
  import loaderFull from "$lib/loader/loader_full.webp";
  import { ModeWatcher } from "mode-watcher";
  import Header from "$lib/Header.svelte";
  import LoginCard from "$lib/LoginCard.svelte";
  import { Modal } from "flowbite-svelte";
  import { userState } from "$lib/userState.svelte";
  import { invalidateAll } from "$app/navigation";
  import { browser } from "$app/environment";

  let { children, data } = $props();

  // Initialize server data directly to global store to prevent SSR flash
  if (data?.user) {
    userState.set(data.user);
  } else {
    userState.value = null;
  }

  // Synchronize server data to global store on subsequent client navigations
  $effect(() => {
    if (data?.user) {
      if (userState.value?.name !== data.user.name) {
        userState.set(data.user);
      }
    } else {
      userState.value = null;
    }
  });

  // Live-refresh dbRole and isAllowed from DB on each page load (no re-login needed)
  $effect(() => {
    if (!browser || !userState.value) return;

    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success && json.user && userState.value) {
          const needsUpdate =
            userState.value.dbRole !== json.user.dbRole ||
            userState.value.isAllowed !== json.user.isAllowed;
          if (needsUpdate) {
            userState.set({
              ...userState.value,
              dbRole: json.user.dbRole,
              isAllowed: json.user.isAllowed,
            });
          }
        }
      })
      .catch(() => {});
  });

  let showLoginModal = $state(false);

  function handleLogout() {
    // Clear client state immediately
    userState.logout();
    // Submit to server to clear cookie
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/logout";
    document.body.appendChild(form);
    form.submit();
  }

  async function handleLoginSuccess(userData: any) {
    userState.set(userData);
    showLoginModal = false;
    // Invalidate all data so pages reload with new auth
    await invalidateAll();
  }
</script>

<Header
  currentUser={userState.value}
  onLoginClick={() => (showLoginModal = true)}
  onLogoutClick={handleLogout}
/>

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

<svelte:head>
  <title>Netblocker</title>
  <link rel="icon" href={icon} />
</svelte:head>

<ModeWatcher />
{@render children()}
