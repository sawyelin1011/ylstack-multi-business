<script lang="ts">
  import { page } from '$app/stores';
  import Sidebar from '../components/Sidebar.svelte';
  import TopNav from '../components/TopNav.svelte';
  import UserMenu from '../components/UserMenu.svelte';
  import { onMount } from 'svelte';

  let sidebarOpen = false;

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      sidebarOpen = !isMobile;
    }
  });
</script>

<div class="min-h-screen bg-gray-50">
  <div class="flex min-h-screen">
    <!-- Mobile sidebar backdrop -->
    {#if sidebarOpen}
      <div
        class="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
        on:click={() => (sidebarOpen = false)}
      ></div>
    {/if}

    <!-- Sidebar -->
    <Sidebar {sidebarOpen} on:close={() => (sidebarOpen = false)} />

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Top navigation -->
      <TopNav on:menuClick={toggleSidebar} />

      <!-- Page content -->
      <main class="flex-1 p-4 md:p-6 lg:p-8">
        <slot />
      </main>
    </div>
  </div>
</div>

<style>
  @import 'tailwindcss/tailwind.css';
</style>
