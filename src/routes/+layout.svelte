<script lang="ts">
	import './layout.css';
	import icon from '$lib/assets/img/it-logo.png';
	import { ModeWatcher } from "mode-watcher";
	import Header from '$lib/Header.svelte';
	import LoginCard from "$lib/LoginCard.svelte";
    import { Modal } from 'flowbite-svelte';
	import { userState } from "$lib/userState.svelte";
	
	let { children } = $props();

	let showLoginModal = $state(false);
	function handleLogout() {
        userState.logout();
    }
</script>

<Header
	currentUser={userState.value} 
    onLoginClick={() => showLoginModal = true}
    onLogoutClick={handleLogout} 
/>

<Modal 
    bind:open={showLoginModal} 
    size="xs" 
    autoclose={false} 
    class="!p-0 !rounded-[24px] overflow-hidden" 
    bodyClass="p-0"
>
    <LoginCard 
        onSuccess={(userData) => {
            userState.set(userData);
            showLoginModal = false;
        }}
        onClose={() => showLoginModal = false} 
    />
</Modal>

<svelte:head>
	<title>หน้าหลัก | ITSupportHub</title>
	<link rel="icon" href={icon} />
</svelte:head>

<ModeWatcher />
{@render children()}
