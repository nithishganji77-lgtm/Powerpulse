import { Component, lazy, Suspense, useCallback, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { useAllTransformers, useDashboardSummary, useLocations } from '@/hooks/useMonitoring';
import { DetailPanel } from '@/three/DetailPanel';
import { Grid2D } from '@/three/Grid2D';
import { GridControls, GridLegend, GridStats, TransformerList, type RenderMode } from '@/three/GridHud';
import type { ViewMode } from '@/three/CameraRig';
import { DEFAULT_FILTER, fromTransformer, matchesFilter, statsFromSummary, type GridFilter } from '@/three/utils';
import { useRenderCapabilities } from '@/three/webgl';
import type { TransformerStatus } from '@/types/api';

// three.js + R3F live in this chunk and are only fetched when the 3D view is actually used.
const GridScene = lazy(() => import('@/three/GridScene'));

class SceneErrorBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-base/70" role="status" aria-live="polite">
      <span className="inline-flex items-center gap-2 font-mono text-label uppercase text-fg-muted">
        <Loader2 size={14} className="motion-safe:animate-spin" aria-hidden="true" />
        {children}
      </span>
    </div>
  );
}

export default function GridPage() {
  const caps = useRenderCapabilities();
  const transformersQ = useAllTransformers();
  const summaryQ = useDashboardSummary();
  const locationsQ = useLocations();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('focus');

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filter, setFilter] = useState<GridFilter>(DEFAULT_FILTER);
  const [highlightFaults, setHighlightFaults] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(selectedId ? 'individual' : 'overview');
  const [cameraToken, setCameraToken] = useState(0);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [renderMode, setRenderMode] = useState<RenderMode>(caps.webgl && !caps.lowEnd ? '3d' : '2d');
  const use3d = renderMode === '3d' && caps.webgl && !sceneFailed;

  const transformers = useMemo(() => transformersQ.data ?? [], [transformersQ.data]);
  const nodes = useMemo(() => transformers.map(fromTransformer), [transformers]);
  const visibleNodes = useMemo(() => nodes.filter((n) => matchesFilter(n, filter)), [nodes, filter]);
  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);
  const selected = useMemo(() => transformers.find((t) => t.id === selectedId) ?? null, [transformers, selectedId]);
  const stats = statsFromSummary(summaryQ.data, nodes);
  const counts = useMemo(() => {
    const c: Partial<Record<TransformerStatus, number>> = {};
    for (const n of nodes) c[n.status] = (c[n.status] ?? 0) + 1;
    return c;
  }, [nodes]);
  const locations = useMemo(
    () => locationsQ.data ?? [...new Set(nodes.map((n) => n.location))].sort(),
    [locationsQ.data, nodes],
  );

  const setFocusParam = useCallback(
    (id: string | null) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) next.set('focus', id);
          else next.delete('focus');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const select = useCallback(
    (id: string) => {
      setFocusParam(id);
      setViewMode('individual');
      setCameraToken((t) => t + 1);
    },
    [setFocusParam],
  );

  const clearSelection = useCallback(() => {
    if (!selectedId) return;
    setFocusParam(null);
    setViewMode('overview');
  }, [selectedId, setFocusParam]);

  const focusSelected = useCallback(() => {
    setViewMode('individual');
    setCameraToken((t) => t + 1);
  }, []);

  const resetCamera = useCallback(() => {
    setViewMode('overview');
    setCameraToken((t) => t + 1);
  }, []);

  const onSceneError = useCallback(() => setSceneFailed(true), []);
  const onSceneReady = useCallback(() => setSceneReady(true), []);

  const unknownFocus = !!selectedId && transformersQ.isSuccess && !selected;

  let notice: string | null = null;
  if (!caps.webgl) notice = 'WebGL is unavailable in this browser, so the network is shown as a 2D map.';
  else if (sceneFailed) notice = 'The 3D renderer failed to start, so the network is shown as a 2D map.';
  else if (caps.lowEnd && renderMode === '2d') notice = '2D map selected for this device. Switch to 3D anytime.';

  // ---- Viewport content ----
  let viewport: ReactNode;
  if (transformersQ.isPending) {
    viewport = <Overlay>Loading network…</Overlay>;
  } else if (transformersQ.isError && !transformersQ.data) {
    viewport = (
      <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertTriangle className="text-critical" size={22} aria-hidden="true" />
        <p className="text-sm text-fg">Could not load the transformer network.</p>
        <p className="max-w-sm text-xs text-fg-muted">{transformersQ.error?.message}</p>
        <button
          type="button"
          onClick={() => transformersQ.refetch()}
          className="inline-flex items-center gap-1.5 rounded-sm border border-line px-3 py-1.5 font-mono text-label uppercase text-fg hover:bg-raised"
        >
          <RefreshCw size={12} aria-hidden="true" /> Retry
        </button>
      </div>
    );
  } else if (nodes.length === 0) {
    viewport = (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="font-mono text-label uppercase text-fg-muted">No transformers</p>
        <p className="max-w-sm text-sm text-fg">No transformers are registered yet, so there is no network to draw.</p>
        <Link to="/transformers" className="font-mono text-label uppercase text-accent underline-offset-4 hover:underline">
          Go to the registry
        </Link>
      </div>
    );
  } else if (use3d) {
    viewport = (
      <SceneErrorBoundary onError={onSceneError}>
        <Suspense fallback={<Overlay>Loading 3D view…</Overlay>}>
          {!sceneReady && <Overlay>Starting renderer…</Overlay>}
          <GridScene
            nodes={nodes}
            visibleIds={visibleIds}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            onSelect={select}
            onClearSelection={clearSelection}
            highlightFaults={highlightFaults}
            viewMode={viewMode}
            cameraToken={cameraToken}
            reducedMotion={caps.reducedMotion}
            quality={caps.quality}
            theme="dark"
            onReady={onSceneReady}
          />
        </Suspense>
      </SceneErrorBoundary>
    );
  } else {
    viewport = (
      <Grid2D
        nodes={nodes}
        visibleIds={visibleIds}
        selectedId={selectedId}
        hoveredId={hoveredId}
        onHover={setHoveredId}
        onSelect={select}
        onClearSelection={clearSelection}
        highlightFaults={highlightFaults}
        reducedMotion={caps.reducedMotion}
        theme="dark"
      />
    );
  }

  const hasData = nodes.length > 0;

  return (
    <div className="flex min-h-full flex-col gap-3 bg-base p-3 text-fg sm:p-4 lg:p-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-mono text-label uppercase text-fg-muted">Network</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">Grid view</h1>
        </div>
        <p className="font-mono text-label uppercase text-fg-muted" aria-live="polite">
          {transformersQ.isFetching ? 'Refreshing…' : 'Live · updates every 10 s'}
        </p>
      </header>

      <GridStats stats={stats} visibleCount={hasData ? visibleNodes.length : undefined} />

      <GridControls
        filter={filter}
        onFilterChange={setFilter}
        locations={locations}
        counts={counts}
        highlightFaults={highlightFaults}
        onHighlightFaults={setHighlightFaults}
        viewMode={viewMode}
        onViewMode={(m) => {
          setViewMode(m);
          setCameraToken((t) => t + 1);
        }}
        canIndividual={!!selected}
        onResetCamera={resetCamera}
        renderMode={use3d ? '3d' : '2d'}
        onRenderMode={setRenderMode}
        webglAvailable={caps.webgl && !sceneFailed}
      />

      {(notice || unknownFocus) && (
        <p role="status" className="rounded-sm border border-line bg-panel px-3 py-2 text-xs text-fg-muted">
          {unknownFocus ? `Transformer "${selectedId}" was not found in the network. ` : ''}
          {notice}
        </p>
      )}

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative h-[60vh] min-h-[420px] overflow-hidden rounded border border-line bg-base lg:h-[calc(100dvh-17rem)] lg:min-h-[520px]">
          {viewport}
          {hasData && (
            <GridLegend className="pointer-events-none absolute bottom-2 left-2 right-2 sm:right-auto" />
          )}
          {caps.reducedMotion && use3d && (
            <p className="pointer-events-none absolute right-2 top-2 rounded-sm bg-panel/90 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-fg-muted">
              Reduced motion · animation paused
            </p>
          )}
        </div>

        <aside className="flex min-h-0 flex-col gap-3 lg:h-[calc(100dvh-17rem)] lg:min-h-[520px]">
          {selected && (
            <DetailPanel
              transformer={selected}
              onClose={clearSelection}
              onFocus={use3d ? focusSelected : undefined}
            />
          )}
          {hasData && (
            <TransformerList
              nodes={visibleNodes}
              selectedId={selectedId}
              onSelect={select}
              onHover={setHoveredId}
              className="max-h-[50vh] min-h-[200px] flex-1 lg:max-h-none"
            />
          )}
        </aside>
      </div>
    </div>
  );
}
