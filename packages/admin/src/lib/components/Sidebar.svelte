<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  export let sidebarOpen: boolean;

  interface NavItem {
    path: string;
    label: string;
    icon?: string;
    permissions?: string[];
  }

  const navigation: NavItem[] = [
    { path: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
    { path: '/admin/users', label: 'Users', icon: 'Users' },
    { path: '/admin/plugins', label: 'Plugins', icon: 'Puzzle' },
    { path: '/admin/settings', label: 'Settings', icon: 'Settings' },
  ];

  let currentPath = '/';

  $: currentPath = $page.url.pathname;
</script>

<aside
  class="fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0"
  class:translate-x-0={sidebarOpen}
  class:-translate-x-full={!sidebarOpen}
>
  <!-- Logo -->
  <div class="flex items-center justify-center h-16 border-b border-gray-200">
    <span class="text-xl font-bold text-gray-800">YLStack Admin</span>
  </div>

  <!-- Navigation -->
  <nav class="p-4 space-y-1">
    {#each navigation as item}
      <a
        href={item.path}
        class="flex items-center px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
        class:bg-primary-50={currentPath === item.path}
        class:text-primary-700={currentPath === item.path}
      >
        <span class="mr-3">{item.icon}</span>
        <span>{item.label}</span>
      </a>
    {/each}
  </nav>
</aside>
