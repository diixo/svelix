<style>
  .node-children { margin-left: 1.5rem; list-style: none; padding-left: 0; }
</style>

<script>

  import { createEventDispatcher } from 'svelte';
  import { tick } from 'svelte';

  import TreeNode from './TreeNode.svelte';
  import { clientLog } from '../lib/utils/clientLog.js';

  import * as bootstrap from 'bootstrap';

  export let space = '';
  export let initialSelected = [];
  export let requiredIds = [];


  const dispatch = createEventDispatcher();

  let modalInstance; // bootstrap.Modal instance
  let modalEl;       // DOM element <div id="pickerModal">

  // Node state: id -> { id, title, expanded, loading, loaded, checked, indeterminate, children: string[] }
  let nodes = new Map();
  let parentMap = new Map(); // childId -> parentId
  let rootId = '';
  let rootChildren = [];
  let errorMsg = '';
  let selectedSet;
  let installType = 'Custom'; // Full | Minimal | Custom
  let focusedId = '';
  let savedIds = [];

  function countTreeItems() {
    try {
      if (!modalEl) return 0;
      return modalEl.querySelectorAll('[role="treeitem"]').length;
    } catch {
      return 0;
    }
  }

  function initModal() {
    if (!modalInstance) {
      modalInstance = new bootstrap.Modal(modalEl, {
        backdrop: 'static',
        keyboard: false,
      });
    }
  }

  function showModal() {
    initModal();
    modalInstance?.show();
  }

  function closeModal() {
    clientLog('apis_panel_picker: close_modal', {});
    modalInstance?.hide();
  }


  function resetState() {
    nodes = new Map();
    parentMap = new Map();
    rootId = '';
    rootChildren = [];
    errorMsg = '';
    selectedSet = new Set(initialSelected || []);
  }

  export async function show() {
    resetState();
    await loadRoot();
    clientLog('apis_panel_picker: open_modal', { action: 'open_modal', space });
    // Load previously saved selection for preview
    try {
      const selRes = await fetch(`http://127.0.0.1:8001/confluence/selection?space=${encodeURIComponent(space)}`);
      const sel = await selRes.json();
      savedIds = Array.isArray(sel?.include_ids) ? sel.include_ids : [];
      clientLog('apis_panel_picker', { action: 'loaded_saved_selection', count: savedIds.length });
    } catch {}
    try {
      showModal();
    }
    catch (e) {
      errorMsg = e?.message || String(e || 'modal unknown error');
      clientLog('apis_panel_picker', { action: 'load_modal_error', error: errorMsg });
    }
    try {
      await tick();
      clientLog('apis_panel_picker', { action: 'treeitem_count_initial', count: countTreeItems() });
    } catch {}
    try {
      // E2E helpers
      window.__expandFirstConfluenceNode = async () => {
        if (rootChildren && rootChildren.length) {
          await expandNode(rootChildren[0]);
        }
      };
    } catch {}
  }


  export async function loadRoot() {
    errorMsg = '';
    try {
      // Try full cached tree first
      clientLog('apis_panel_picker', { action: 'load_root_full_attempt', space });
      const resFull = await fetch(`http://127.0.0.1:8001/confluence/tree/full?space=${encodeURIComponent(space)}`);
      clientLog('apis_panel_picker', { action: 'load_root_full_response', status: resFull.status, ok: resFull.ok });
      if (resFull.ok) {
        const d = await resFull.json();
        if (d && d.ok) {
          rootId = String(d.root_page_id || '');
          const nodesObj = d.nodes || {};
          for (const pid of Object.keys(nodesObj)) {
            const meta = nodesObj[pid] || {};
            nodes.set(pid, {
              id: pid,
              title: meta.title || pid,
              expanded: false,
              loading: false,
              loaded: true,
              checked: selectedSet.has(pid),
              indeterminate: false,
              required: (requiredIds || []).includes(pid),
              children: (meta.children || []).map(String),
            });
          }
          rootChildren = (nodesObj[rootId]?.children || []).map(String);
          nodes = new Map(nodes);
          clientLog('apis_panel_picker', { action: 'load_root_full', nodes: nodes.size, rootChildren: rootChildren.length, sample: rootChildren.slice(0,5) });
          return;
        }
      }
      // Fallback to lazy loading of root children
      clientLog('apis_panel_picker', { action: 'load_root_lazy_attempt', space });
      const res = await fetch(`http://127.0.0.1:8001/confluence/tree?space=${encodeURIComponent(space)}`);
      clientLog('apis_panel_picker', { action: 'load_root_lazy_response', status: res.status, ok: res.ok });
      const data = await res.json();
      if (!data || data.ok === false) { errorMsg = data?.detail || 'Failed to load tree'; return; }
      rootId = data.root_page_id || '';
      const children = data.children || [];
      rootChildren = children.map(c => String(c.id));
      for (const c of children) {
        const id = String(c.id);
        const isReq = (requiredIds || []).includes(id);
        nodes.set(id, { id, title: c.title || id, expanded: false, loading: false, loaded: false, checked: selectedSet.has(id), indeterminate: false, required: isReq, children: [] });
        parentMap.set(id, rootId || '__root__');
      }
      nodes = new Map(nodes);
      clientLog('apis_panel_picker', { action: 'load_root_lazy', rootId, children: rootChildren.length, sample: rootChildren.slice(0,5) });
    } catch (e) {
      errorMsg = e?.message || String(e || 'network error');
      clientLog('apis_panel_picker', { action: 'load_root_error', error: errorMsg });
    }
  }

  async function expandNode(id) {
    const n = nodes.get(id);
    if (!n) return;
    const before = countTreeItems();
    clientLog('apis_panel_picker', { action: 'expand_click', id, before });
    if (n.loaded) {
      n.expanded = !n.expanded; nodes.set(id, { ...n }); nodes = new Map(nodes);
      try { await tick(); } catch {}
      const after = countTreeItems();
      clientLog('apis_panel_picker', { action: 'expand_node_toggle_loaded', id, expanded: n.expanded, before, after, delta: after - before });
      return;
    }
    n.loading = true; nodes.set(id, { ...n }); nodes = new Map(nodes);
    try {
      clientLog('apis_panel_picker', { action: 'expand_node_start', id, space });
      const url = `http://127.0.0.1:8001/confluence/tree?space=${encodeURIComponent(space)}&root_page_id=${encodeURIComponent(id)}`;
      const res = await fetch(url);
      clientLog('apis_panel_picker', { action: 'expand_node_response', id, status: res.status, ok: res.ok });
      const data = await res.json();
      const children = data.children || [];
      n.children = children.map(c => String(c.id));
      clientLog('apis_panel_picker', { action: 'expand_node_children', id, count: children.length, sample: children.slice(0,5).map(c => ({ id: c.id, title: c.title })) });
      for (const c of children) {
        const cid = String(c.id);
        // default to parent's checked state if parent is checked and child not explicitly selected
        const childChecked = selectedSet.has(cid) || n.checked;
        nodes.set(cid, {
          id: cid,
          title: c.title || cid,
          expanded: false,
          loading: false,
          loaded: false,
          checked: childChecked,
          indeterminate: false,
          required: (requiredIds || []).includes(cid),
          children: [],
        });
        parentMap.set(cid, id);
      }
      n.loaded = true;
      n.loading = false;
      n.expanded = true;
      nodes.set(id, { ...n });
      nodes = new Map(nodes);
      try { await tick(); } catch {}
      const after = countTreeItems();
      clientLog('apis_panel_picker', { action: 'expand_node', id, children: n.children.length, before, after, delta: after - before });
    } catch (e) {
      n.loading = false; nodes.set(id, { ...n }); nodes = new Map(nodes);
      clientLog('apis_panel_picker', { action: 'expand_node_error', id, error: e?.message || String(e) });
    }
  }

  function setDescendants(id, value) {
    const n = nodes.get(id);
    if (!n) return;
    for (const cid of n.children) {
      const cn = nodes.get(cid);
      if (!cn) continue;
      cn.checked = value;
      cn.indeterminate = false;
      setDescendants(cid, value);
    }
    // After cascading, reassign nodes map to trigger reactivity
    nodes = new Map(nodes);
  }

  function recomputeParent(id) {
    const pid = parentMap.get(id);
    if (!pid || pid === '__root__') return;
    // Inspect siblings
    let pnode = nodes.get(pid);
    if (!pnode) return;
    let total = pnode.children.length;
    let checked = 0, ind = 0;
    for (const sid of pnode.children) {
      const sn = nodes.get(sid);
      if (!sn) continue;
      if (sn.indeterminate) ind++;
      else if (sn.checked) checked++;
    }
    if (checked === total && total > 0) {
      pnode.checked = true; pnode.indeterminate = false;
    } else if (checked === 0 && ind === 0) {
      pnode.checked = false; pnode.indeterminate = false;
    } else {
      pnode.checked = false; pnode.indeterminate = true;
    }
    nodes.set(pid, { ...pnode });
    nodes = new Map(nodes);
    recomputeParent(pid);
  }

  function toggleNode(id) {
    const n = nodes.get(id);
    if (!n) return;
    const before = countTreeItems();
    if (n.required) { n.checked = true; n.indeterminate = false; nodes.set(id, { ...n }); nodes = new Map(nodes); clientLog('apis_panel_picker', { action: 'toggle_node', id, checked: n.checked, before, after: countTreeItems() }); return; }
    n.checked = !n.checked;
    n.indeterminate = false;
    // cascade to children if loaded
    setDescendants(id, n.checked);
    // bubble up
    nodes.set(id, { ...n });
    nodes = new Map(nodes);
    recomputeParent(id);
    try { clientLog('apis_panel_picker', { action: 'toggle_node', id, checked: n.checked, before, after: countTreeItems() }); } catch {}
  }

  function selectedCount() {
    let count = 0;
    for (const [, n] of nodes) if (n.checked) count++;
    return count;
  }

  function onSave() {
    const sel = [];
    for (const [id, n] of nodes) if (n.checked) sel.push(id);
    dispatch('save', { selected: sel });
    close();
    clientLog('apis_panel_picker', { action: 'save_modal', selected: sel.length });
  }

  function setFocus(id) { focusedId = id; }

  function applyInstallType() {
    if (installType === 'Custom') return;
    if (installType === 'Full') {
      for (const [id, n] of nodes) { n.checked = true; n.indeterminate = false; nodes.set(id, { ...n }); }
    } else if (installType === 'Minimal') {
      for (const [id, n] of nodes) { n.checked = !!n.required; n.indeterminate = false; nodes.set(id, { ...n }); }
    }
    nodes = new Map(nodes);
    clientLog('apis_panel_picker', { action: 'apply_install_type', installType });
  }
</script>


<div class="modal fade" tabindex="-1" bind:this={modalEl}>
  <div class="modal-dialog modal-xl">
    <div class="modal-content">

      <div class="modal-body">

        {#if errorMsg}
          <div class="alert alert-danger py-1">{errorMsg}</div>
        {/if}

        <div class="mt-2 small text-muted">
          Space: <b>{space}</b> · Selected: {selectedCount()}
        </div>

        {#if savedIds && savedIds.length}
          <div class="text-muted small mb-2">
            Current saved selection: {savedIds.length} item(s).
          </div>
        {/if}

        <!-- TREE AREA -->
        <div class="border rounded-3 pb-3 pt-4 bg-light" style="max-height: 60vh; overflow-y: auto;" role="tree" aria-multiselectable="true">
          <div id="treeRoot">
            <ul class="node-children">
          {#if rootChildren.length}
            {#each rootChildren as cid}
              <TreeNode
                id={cid}
                node={nodes.get(cid)}
                nodes={nodes}
                getNode={(i) => nodes.get(i)}
                onToggle={toggleNode}
                onExpand={expandNode}
              />
            {/each}
          {:else}
            <div class="small text-muted">No children under space home.</div>
          {/if}
            </ul>
          </div>
        </div>

        <!-- DESCRIPTION AREA -->
        <div class="border p-2 bg-light mt-3" style="min-height: 6rem;">
          <div class="text-primary small fw-bold mb-1">Description</div>

          {#if focusedId}
            <div class="small">
              <b>{nodes.get(focusedId)?.title}</b> — Page ID: {focusedId}
            </div>
          {:else}
            <div class="small text-muted">
              Position your mouse over a component to see its description.
            </div>
          {/if}
        </div>

      </div>

      <!--
      <div class="modal-body">Tree Modal</div>
      -->
      <div class="modal-footer">
        <button class="btn btn-primary" on:click={onSave}>Save</button>
        <button class="btn btn-secondary" on:click={closeModal}>Cancel</button>
      </div>
    </div>
  </div>
</div>

<!-- removed inline macro; using TreeNode component -->
<!--
<style>
  :global(.modal .modal-box) { padding-top: 1rem; }
</style>
-->