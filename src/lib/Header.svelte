<script lang="ts">
    import { page } from "$app/stores";
    import { slide, fade } from "svelte/transition";
    import { DarkMode } from "flowbite-svelte";
    import itkmitlLogo from "$lib/assets/img/itkmitl.svg";

    // 1. State for Menus
    let isMobileMenuOpen: boolean = false;
    let isProfileDropdownOpen: boolean = false;

    // 2. Data
    let userName: string = "{Placeholder User}";
    let userRole: string = "{Placeholder Role}";

    // 3. Helper to check if a link is active
    // FIX: Added ': string' type annotation
    $: isActive = (path: string) => {
        return (
            $page.url.pathname === path ||
            (path !== "/" && $page.url.pathname.startsWith(path))
        );
    };

    // 4. Close menus when clicking outside
    // FIX: Added ': MouseEvent' and cast target to HTMLElement
    function handleClickOutside(event: MouseEvent) {
        const target = event.target as HTMLElement;

        // We check if target exists and if it is NOT inside the mobile menu container
        if (
            isMobileMenuOpen &&
            target &&
            !target.closest(".mobile-menu-container")
        ) {
            isMobileMenuOpen = false;
        }
    }
</script>

<svelte:window on:click={handleClickOutside} />


<nav class="bg-white shadow-md stick top-0 left-0 w-full z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20">
        <div class="h-full flex justify-between items-center py-4">
            <div class="flex items-center space-x-3">
                <a href="/" class="flex items-center group">
                    <img
                        src={itkmitlLogo}
                        class="h-10 w-auto transition-transform duration-300 group-hover:scale-110 bg-transparent"
                        alt="IT KMITL Logo"
                        style="background: transparent !important;"
                    />
                </a>
            </div>

            <div class="md:hidden flex items-center mobile-menu-container">
                <button
                    on:click|stopPropagation={() =>
                        (isMobileMenuOpen = !isMobileMenuOpen)}
                    class="text-gray-700 hover:text-blue-600 text-2xl focus:outline-none transition-colors duration-200"
                    aria-label="Toggle Menu"
                >
                    <i class="fa-solid fa-bars"></i>
                </button>
            </div>
            <DarkMode/>
            <div class="hidden md:flex items-center">
                <div
                    class="relative"
                    on:mouseenter={() => (isProfileDropdownOpen = true)}
                    on:mouseleave={() => (isProfileDropdownOpen = false)}
                    role="group"
                >
                    <button
                        class="flex items-center space-x-2 text-gray-700 hover:text-blue-600 focus:outline-none transition-colors duration-200 py-2"
                    >
                        <span class="font-medium">{userName}</span>
                        <i
                            class="fa-solid fa-chevron-down text-xs transition-transform duration-300"
                            class:rotate-180={isProfileDropdownOpen}
                        ></i>
                    </button>

                    {#if isProfileDropdownOpen}
                        <div
                            transition:fade={{ duration: 100 }}
                            class="absolute right-0 mt-0 w-56 bg-white rounded-lg shadow-xl py-2 z-10 border border-gray-100"
                        >
                            <div class="px-4 py-3 border-b border-gray-100">
                                <p
                                    class="text-sm font-semibold text-gray-700"
                                >
                                    {userName}
                                </p>
                                <p class="text-xs text-gray-500">
                                    {userRole}
                                </p>
                            </div>

                            <a
                                href="/request/history"
                                class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                            >
                                <i
                                    class="fa-solid fa-history mr-2 w-5 text-center"
                                ></i> ประวัติคำร้อง
                            </a>

                            <a
                                href="/backoffice"
                                class="block px-4 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-800 bg-blue-50 text-blue-600"
                            >
                                <i
                                    class="fa-solid fa-shield mr-2 w-5 text-center"
                                ></i> แผงควบคุมผู้ดูแล
                            </a>

                            <div
                                class="border-t border-gray-100 my-1"
                            ></div>

                            <a
                                href="/api/member/logout"
                                class="block px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                                <i
                                    class="fa-solid fa-sign-out mr-2 w-5 text-center"
                                ></i> ออกจากระบบ
                            </a>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>

    {#if isMobileMenuOpen}
        <div
            transition:slide={{ duration: 300 }}
            class="mobile-menu-container fixed top-20 left-0 w-full bg-white shadow-lg md:hidden border-t border-gray-100"
        >
            <div class="px-4 py-4 flex flex-col space-y-3">
                <div
                    class="flex items-center space-x-3 py-3 border-b border-gray-200"
                >
                    <div>
                        <div class="font-medium text-gray-800">
                            {userName}
                        </div>
                        <div class="text-sm text-gray-500">{userRole}</div>
                    </div>
                </div>

                <a
                    href="/"
                    class="flex items-center py-3 px-4 rounded-lg transition-colors duration-200 {isActive(
                        '/',
                    )
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'}"
                >
                    <i class="fa-solid fa-home mr-3 w-6 text-center"></i> หน้าหลัก
                </a>

                <a
                    href="/request/history"
                    class="flex items-center py-3 px-4 rounded-lg transition-colors duration-200 {isActive(
                        '/request/history',
                    )
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'}"
                >
                    <i class="fa-solid fa-history mr-3 w-6 text-center"></i>
                    ประวัติคำร้อง
                </a>

                <a
                    href="/backoffice"
                    class="flex items-center py-3 px-4 rounded-lg transition-colors duration-200 {isActive(
                        '/backoffice',
                    )
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'}"
                >
                    <i class="fa-solid fa-shield mr-3 w-6 text-center"></i> แผงควบคุมผู้ดูแล
                </a>

                <div class="border-t border-gray-200 my-2"></div>

                <a
                    href="/api/member/logout"
                    class="flex items-center justify-center bg-red-500 text-white px-4 py-3 rounded-lg shadow-md hover:bg-red-600 transition duration-200 mt-3"
                >
                    <i class="fa-solid fa-sign-out mr-2"></i> ออกจากระบบ
                </a>
            </div>
        </div>
    {/if}
</nav>
<marquee direction="">🚨🚧This Server is currently in maintenance🚧🚨</marquee>
