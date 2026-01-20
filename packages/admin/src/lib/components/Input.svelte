<script lang="ts">
  export let type: 'text' | 'email' | 'password' = 'text';
  export let name = '';
  export let label = '';
  export let placeholder = '';
  export let value = '';
  export let error = '';
  export let required = false;

  let id = name || label.toLowerCase().replace(/\s+/g, '-');
</script>

<div class="mb-4">
  {#if label}
    <label for={id} class="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {#if required}
        <span class="text-red-500">*</span>
      {/if}
    </label>
  {/if}

  <input
    {type}
    {id}
    {name}
    {placeholder}
    {value}
    {required}
    class:ring-red-500={error}
    class:border-red-500={error}
    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
    on:input
  />

  {#if error}
    <p class="mt-1 text-sm text-red-600">{error}</p>
  {/if}
</div>
