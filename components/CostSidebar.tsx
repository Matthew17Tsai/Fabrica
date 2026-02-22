'use client';

/**
 * CostSidebar — persistent right-panel showing tech pack progress + FOB estimate.
 * Fetches GET /api/projects/[id]/cost on mount and after any mutation.
 * Parent should call sidebar.refresh() after each wizard step mutation.
 */

import { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';

export interface CostData {
  breakdown: {
    materialsCost: number;
    cmt: number;
    overhead: number;
    fobCost: number;
    shipping: number;
    duty: number;
    landedCost: number;
  };
  pricing: {
    wholesale: number;
    retail: number;
    wsMarginMultiple: number;
  };
  moq: Array<{ quantity: number; fobPerUnit: number; landedPerUnit: number; totalOrder: number }>;
  settings: {
    cmt: number;
    overhead_pct: number;
    shipping: number;
    duty_pct: number;
    markup_ws: number;
    markup_retail: number;
  };
}

export interface WizardStepStatuses {
  features:  'not_started' | 'unconfirmed' | 'confirmed';
  pom:       'not_started' | 'unconfirmed' | 'confirmed';
  sizerun:   'not_started' | 'unconfirmed' | 'confirmed';
  bom:       'not_started' | 'unconfirmed' | 'confirmed';
  cost:      'not_started' | 'unconfirmed' | 'confirmed';
}

export interface CostSidebarHandle {
  refresh: () => void;
}

interface Props {
  projectId: string;
  stepStatuses?: WizardStepStatuses;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const STATUS_COLOR: Record<string, string> = {
  confirmed:   'var(--color-confirmed)',
  unconfirmed: 'var(--color-unconfirmed)',
  not_started: 'var(--color-not-started)',
};

const STEP_LABELS = ['Features', 'POM', 'Size Run', 'BOM', 'Cost Estimate'];

const CostSidebar = forwardRef<CostSidebarHandle, Props>(function CostSidebar(
  { projectId, stepStatuses },
  ref,
) {
  const [data, setData]       = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sketchBuster, setSketchBuster] = useState(() => Date.now());
  const [zooming, setZooming] = useState<'front' | 'back' | null>(null);

  const fetchCost = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/cost`);
      if (!res.ok) return;
      const json: CostData = await res.json();
      setData(json);
    } catch {
      // silently ignore network errors
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCost();
  }, [fetchCost]);

  useImperativeHandle(ref, () => ({
    refresh: () => {
      fetchCost();
      // Bust the sketch thumbnail cache so sidebar shows newly generated sketches.
      setSketchBuster(Date.now());
    },
  }), [fetchCost]);

  const statuses = stepStatuses
    ? [
        stepStatuses.features,
        stepStatuses.pom,
        stepStatuses.sizerun,
        stepStatuses.bom,
        stepStatuses.cost,
      ]
    : null;

  const confirmedCount = statuses ? statuses.filter(s => s === 'confirmed').length : 0;

  // Include cache buster so thumbnails refresh after regeneration / version activation.
  const frontSrc = `/api/projects/${projectId}/ai-sketch?view=front&t=${sketchBuster}`;
  const backSrc  = `/api/projects/${projectId}/ai-sketch?view=back&t=${sketchBuster}`;
  const zoomSrc  = zooming === 'front' ? frontSrc : backSrc;

  return (
    <>
      <aside
        style={{
          width: '260px',
          flexShrink: 0,
          borderLeft: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem 0.75rem',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <p style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: 'var(--color-text)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: 0,
          }}>
            Tech Pack Progress
          </p>
          {statuses && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>
              {confirmedCount} of 5 steps confirmed
            </p>
          )}
        </div>

        {/* AI Sketch thumbnails */}
        <div style={{
          padding: '0.875rem 1.25rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          gap: '0.625rem',
        }}>
          <SketchThumb
            key={`front-${sketchBuster}`}
            src={frontSrc}
            label="Front"
            onZoom={() => setZooming('front')}
          />
          <SketchThumb
            key={`back-${sketchBuster}`}
            src={backSrc}
            label="Back"
            onZoom={() => setZooming('back')}
          />
        </div>

        {/* Step progress */}
        {statuses && (
          <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {STEP_LABELS.map((label, i) => {
                const status = statuses[i] ?? 'not_started';
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: STATUS_COLOR[status],
                        flexShrink: 0,
                      }}
                    />
                    <span style={{
                      fontSize: '0.8125rem',
                      color: status === 'confirmed' ? 'var(--color-text)' : 'var(--color-text-secondary)',
                      flex: 1,
                    }}>
                      {label}
                    </span>
                    {status === 'confirmed' && (
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-confirmed)' }}>✓</span>
                    )}
                    {status === 'not_started' && (
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FOB Estimate */}
        <div style={{ padding: '0.875rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              FOB Estimate
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: 'var(--color-text)',
            }}>
              {loading ? '—' : data ? `${fmt(data.breakdown.fobCost)} /unit` : '—'}
            </span>
          </div>
        </div>
      </aside>

      {/* Lightbox */}
      {zooming && (
        <div
          onClick={() => setZooming(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.82)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setZooming(null)}
            style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#fff',
              width: '2rem',
              height: '2rem',
              borderRadius: '50%',
              fontSize: '1.125rem',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>

          <img
            src={zoomSrc}
            alt={`${zooming} sketch`}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '600px',
              maxHeight: '800px',
              objectFit: 'contain',
              borderRadius: '6px',
              background: '#fff',
            }}
          />

          <a
            href={zoomSrc}
            download={`sketch-${zooming}.png`}
            onClick={e => e.stopPropagation()}
            style={{
              padding: '0.5rem 1.25rem',
              background: 'rgba(255,255,255,0.12)',
              color: '#fff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            Download PNG
          </a>
        </div>
      )}
    </>
  );
});

export default CostSidebar;

function SketchThumb({
  src,
  label,
  onZoom,
}: {
  src: string;
  label: string;
  onZoom: () => void;
}) {
  const [loaded,  setLoaded]  = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      {!errored ? (
        <img
          src={src}
          alt={`${label} sketch`}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          onClick={loaded ? onZoom : undefined}
          style={{
            width: '100%',
            height: '90px',
            objectFit: 'contain',
            borderRadius: '4px',
            border: '1px solid var(--color-border)',
            background: '#fff',
            display: loaded ? 'block' : 'none',
            cursor: loaded ? 'zoom-in' : 'default',
          }}
        />
      ) : null}
      {(!loaded || errored) && (
        <div style={{
          width: '100%',
          height: '90px',
          borderRadius: '4px',
          border: '1px dashed var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-tertiary)',
          fontSize: '0.6875rem',
        }}>
          {label}
        </div>
      )}
      <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
        {label}
      </p>
    </div>
  );
}
