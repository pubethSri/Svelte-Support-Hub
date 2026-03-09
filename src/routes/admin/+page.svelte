<script lang="ts">
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import Users from "@lucide/svelte/icons/users";
  import Crown from "@lucide/svelte/icons/crown";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import Check from "@lucide/svelte/icons/check";
  import X from "@lucide/svelte/icons/x";
  import Search from "@lucide/svelte/icons/search";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import Clock from "@lucide/svelte/icons/clock";
  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";

  let { data } = $props();

  // --- Tab State ---
  let activeTab = $state<"users" | "cleanup">("users");

  // --- Users Tab State ---
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
    } finally {
      isDeleting = false;
      deletingId = null;
    }
  }

  // --- Cleanup Tab State ---
  let expiredPolicies = $state<any[]>(data.expiredPolicies || []);
  let isRefreshingPreview = $state(false);

  async function refreshPreview() {
    isRefreshingPreview = true;
    try {
      const res = await fetch("/api/admin/cleanup/preview");
      if (res.ok) {
        const data = await res.json();
        expiredPolicies = data.expired || [];
      }
    } catch {
    } finally {
      isRefreshingPreview = false;
    }
  }

  let isRunningCleanup = $state(false);
  let isConfirmingCleanup = $state(false);

  async function runCleanupNow() {
    isRunningCleanup = true;
    try {
      const res = await fetch("/api/admin/cleanup/run", { method: "POST" });
      if (res.ok) {
        await refreshPreview();
      }
    } catch {
    } finally {
      isRunningCleanup = false;
      isConfirmingCleanup = false;
    }
  }
</script>

<div class="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-4xl mx-auto">

    <!-- Tab Navigation -->
    <div class="mt-2 mb-6 flex gap-1 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl w-fit mx-auto">
      <button
        onclick={() => (activeTab = "users")}
        class="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 {activeTab === 'users'
          ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-sm'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}"
      >
        <Users class="w-4 h-4" />
        Users Management
      </button>
      <button
        onclick={() => (activeTab = "cleanup")}
        class="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 {activeTab === 'cleanup'
          ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-sm'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}"
      >
        <Clock class="w-4 h-4" />
        Policy Cleanup
      </button>
    </div>

    <!-- ============== USERS TAB ============== -->
    {#if activeTab === "users"}
      <p class="text-center text-gray-500 dark:text-gray-400 mb-4">
        {allowedUsers.length} user{allowedUsers.length !== 1 ? "s" : ""} in database
      </p>

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
    {/if}

    <!-- ============== CLEANUP TAB ============== -->
    {#if activeTab === "cleanup"}
      <div class="space-y-6">

        <!-- Upcoming Deletions Preview -->
        <div
          class="bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden"
        >
          <div class="p-6 pb-4 flex items-center justify-between">
            <div>
              <h3
                class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"
              >
                <AlertTriangle
                  class="w-5 h-5 text-orange-500 dark:text-orange-400"
                />
                Expired Policies
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                These policies will be automatically deleted at the top of the next hour
              </p>
            </div>
            <div class="flex gap-2">
                <button
                  onclick={() => (isConfirmingCleanup = true)}
                  disabled={isRunningCleanup || isRefreshingPreview}
                  class="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 rounded-lg text-sm font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-all disabled:opacity-50"
                  title="Immediately delete all expired policies"
                >
                  <Trash2 class="w-4 h-4" />
                  Delete Now
                </button>
              <button
                onclick={refreshPreview}
                disabled={isRefreshingPreview || isRunningCleanup}
                class="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-300 dark:hover:border-orange-500/30 transition-all disabled:opacity-50"
                title="Refresh preview"
              >
                <RefreshCw
                  class="w-4 h-4 {isRefreshingPreview ? 'animate-spin' : ''}"
                />
              </button>
            </div>
          </div>

          {#if expiredPolicies.length === 0}
            <div class="p-8 pt-2 text-center">
              <Check
                class="w-10 h-10 text-green-400 dark:text-green-500 mx-auto mb-3"
              />
              <p
                class="text-gray-500 dark:text-gray-400 font-medium"
              >
                No expired policies — all clear!
              </p>
            </div>
          {:else}
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr
                    class="bg-gray-50 dark:bg-gray-800/50 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    <th class="px-6 py-3">Policy Name</th>
                    <th class="px-6 py-3">Policy ID</th>
                    <th class="px-6 py-3">Expired</th>
                  </tr>
                </thead>
                <tbody
                  class="divide-y divide-gray-100 dark:divide-gray-800"
                >
                  {#each expiredPolicies as policy}
                    <tr
                      class="hover:bg-red-50/50 dark:hover:bg-red-500/5 transition-colors"
                    >
                      <td
                        class="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white"
                        >{policy.name}</td
                      >
                      <td
                        class="px-6 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono"
                        >#{policy.policyid}</td
                      >
                      <td class="px-6 py-3">
                        <span
                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"
                        >
                          {policy.expiredAgo}
                        </span>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
            <div class="p-4 text-center text-xs text-gray-400 dark:text-gray-500">
              {expiredPolicies.length} expired polic{expiredPolicies.length === 1 ? "y" : "ies"} will be automatically deleted at the top of the next hour
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Delete Confirmation Modal -->
{#if isConfirmingCleanup}
  <div class="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-gray-900/50 backdrop-blur-sm transition-opacity">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden transform transition-all scale-100 opacity-100">
      <div class="px-6 py-6 sm:p-8">
        <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-500/20 rounded-full">
          <Trash2 class="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <div class="text-center">
          <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Expired Policies?</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            You are about to permanently delete <strong>{expiredPolicies.length}</strong> expired polic{expiredPolicies.length === 1 ? 'y' : 'ies'}.
            <br />This action cannot be undone. Are you sure you want to proceed?
          </p>
        </div>
        
        <div class="mt-8 flex gap-3">
          <button
            onclick={() => (isConfirmingCleanup = false)}
            disabled={isRunningCleanup}
            class="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onclick={runCleanupNow}
            disabled={isRunningCleanup}
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors disabled:opacity-50"
          >
            {#if isRunningCleanup}
              <RefreshCw class="w-5 h-5 animate-spin" />
              Deleting...
            {:else}
              Confirm Delete
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
