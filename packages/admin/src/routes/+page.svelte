<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { auth, isAuthenticated, user } from '$lib/auth/store';
  import { goto } from '$app/navigation';
  import Card from '$lib/components/Card.svelte';

  onMount(() => {
    if (!$isAuthenticated) {
      goto('/login');
    }
  });

  let stats = [
    { label: 'Total Users', value: '0', icon: 'Users' },
    { label: 'Active Plugins', value: '0', icon: 'Puzzle' },
    { label: 'Published Pages', value: '0', icon: 'FileText' },
    { label: 'Forms', value: '0', icon: 'Layout' },
  ];
</script>

<main class="p-6">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
    <p class="mt-2 text-gray-600">Welcome back, {$user?.name || 'Admin'}</p>
  </div>

  <!-- Stats cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    {#each stats as stat}
      <Card>
        <div class="flex items-center">
          <div class="p-3 bg-primary-100 rounded-lg">
            <span class="text-2xl">{stat.icon}</span>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">{stat.label}</p>
            <p class="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        </div>
      </Card>
    {/each}
  </div>

  <!-- Quick actions -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card title="Quick Actions">
      <div class="space-y-4">
        <a
          href="/admin/users"
          class="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span class="text-2xl mr-4">Users</span>
          <div>
            <p class="font-medium text-gray-900">Manage Users</p>
            <p class="text-sm text-gray-600">Add, edit, or remove users</p>
          </div>
        </a>

        <a
          href="/admin/plugins"
          class="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span class="text-2xl mr-4">Puzzle</span>
          <div>
            <p class="font-medium text-gray-900">Manage Plugins</p>
            <p class="text-sm text-gray-600">Install, configure, or disable plugins</p>
          </div>
        </a>

        <a
          href="/admin/settings"
          class="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span class="text-2xl mr-4">Settings</span>
          <div>
            <p class="font-medium text-gray-900">Platform Settings</p>
            <p class="text-sm text-gray-600">Configure your platform</p>
          </div>
        </a>
      </div>
    </Card>

    <Card title="Recent Activity">
      <div class="space-y-4">
        <div class="flex items-start">
          <div class="flex-shrink-0 w-2 h-2 mt-2 bg-primary-600 rounded-full"></div>
          <div class="ml-3">
            <p class="text-sm text-gray-900">System initialized</p>
            <p class="text-xs text-gray-500">Just now</p>
          </div>
        </div>

        <div class="flex items-start">
          <div class="flex-shrink-0 w-2 h-2 mt-2 bg-gray-400 rounded-full"></div>
          <div class="ml-3">
            <p class="text-sm text-gray-900">Plugins loaded</p>
            <p class="text-xs text-gray-500">1 minute ago</p>
          </div>
        </div>

        <div class="flex items-start">
          <div class="flex-shrink-0 w-2 h-2 mt-2 bg-gray-400 rounded-full"></div>
          <div class="ml-3">
            <p class="text-sm text-gray-900">Database connected</p>
            <p class="text-xs text-gray-500">2 minutes ago</p>
          </div>
        </div>
      </div>
    </Card>
  </div>
</main>
