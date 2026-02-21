'use client';

/**
 * /project/[id]/loading — post-upload analysis progress screen.
 *
 * Runs Vision analysis + Gemini sketch generation in parallel.
 * After completion, shows a full results screen with large images,
 * summary info, and three CTAs. No auto-redirect.
 */

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Task {
  id:     string;
  label:  string;
  state:  'pending' | 'running' | 'done' | 'skipped';
}

interface ResultSummary {
  garmentType: string;
  bomCount: number;
  fobCost: number | null;
}

export default function LoadingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const ranRef = useRef(false);

  const [tasks, setTasks] = useState<Task[]>([
    { id: 'vision',  label: 'Detecting features and materials',      state: 'pending' },
    { id: 'sketch',  label: 'Generating flat sketch (front + back)', state: 'pending' },
    { id: 'cost',    label: 'Calculating initial cost estimate',      state: 'pending' },
  ]);
  const [photoUrl, setPhotoUrl]           = useState<string | null>(null);
  const [sketchFront, setSketchFront]     = useState<string | null>(null);
  const [sketchBack, setSketchBack]       = useState<string | null>(null);
  const [sketchSkipReason, setSketchSkipReason]   = useState<string | null>(null);
  const [visionSkipReason, setVisionSkipReason]   = useState<string | null>(null);
  const [allDone, setAllDone]             = useState(false);
  const [error, setError]                 = useState('');
  const [summary, setSummary]             = useState<ResultSummary | null>(null);
  const [deleting, setDeleting]           = useState(false);

  function setTaskState(id: string, state: Task['state']) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, state } : t));
  }

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    setPhotoUrl(`/api/projects/${params.id}/original-image`);

    async function run() {
      // Vision analysis
      setTaskState('vision', 'running');
      try {
        const visionRes = await fetch('/api/vision/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: params.id }),
        });
        if (visionRes.ok) {
          setTaskState('vision', 'done');
        } else {
          const visionBody = await visionRes.json().catch(() => ({}));
          setVisionSkipReason(visionBody.error ?? visionBody.detail ?? `HTTP ${visionRes.status}`);
          setTaskState('vision', 'skipped');
        }
      } catch {
        setVisionSkipReason('Network error');
        setTaskState('vision', 'skipped');
      }

      // Cost is derived from BOM seeded at upload — mark done
      setTaskState('cost', 'running');
      await new Promise(r => setTimeout(r, 400));
      setTaskState('cost', 'done');

      // Sketch generation
      setTaskState('sketch', 'running');
      const sketchRes = await fetch(`/api/projects/${params.id}/generate-sketch`, {
        method: 'POST',
      }).then(r => r.json()).catch(() => ({ skipped: true, reason: 'Network error' })) as {
        front?: string; back?: string; skipped?: boolean; reason?: string;
      };

      if (sketchRes.front) {
        setSketchFront(sketchRes.front);
        setSketchBack(sketchRes.back ?? null);
        setTaskState('sketch', 'done');
      } else {
        setSketchSkipReason(sketchRes.reason ?? null);
        setTaskState('sketch', 'skipped');
      }

      setAllDone(true);

      // Fetch result summary after all tasks complete
      try {
        const [statusRes, costRes, bomRes] = await Promise.all([
          fetch(`/api/projects/${params.id}/status`),
          fetch(`/api/projects/${params.id}/cost`),
          fetch(`/api/projects/${params.id}/bom`),
        ]);
        const statusData = statusRes.ok ? await statusRes.json() : null;
        const costData   = costRes.ok   ? await costRes.json()   : null;
        const bomData    = bomRes.ok     ? await bomRes.json()    : null;

        const garmentType = statusData?.project?.sub_type
          ? statusData.project.sub_type.replace(/_/g, ' ')
          : statusData?.project?.category ?? 'garment';

        const bomCount = (bomData?.bom ?? []).length;
        const fobCost  = costData?.breakdown?.fobCost ?? null;

        setSummary({ garmentType, bomCount, fobCost });
      } catch {
        // summary is optional
      }
    }

    run().catch(err => {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setAllDone(true);
    });
  }, [params.id]);

  async function handleDelete() {
    if (!confirm('Delete this project?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${params.id}`, { method: 'DELETE' });
      if (res.ok) router.push('/');
    } finally {
      setDeleting(false);
    }
  }

  // ── Loading screen ────────────────────────────────────────────────────────

  if (!allDone) {
    return (
      <div style={containerStyle}>
        {/* Placeholder images while loading */}
        <div style={imageRowStyle}>
          {photoUrl ? (
            <ImageBox src={photoUrl} label="Your photo" />
          ) : (
            <PlaceholderBox label="Photo" />
          )}
          <PlaceholderBox label="Front sketch" />
          <PlaceholderBox label="Back sketch" />
        </div>

        {/* Task list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '2rem' }}>
          {tasks.map(task => (
            <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <StatusDot state={task.state} />
              <span style={{
                fontSize: '0.875rem',
                color: task.state === 'pending' ? 'var(--color-text-tertiary)' : 'var(--color-text)',
              }}>
                {task.label}
              </span>
              {task.state === 'running' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>…</span>
              )}
              {task.state === 'skipped' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                  {task.id === 'vision' && visionSkipReason
                    ? `failed — ${visionSkipReason}`
                    : task.id === 'sketch' && sketchSkipReason
                      ? `skipped — ${sketchSkipReason}`
                      : 'skipped'}
                </span>
              )}
            </div>
          ))}
        </div>

        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>
          Analyzing your garment…
        </p>
      </div>
    );
  }

  // ── Results screen ────────────────────────────────────────────────────────

  const fmtFob = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

  return (
    <div style={containerStyle}>
      {/* Large three-up images */}
      <div style={{ ...imageRowStyle, marginBottom: '2rem' }}>
        {photoUrl ? (
          <ImageBox src={photoUrl} label="Your photo" large />
        ) : (
          <PlaceholderBox label="Photo" large />
        )}
        {sketchFront ? (
          <ImageBox src={sketchFront} label="AI sketch — front" large downloadName="sketch-front.png" />
        ) : (
          <PlaceholderBox label="Front sketch" large note={sketchSkipReason ?? 'Not generated'} />
        )}
        {sketchBack ? (
          <ImageBox src={sketchBack} label="AI sketch — back" large downloadName="sketch-back.png" />
        ) : (
          <PlaceholderBox label="Back sketch" large note={sketchSkipReason ?? 'Not generated'} />
        )}
      </div>

      {/* Summary line */}
      {summary && (
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1.75rem', textAlign: 'center' }}>
          AI detected:{' '}
          <strong style={{ color: 'var(--color-text)', textTransform: 'capitalize' }}>{summary.garmentType}</strong>
          {summary.bomCount > 0 && (
            <> · <strong style={{ color: 'var(--color-text)' }}>{summary.bomCount} BOM items</strong></>
          )}
          {summary.fobCost != null && (
            <> · FOB ~<strong style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{fmtFob(summary.fobCost)}</strong></>
          )}
        </p>
      )}

      {error && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-error)', marginBottom: '1rem', textAlign: 'center' }}>
          {error}
        </p>
      )}

      {/* Three CTAs */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => router.push(`/project/${params.id}?step=1`)}
          style={primaryCtaStyle}
        >
          Continue to Tech Pack →
        </button>
        <button
          onClick={() => router.push(`/project/${params.id}?step=2`)}
          style={secondaryCtaStyle}
        >
          Upload Own Sketch
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={dangerCtaStyle}
        >
          {deleting ? 'Deleting…' : 'Delete Project'}
        </button>
      </div>

      {(sketchFront || sketchBack) && (
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '1.25rem', textAlign: 'center' }}>
          AI-generated sketches are drafts — upload your own in Step 2 (POM).
        </p>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ImageBox({
  src,
  label,
  large,
  downloadName,
}: {
  src: string;
  label: string;
  large?: boolean;
  downloadName?: string;
}) {
  const h = large ? '220px' : '160px';
  const w = large ? '160px' : '120px';
  return (
    <div style={{ textAlign: 'center' }}>
      <img
        src={src}
        alt={label}
        style={{ height: h, width: w, objectFit: 'contain', borderRadius: '6px', border: '1px solid var(--color-border)', background: '#fff', display: 'block', margin: '0 auto' }}
      />
      {downloadName ? (
        <a
          href={src}
          download={downloadName}
          style={{ display: 'inline-block', fontSize: '0.6875rem', color: 'var(--color-text-secondary)', marginTop: '0.375rem', textDecoration: 'none' }}
        >
          {label} · Download PNG
        </a>
      ) : (
        <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: '0.375rem' }}>{label}</p>
      )}
    </div>
  );
}

function PlaceholderBox({ label, large, note }: { label: string; large?: boolean; note?: string }) {
  const h = large ? '220px' : '160px';
  const w = large ? '160px' : '120px';
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        height: h, width: w,
        borderRadius: '6px',
        border: '1px dashed var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-tertiary)',
        fontSize: '0.75rem',
        gap: '0.25rem',
        margin: '0 auto',
      }}>
        <span>{label}</span>
        {note && <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', padding: '0 0.5rem', textAlign: 'center', lineHeight: 1.3 }}>{note}</span>}
      </div>
      <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: '0.375rem' }}>{label}</p>
    </div>
  );
}

function StatusDot({ state }: { state: Task['state'] }) {
  const colors: Record<Task['state'], string> = {
    pending: 'var(--color-not-started)',
    running: 'var(--color-unconfirmed)',
    done:    'var(--color-confirmed)',
    skipped: 'var(--color-text-tertiary)',
  };
  return (
    <div style={{
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: colors[state],
      flexShrink: 0,
      transition: 'background 0.3s',
    }} />
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  maxWidth: '640px',
  margin: '0 auto',
  padding: '4rem 1.5rem',
};

const imageRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1.25rem',
  justifyContent: 'center',
  marginBottom: '2.5rem',
};

const primaryCtaStyle: React.CSSProperties = {
  padding: '0.625rem 1.5rem',
  background: 'var(--color-accent)',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  fontWeight: 600,
  fontSize: '0.9375rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const secondaryCtaStyle: React.CSSProperties = {
  padding: '0.625rem 1.25rem',
  background: 'none',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  fontWeight: 500,
  fontSize: '0.9375rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const dangerCtaStyle: React.CSSProperties = {
  padding: '0.625rem 1.25rem',
  background: 'none',
  color: 'var(--color-error)',
  border: '1px solid var(--color-error)',
  borderRadius: '6px',
  fontWeight: 500,
  fontSize: '0.9375rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
};
