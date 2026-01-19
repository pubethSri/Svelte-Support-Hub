<script lang="ts">
    import SunIcon from "@lucide/svelte/icons/sun";
    import MoonIcon from "@lucide/svelte/icons/moon";
    import UserIcon from "@lucide/svelte/icons/user"; // Add this icon
    import LogOutIcon from "@lucide/svelte/icons/log-out"; // Add this icon
    
    import { toggleMode } from "mode-watcher";
    import { Button } from "$lib/components/ui/button/index.js";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu"; // Optional: For Logout menu
    import ITkmitlLogo from "$lib/assets/img/itkmitl.svg.svelte";

    // 1. Receive User Data & Emit Events
    let { currentUser, onLoginClick, onLogoutClick } = $props<{ 
        currentUser: { name: string; role: string } | null,
        onLoginClick: () => void,
        onLogoutClick: () => void
    }>();

    function canViewAdmin(user: any) {
        if (!user) return false;
        return user.value.name.toLowerCase() === 'mr.jirathip kapanya'
            || user.value.role.toLowerCase() === 'lecturer'
            || user.value.name.toLowerCase() === 'montree kingkaew'
            || user.value.name.toLowerCase() === 'mr.pubeth sriwattana'
            || user.value.name.toLowerCase() === 'นายจารุกิตติ์ ศรีพาเพลิน'
            || user.value.name.toLowerCase() === 'นายชญานนท์ สุภากิจ';
    }

</script>

<nav class="bg-white dark:bg-gray-900 shadow-md sticky top-0 left-0 w-full z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20">
        <div class="h-full flex justify-between items-center py-4">
            
            <div class="flex items-center gap-8">
                <a href="/" class="flex items-center group">
                    <ITkmitlLogo/>
                </a>

                {#if canViewAdmin(currentUser)}
                    <div class="hidden md:flex items-center gap-6">
                        <a href="/" class="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-400">
                            Create Policy
                        </a>
                        <a href="/active" class="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-400">
                            Active Policies
                        </a>
                    </div>
                {/if}
            </div>

            <div class="flex items-center gap-4">
                
                <Button onclick={toggleMode} variant="outline" size="icon" class="cursor-pointer dark:bg-gray-800 dark:text-gray-300">
                    <SunIcon class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                    <MoonIcon class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                    <span class="sr-only">Toggle theme</span>
                </Button>

                {#if currentUser}
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger>
                            <Button variant="ghost" class="flex items-center gap-2">
                                <UserIcon class="h-4 w-4" />
                                <span class="hidden sm:inline font-medium">
                                    {currentUser.name}
                                </span>
                            </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content align="end">
                            <DropdownMenu.Label>{currentUser.role.toUpperCase()}</DropdownMenu.Label>
                            <DropdownMenu.Separator />
                            <DropdownMenu.Item onclick={onLogoutClick} class="text-red-600 cursor-pointer">
                                <LogOutIcon class="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Root>
                {:else}
                    <Button onclick={onLoginClick} variant="default" class="bg-blue-600 hover:bg-blue-700 text-white">
                        Sign In
                    </Button>
                {/if}

            </div>
        </div>
    </div>
</nav>


<marquee class="bg-yellow-300 dark:text-black font-bold">🚨🚧 This Server is currently in maintenance 🚧🚨</marquee>