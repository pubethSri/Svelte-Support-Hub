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
  import UserPlus from "@lucide/svelte/icons/user-plus";

  let { data } = $props();

  // --- Tab State ---
  let activeTab = $state<"users" | "cleanup" | "queue">("users");

  // --- Queue State ---
  let queueJobs = $state<any[]>([]);
  let isRefreshingQueue = $state(false);
  let queueInterval: ReturnType<typeof setInterval>;

  async function refreshQueue() {
    isRefreshingQueue = true;
    try {
      const res = await fetch("/api/admin/queue");
      if (res.ok) {
        const data = await res.json();
        queueJobs = data.jobs || [];
      }
    } catch {} 
    finally {
      isRefreshingQueue = false;
    }
  }

  $effect(() => {
    if (activeTab === "queue") {
      refreshQueue(); // Fetch immediately on tab switch
      queueInterval = setInterval(refreshQueue, 2000); // Poll every 2 seconds
    } else {
      clearInterval(queueInterval);
    }
    return () => clearInterval(queueInterval); // Cleanup on destroy
  });

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

  // --- Add User State ---
  let isAddingUser = $state(false);
  let newUsername = $state("");
  let newRole = $state("admin");
  let customRole = $state("");
  let isSubmittingUser = $state(false);
  let addUserError = $state("");
  
  // AD Search State
  let adSearchResults = $state<{username: string, name: string}[]>([]);
  let isSearchingAD = $state(false);
  let showADDropdown = $state(false);
  
  let searchTimeout: ReturnType<typeof setTimeout>;
  
  function handleUsernameInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    newUsername = val;
    
    if (val.length < 2) {
      adSearchResults = [];
      showADDropdown = false;
      return;
    }
    
    clearTimeout(searchTimeout);
    isSearchingAD = true;
    showADDropdown = true;
    
    searchTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(val)}`);
        if (res.ok) {
          const data = await res.json();
          adSearchResults = data.results || [];
        }
      } catch {
        adSearchResults = [];
      } finally {
        isSearchingAD = false;
      }
    }, 500); // 500ms debounce
  }

  function selectADUser(user: {username: string, name: string}) {
    newUsername = user.username;
    adSearchResults = [];
    showADDropdown = false;
  }

  async function addUser() {
    if (!newUsername.trim()) {
      addUserError = "Username is required";
      return;
    }
    
    isSubmittingUser = true;
    addUserError = "";
    
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername.trim(),
          role: newRole === 'other' ? customRole.trim() : newRole
        })
      });
      
      const data = await res.json();
      
      if (res.ok && !data.error) {
        isAddingUser = false;
        newUsername = "";
        newRole = "admin";
        await refreshUsers();
      } else {
        addUserError = data.error || data.message || "Failed to add user";
      }
    } catch {
      addUserError = "Network error while connecting to server";
    } finally {
      isSubmittingUser = false;
    }
  }

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

  // --- Next Cleanup Time Logic ---
  let nextCleanupTime = $state("");

  function updateNextCleanupTime() {
    const now = new Date();
    const nextTarget = new Date(now);
    
    if (now.getMinutes() >= 55) {
      nextTarget.setHours(now.getHours() + 1, 55, 0, 0);
    } else {
      nextTarget.setHours(now.getHours(), 55, 0, 0);
    }
    
    nextCleanupTime = nextTarget.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Bangkok'
    });
  }

  $effect(() => {
    updateNextCleanupTime();
    // Update every minute to keep it fresh if left open
    const interval = setInterval(updateNextCleanupTime, 60000);
    return () => clearInterval(interval);
  });
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
      <button
        onclick={() => (activeTab = "queue")}
        class="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 {activeTab === 'queue'
          ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-sm'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}"
      >
        <RefreshCw class="w-4 h-4 {activeTab === 'queue' ? 'animate-spin-slow' : ''}" />
        Live Queue
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
          class="px-4 py-3 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-500/30 transition-all disabled:opacity-50 flex items-center justify-center shrink-0"
          title="Refresh user list"
        >
          <RefreshCw class="w-4 h-4 {isRefreshing ? 'animate-spin' : ''}" />
        </button>
        <button
          onclick={() => (isAddingUser = true)}
          class="flex items-center gap-2 px-4 py-3 bg-purple-600 dark:bg-purple-500 text-white rounded-xl shadow-sm hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors shrink-0"
          title="Add allowed user"
        >
          <UserPlus class="w-4 h-4" />
          <span class="hidden sm:inline font-semibold text-sm">Add User</span>
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
                        >{user.name ? `${user.name}(${user.username})` : user.username}</span
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
                      {#if user.username === currentUsername}
                        <span class="text-xs text-gray-400 dark:text-gray-600 italic">You</span>
                      {:else if user.role.toLowerCase().includes("admin") && currentUsername !== "it66070030"}
                        <span class="text-xs text-gray-400 dark:text-gray-600 italic">Protected</span>
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
                These policies will be automatically deleted at the next cleanup time: <strong class="text-gray-700 dark:text-gray-300">{nextCleanupTime}</strong> (UTC+7)
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
              {expiredPolicies.length} expired polic{expiredPolicies.length === 1 ? "y" : "ies"} will be automatically deleted at the next cleanup time: <strong class="text-gray-700 dark:text-gray-300">{nextCleanupTime}</strong> (UTC+7)
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- ============== QUEUE TAB ============== -->
    {#if activeTab === "queue"}
      <div class="space-y-6">

        <div
          class="bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden"
        >
          <div class="p-6 pb-4 flex items-center justify-between">
            <div>
              <h3
                class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"
              >
                <RefreshCw
                  class="w-5 h-5 text-purple-500 dark:text-purple-400"
                />
                Live Creation Queue
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Real-time monitor of server load and active FortiGate configuration jobs. Auto-refreshes every 2s.
              </p>
            </div>
            <div class="flex gap-2">
              <button
                onclick={refreshQueue}
                disabled={isRefreshingQueue}
                class="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-500/30 transition-all disabled:opacity-50"
                title="Force refresh queue"
              >
                <RefreshCw
                  class="w-4 h-4 {isRefreshingQueue ? 'animate-spin' : ''}"
                />
              </button>
            </div>
          </div>

          {#if queueJobs.length === 0}
            <div class="p-8 pt-2 text-center">
              <Check
                class="w-10 h-10 text-green-400 dark:text-green-500 mx-auto mb-3"
              />
              <p
                class="text-gray-500 dark:text-gray-400 font-medium"
              >
                The queue is totally empty. Server is resting!
              </p>
            </div>
          {:else}
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr
                    class="bg-gray-50 dark:bg-gray-800/50 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    <th class="px-6 py-3">Job ID</th>
                    <th class="px-6 py-3">Policy Name</th>
                    <th class="px-6 py-3">Status</th>
                    <th class="px-6 py-3">Position</th>
                    <th class="px-6 py-3">Rooms Overlap Check</th>
                  </tr>
                </thead>
                <tbody
                  class="divide-y divide-gray-100 dark:divide-gray-800"
                >
                  {#each queueJobs as job}
                    <tr
                      class="hover:bg-purple-50/50 dark:hover:bg-purple-500/5 transition-colors"
                    >
                      <td
                        class="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-[120px]"
                        title={job.id}>{job.id}</td
                      >
                      <td
                        class="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white"
                      >
                        {job.metadata?.policyName || "Unknown"}
                        {#if job.error}
                          <p class="text-xs text-red-500 font-normal truncate max-w-[200px]" title={job.error}>{job.error}</p>
                        {/if}
                      </td>
                      <td class="px-6 py-4">
                        <span
                          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold 
                            {job.status === 'processing' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200' : ''}
                            {job.status === 'waiting' ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-200' : ''}
                            {job.status === 'completed' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 border border-green-200' : ''}
                            {job.status === 'failed' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200' : ''}"
                        >
                          {#if job.status === 'processing'}<RefreshCw class="w-3 h-3 animate-spin"/>{/if}
                          {#if job.status === 'waiting'}<Clock class="w-3 h-3"/>{/if}
                          {#if job.status === 'completed'}<Check class="w-3 h-3"/>{/if}
                          {#if job.status === 'failed'}<AlertTriangle class="w-3 h-3"/>{/if}
                          {job.status.toUpperCase()}
                        </span>
                      </td>
                      <td class="px-6 py-4 text-sm text-gray-500 font-mono">
                         {#if job.status === 'waiting'}
                            #{job.position}
                         {:else}
                            -
                         {/if}
                      </td>
                      <td class="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                        {#if job.metadata?.srcRooms}
                           {job.metadata.srcRooms.length} room{job.metadata.srcRooms.length === 1 ? '' : 's'}
                        {:else}
                           N/A
                        {/if}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
            <div class="p-4 text-center text-xs text-gray-400 dark:text-gray-500">
              {queueJobs.filter(j => j.status === 'waiting').length} waiting, {queueJobs.filter(j => j.status === 'processing').length} processing. (Completed/Failed jobs self-destruct after 5m)
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

<!-- Add User Modal -->
{#if isAddingUser}
  <div class="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-gray-900/50 backdrop-blur-sm transition-opacity">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden transform transition-all scale-100 opacity-100">
      <div class="px-6 py-6 sm:p-8">
        <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-purple-100 dark:bg-purple-500/20 rounded-full">
          <UserPlus class="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div class="text-center mb-6">
          <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Add New User</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Allow a new user from Active Directory to log in and manage policies.
          </p>
        </div>
        
        <div class="space-y-4 text-left">
          <div class="relative">
            <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username (ID) or Name</label>
            <input
              id="username"
              type="text"
              value={newUsername}
              oninput={handleUsernameInput}
              onfocus={() => { if (newUsername.length >= 2) showADDropdown = true; }}
              onblur={() => setTimeout(() => (showADDropdown = false), 200)}
              placeholder="e.g. itxxxxxx or Name"
              class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            />
            
            <!-- AD Search Dropdown -->
            {#if showADDropdown && (isSearchingAD || adSearchResults.length > 0)}
              <div class="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {#if isSearchingAD}
                  <div class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                    <RefreshCw class="w-4 h-4 animate-spin" /> Searching AD...
                  </div>
                {:else if adSearchResults.length > 0}
                  <ul class="py-1">
                    {#each adSearchResults as adUser}
                      <li>
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div 
                          onclick={() => selectADUser(adUser)}
                          class="px-4 py-2 hover:bg-purple-50 dark:hover:bg-purple-500/10 cursor-pointer flex flex-col"
                        >
                          <span class="text-sm font-semibold text-gray-900 dark:text-white">{adUser.name}</span>
                          <span class="text-xs text-gray-500 dark:text-gray-400">{adUser.username}</span>
                        </div>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
            {/if}
          </div>
          <div>
            <label for="role" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <select
              id="role"
              bind:value={newRole}
              class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            >
              <option value="admin">Admin</option>
              <option value="TA">TA</option>
              <option value="lecturer">Lecturer</option>
              <option value="other">Other (Custom)</option>
            </select>
            
            {#if newRole === 'other'}
              <div class="mt-3 animate-in fade-in slide-in-from-top-1">
                <label for="customRole" class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Custom Role Name</label>
                <input
                  id="customRole"
                  type="text"
                  bind:value={customRole}
                  placeholder="e.g. SuperAdmin"
                  class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>
            {/if}
            
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-1.5 ml-1">
              {#if newRole === 'admin'}
                Admins have full global system access.
              {:else if newRole === 'TA'}
                TAs can manage policies for specific courses.
              {:else if newRole === 'other'}
                Type a custom role name for this user.
              {:else}
                Lecturers are restricted to default permissions.
              {/if}
            </p>
          </div>
          {#if addUserError}
            <div class="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
              <p class="text-xs text-red-600 dark:text-red-400 font-semibold">{addUserError}</p>
            </div>
          {/if}
        </div>
        
        <div class="mt-8 flex gap-3">
          <button
            onclick={() => {
              isAddingUser = false;
              addUserError = "";
              newUsername = "";
              newRole = "admin";
              customRole = "";
              adSearchResults = [];
            }}
            disabled={isSubmittingUser}
            class="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onclick={addUser}
            disabled={isSubmittingUser || !newUsername.trim() || (newRole === 'other' && !customRole.trim())}
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors disabled:opacity-50"
          >
            {#if isSubmittingUser}
              <RefreshCw class="w-5 h-5 animate-spin" />
              Adding...
            {:else}
              Add User
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
