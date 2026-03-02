<script lang="ts">
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import Users from "@lucide/svelte/icons/users";
  import Crown from "@lucide/svelte/icons/crown";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import Check from "@lucide/svelte/icons/check";
  import X from "@lucide/svelte/icons/x";
  import Search from "@lucide/svelte/icons/search";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";

  let { data } = $props();

  let allowedUsers = $state(data.allowedUsers || []);
  let currentUsername = data.currentUsername || "";
  let searchQuery = $state("");

  const filteredUsers = $derived(
    searchQuery.trim()
      ? allowedUsers.filter((u: any) => {
          const q = searchQuery.toLowerCase();
          return (
            u.username.toLowerCase().includes(q) ||
            u.role.toLowerCase().includes(q) ||
            String(u.id).includes(q)
          );
        })
      : allowedUsers,
  );

  // Delete confirmation
  let deletingId = $state<number | null>(null);
  let isDeleting = $state(false);
  let isRefreshing = $state(false);

  async function refreshUsers() {
    isRefreshing = true;
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        const data = await res.json();
        allowedUsers = data.allowedUsers || [];
      }
    } catch {
    } finally {
      isRefreshing = false;
    }
  }

  async function deleteUser(id: number) {
    isDeleting = true;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        allowedUsers = allowedUsers.filter((u: any) => u.id !== id);
      }
    } catch {
      // silently fail
    } finally {
      isDeleting = false;
      deletingId = null;
    }
  }
</script>

<div class="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="text-center mb-10 mt-10">
      <div
        class="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600/10 to-pink-600/10 dark:from-purple-500/20 dark:to-pink-500/20 border border-purple-200 dark:border-purple-500/30 rounded-full px-6 py-2 mb-6"
      >
        <ShieldCheck class="w-5 h-5 text-purple-600 dark:text-purple-400" />
        <span
          class="text-sm font-bold text-purple-700 dark:text-purple-300 tracking-wider uppercase"
          >Admin Panel</span
        >
      </div>
      <p class="text-gray-500 dark:text-gray-400">
        {allowedUsers.length} user{allowedUsers.length !== 1 ? "s" : ""} in database
      </p>
    </div>

    <!-- Search + Refresh -->
    <div class="mb-4 flex gap-2">
      <div class="relative flex-1">
        <Search
          class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500"
        />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search by username, role, or ID..."
          class="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
        />
      </div>
      <button
        onclick={refreshUsers}
        disabled={isRefreshing}
        class="px-4 py-3 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-500/30 transition-all disabled:opacity-50"
        title="Refresh user list"
      >
        <RefreshCw class="w-4 h-4 {isRefreshing ? 'animate-spin' : ''}" />
      </button>
    </div>

    <!-- Users Table -->
    <div
      class="bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden"
    >
      {#if filteredUsers.length === 0}
        <div class="p-12 text-center">
          <Users
            class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4"
          />
          <p class="text-gray-500 dark:text-gray-400 text-lg font-medium">
            {searchQuery ? "No matching users" : "No users in database"}
          </p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr
                class="bg-gray-50 dark:bg-gray-800/50 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                <th class="px-6 py-4">ID</th>
                <th class="px-6 py-4">Username</th>
                <th class="px-6 py-4">Role</th>
                <th class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              {#each filteredUsers as user (user.id)}
                <tr
                  class="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group"
                >
                  <td
                    class="px-6 py-4 text-sm text-gray-400 dark:text-gray-500 font-mono"
                    >#{user.id}</td
                  >
                  <td class="px-6 py-4">
                    <span
                      class="text-sm font-semibold text-gray-900 dark:text-white"
                      >{user.username}</span
                    >
                  </td>
                  <td class="px-6 py-4">
                    <span
                      class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold {user.role
                        .toLowerCase()
                        .includes('admin')
                        ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'}"
                    >
                      {#if user.role.toLowerCase().includes("admin")}
                        <Crown class="w-3 h-3" />
                      {/if}
                      {user.role}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    {#if user.role
                      .toLowerCase()
                      .includes("admin") || user.username === currentUsername}
                      <span
                        class="text-xs text-gray-400 dark:text-gray-600 italic"
                      >
                        {user.username === currentUsername
                          ? "You"
                          : "Protected"}
                      </span>
                    {:else if deletingId === user.id}
                      <div class="flex items-center justify-end gap-2">
                        <span
                          class="text-xs text-red-500 dark:text-red-400 font-medium"
                          >Confirm?</span
                        >
                        <button
                          onclick={() => deleteUser(user.id)}
                          disabled={isDeleting}
                          class="p-2 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors"
                        >
                          <Check class="w-4 h-4" />
                        </button>
                        <button
                          onclick={() => (deletingId = null)}
                          class="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          <X class="w-4 h-4" />
                        </button>
                      </div>
                    {:else}
                      <button
                        onclick={() => (deletingId = user.id)}
                        class="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 class="w-4 h-4" />
                      </button>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>
</div>
