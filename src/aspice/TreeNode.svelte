<script>
  export let id;
  export let depth = 0;
  export let node;
  export let toggleNode;
  export let setFocus = () => {};
  export let expandNode;

  // Для загрузки дочерних:
  export let getNode;

  const hasChildren = node?.children?.length > 0;
</script>

{#if node}
<li class="tree-node-item" style="padding-left: {depth * 1}rem">
  
  <div class="d-flex align-items-start gap-2">

    <!-- Иконка раскрытия -->
    <span
      class="collapse-icon"
      role="button"
      on:click={(e) => { 
        e.stopPropagation(); 
        expandNode(id); 
      }}>
      {#if hasChildren}
        {node.expanded ? '▾' : '▸'}
      {/if}
    </span>

    <!-- Чекбокс -->
    <input
      type="checkbox"
      class="form-check-input mt-1"
      checked={node.checked}
      indeterminate={node.indeterminate}
      on:change={() => toggleNode(id)}
    />

    <!-- Текст -->
    <label class="node-label select-text">
      {node.title}
      {#if node.required}
        <span class="opacity-75">(required)</span>
      {/if}
    </label>
  </div>

  <!-- Дочерние -->
  {#if hasChildren}
    <ul class={node.expanded ? "" : "d-none"} id={"children-" + id}>
      {#each node.children as childId}
        <svelte:self 
          id={childId}
          depth={depth + 1}
          node={getNode(childId)}
          {expandNode}
          {toggleNode}
          {getNode}
        />
      {/each}
    </ul>
  {/if}

</li>
{/if}

<style>
  .installer-row:focus { outline: 2px solid hsl(var(--p)); outline-offset: 1px; }
</style>
