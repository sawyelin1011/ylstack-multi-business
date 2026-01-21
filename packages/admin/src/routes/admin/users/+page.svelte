<script lang="ts">
  import MainLayout from '$lib/layouts/MainLayout.svelte';
  import { onMount } from 'svelte';
  import { api } from '$lib/api/client';
  import { isAuthenticated, isAdmin } from '$lib/auth/store';
  import { goto } from '$app/navigation';

  onMount(async () => {
    if (!$isAuthenticated) {
      goto('/login');
      return;
    }

    if (!$isAdmin) {
      goto('/');
      return;
    }
  });
</script>

<MainLayout>
  <div class="mb-6">
    <h1 class="text-3xl font-bold text-gray-900">Users</h1>
    <p class="mt-2 text-gray-600">Manage platform users</p>
  </div>

  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
    <p class="text-gray-600">User management interface coming soon.</p>
  </div>
</MainLayout>
