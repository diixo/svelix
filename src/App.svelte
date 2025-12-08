
<script>
  import { onMount, onDestroy } from 'svelte';
  import { patTest, patSave, getPat, treeBySpace, resolveRoot, selection, evaluate, pull, build, activate, getStatus } from './aspice/confluenceApi.js';
  import ApisTreePickerModal from './aspice/ApisTreePickerModal.svelte';

  import svelteLogo from './assets/svelte.svg'
  import viteLogo from '/vite.svg'
  import Counter from './lib/Counter.svelte'
  import About   from './lib/About.svelte'
  import { clientLog } from './lib/utils/clientLog.js';

  let page = 'home'; // 'home' или 'about'
  let confluenceHost = '';
  let patToken = '';
  let space = 'SWT1AQ';
  let testResult = '';
  let saveResult = '';
  let hasPat = false;
  let selectedIds = new Set();
  let selectedCount = 0;
  let stopLabelsText = '';
  let pickerRef;

  let stage = 'idle';
  let plan = {}; let delta = {};
  let progress = { total: 0, done: 0 };
  let elapsedSec = 0;
  let etaSec = 0;
  let phase = '';
  let _prevStage = 'idle';
  let pollTimer;
  let lastLogged = { stage: '', done: -1, evalDisabled: null };

  let lastPullSummary = null; // { progress, elapsedSec, ts }
  let showDetails = { pull: false, build: false, activate: false };
  let history = { pull: [], build: [], activate: [] };
  let selectedDelta = { added: 0, changed: 0, deleted: 0 };


  function formatTime(sec) {
    if (!sec || sec <= 0) return '0s';
    const s = Math.floor(sec % 60);
    const m = Math.floor(sec / 60);
    if (m > 0) {
      return `${m}m ${s}s`;
    }
    return `${s}s`;
  }

  async function doTest() {
    clientLog('apis_panel_pat', { action: 'test', host: confluenceHost.length, tokenProvided: !!patToken });
    testResult = 'Testing...';
    try {
      const r = await patTest(confluenceHost, patToken);
      testResult = r.ok ? 'OK' : `Error: ${r.error || 'unknown'}`;
      clientLog('apis_panel_pat', { action: 'test_result', ok: !!r.ok, error: r.error || null });
    } catch (e) {
      testResult = `Error: ${e?.message || e || 'network'}`;
      clientLog('apis_panel_pat', { action: 'test_error', error: e?.message || String(e) });
    }
  }

  async function doSave() {
    clientLog('apis_panel_pat', { action: 'save', host: confluenceHost.length, tokenProvided: !!patToken });
    saveResult = 'Saving...';
    try {
      const r = await patSave(confluenceHost, patToken);
      saveResult = r.ok ? 'Saved' : 'Failed';
      clientLog('apis_panel_pat', { action: 'save_result', ok: !!r.ok });
    } catch (e) {
      saveResult = `Failed`;
      clientLog('apis_panel_pat', { action: 'save_error', error: e?.message || String(e) });
    }
  }

  async function openTree() {
    clientLog('apis_panel_picker: openTree(modal)', { action: 'open', space });
    await pickerRef?.show();
  }

  function toggleSelect(id) {
    if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
  }

  async function saveSelection() {
    const arr = Array.from(selectedIds);
    const stop_labels = (stopLabelsText || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    // Extend body to include filters; backend ignores unknown fields safely
    await fetch('http://127.0.0.1:8001/confluence/selection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ space, include_ids: arr, exclude_ids: [], stop_labels }),
    });
    selectedCount = arr.length;
    clientLog('apis_panel_picker', { action: 'save_selection', space, count: selectedCount });
    const addCount = (delta.added || []).filter((id) => selectedIds.has(id)).length;
    const chgCount = (delta.changed || []).filter((id) => selectedIds.has(id)).length;
    const delCount = (delta.deleted || []).filter((id) => selectedIds.has(id)).length;
    selectedDelta = { added: addCount, changed: chgCount, deleted: delCount };
  }

  async function loadSavedSelection() {
    try {
      const res = await fetch(`http://127.0.0.1:8001/confluence/selection?space=${encodeURIComponent(space)}`);
      const data = await res.json();
      const ids = Array.isArray(data?.include_ids) ? data.include_ids : [];
      selectedIds = new Set(ids);
      selectedCount = ids.length;
      const sl = Array.isArray(data?.stop_labels) ? data.stop_labels : [];
      stopLabelsText = sl.join(', ');
      const addCount = (delta.added || []).filter((id) => selectedIds.has(id)).length;
      const chgCount = (delta.changed || []).filter((id) => selectedIds.has(id)).length;
      const delCount = (delta.deleted || []).filter((id) => selectedIds.has(id)).length;
      selectedDelta = { added: addCount, changed: chgCount, deleted: delCount };
      clientLog('apis_panel_picker', { action: 'loaded_saved_selection_main', count: selectedCount });
    } catch {}
  }

  async function runEvaluate() {
    clientLog('apis_panel_pipeline', { action: 'evaluate_click', space });
    const rid = await resolveRoot(space);
    const resp = await evaluate(space, rid, 10);
    clientLog('apis_panel_pipeline', { action: 'evaluate_start', space, run_id: resp?.run_id || null, ok: !!resp?.ok });
  }

  async function runPull() {
    clientLog('apis_panel_pipeline', { action: 'pull_click', space });
    const resp = await pull(space, 10);
    clientLog('apis_panel_pipeline', { action: 'pull_start', space, run_id: resp?.run_id || null, ok: !!resp?.ok });
  }

  async function fetchHistory(cmd) {
    try {
      const res = await fetch(`http://127.0.0.1:8001/confluence/history?space=${encodeURIComponent(space)}&cmd=${encodeURIComponent(cmd)}&lines=120`);
      const d = await res.json();
      history[cmd] = Array.isArray(d?.lines) ? d.lines : [];
      clientLog('apis_panel_pipeline', { action: 'history', cmd, lines: history[cmd].length });
    } catch {}
  }

  async function runBuild() {
    clientLog('apis_panel_pipeline', { action: 'build_click', space });
    const resp = await build(space);
    clientLog('apis_panel_pipeline', { action: 'build_start', space, run_id: resp?.run_id || null, ok: !!resp?.ok });
  }

  async function runActivate() {
    clientLog('apis_panel_pipeline', { action: 'activate_click', space });
    const resp = await activate(space);
    clientLog('apis_panel_pipeline', { action: 'activate_start', space, run_id: resp?.run_id || null, ok: !!resp?.ok });
  }

  async function pollStatus() {
    const r = await getStatus(space);
    stage = r.stage || 'idle';
    plan = r.plan || {}; delta = r.delta || {};
    if (selectedCount) {
      const addCount = (delta.added || []).filter((id) => selectedIds.has(id)).length;
      const chgCount = (delta.changed || []).filter((id) => selectedIds.has(id)).length;
      const delCount = (delta.deleted || []).filter((id) => selectedIds.has(id)).length;
      selectedDelta = { added: addCount, changed: chgCount, deleted: delCount };
    }
    progress = r.progress || { total: 0, done: 0 };
    elapsedSec = typeof r.elapsed_sec === 'number' ? r.elapsed_sec : 0;
    etaSec = typeof r.eta_sec === 'number' ? r.eta_sec : 0;
    phase = r.phase || '';
    const evalDisabled = (!space) || (stage === 'evaluate');
    if (lastLogged.stage !== stage || lastLogged.done !== progress.done || lastLogged.evalDisabled !== evalDisabled) {
      clientLog('confluence_progress', {
        stage, phase, progress, elapsedSec, etaSec,
        pages: plan?.pages || 0,
        added: (delta?.added || []).length,
        changed: (delta?.changed || []).length,
        deleted: (delta?.deleted || []).length,
        evaluateDisabled: evalDisabled,
      });
      lastLogged = { stage, done: progress.done, evalDisabled };
    }
    // Capture a terminal Pull summary if the stage just left 'pull'
    if (_prevStage === 'pull' && stage !== 'pull' && (progress?.total || 0) > 0) {
      lastPullSummary = { progress: { ...progress }, elapsedSec: elapsedSec || 0, ts: Date.now() / 1000 };
      clientLog('apis_panel_pipeline', { action: 'pull_summary', summary: lastPullSummary });
    }
    _prevStage = stage;
  }


  onMount(() => {
    // Внутренний async — правильный способ
    (async () => {
      try {
        const r = await getPat();
        if (r && r.ok) {
          confluenceHost = r.confluence_host || '';
          hasPat = !!r.has_token;
        }
        clientLog('apis_panel_init', { space, hostPresent: !!confluenceHost, hasPat });
      } catch {}

      // Poll faster to keep UI responsive and avoid perceived stalls
      pollTimer = setInterval(pollStatus, 500);

      // Load saved selection so counts persist across sessions
      await loadSavedSelection();

      try {
        // E2E helpers
        window.__openConfluencePicker = async () => {
          await pickerRef?.show();
        };
      } catch {}
    })();
  });

  onDestroy(() => {
    clientLog('Component was destroyed', {});
  });
</script>

<nav class="d-flex gap-2 p-5">
  <button class="btn btn-gray px-4" on:click={() => page = 'home'}>Main</button>
  <button class="btn btn-gray px-4" on:click={() => page = 'about'}>About-section</button>
  <button class="btn btn-primary px-4" data-testid="choose-pages-btn" on:click={openTree} disabled={!space}>Choose Pages…</button>
</nav>

<ApisTreePickerModal bind:this={pickerRef} {space} initialSelected={Array.from(selectedIds)} on:save={(e) => {
  selectedIds = new Set(e.detail.selected || []);
  saveSelection();
  }} />

<main class="px-5">
{#if page === 'home'}
  <Counter />
{:else if page === 'about'}
  <About />
{/if}


  <div class="mt-3 flex items-center gap-3">
    <div class="text-sm opacity-80">Stage: <b>{stage}</b>{#if phase}&nbsp;<span class="opacity-60">({phase})</span>{/if} · Pages: {plan.pages || 0} Added: {(delta.added || []).length} Changed: {(delta.changed || []).length} Deleted: {(delta.deleted || []).length}</div>
  </div>
</main>


