<script lang="ts">
  export let title = '';
  export let padding = true;
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200">
  {#if title}
    <div class="px-6 py-4 border-b border-gray-200">
      <h2 class="text-lg font-semibold text-gray-900">{title}</h2>
    </div>
  {/if}

  <div class:px-6={padding} class:py-4={padding} class:p-0={!padding}>
    <slot />
  </div>
</div>
