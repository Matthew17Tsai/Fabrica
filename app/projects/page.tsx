'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  style_name: string;
  style_number: string | null;
  season: string | null;
  category: string;
  base_size: string | null;
  status: string;
  step_features_status: string;
  step_materials_status: string;
  step_pom_status: string;
  step_sizerun_status: string;
  step_bom_status: string;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  hoodie:     'Hoodie',
  sweatshirt: 'Sweatshirt',
  sweatpants: 'Sweatpants',
};

function wizardProgress(p: Project): number {
  // 4 tracked steps (no Materials): features, pom, sizerun, bom
  const steps = [
    p.step_features_status,
    p.step_pom_status,
    p.step_sizerun_status,
    p.step_bom_status,
  ];
  const confirmed = steps.filter(s => s === 'confirmed').length;
  return Math.round((confirmed / 4) * 100);
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => setProjects(d.projects ?? []))
      .finally(() => setLoading(false));
  }, []);

  function removeProject(id: string) {
    setProjects(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700 }}>Projects</h1>
        <a
          href="/new"
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--color-accent)',
            color: '#fff',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          New Project
        </a>
      </div>

      {loading && (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Loading…</p>
      )}

      {!loading && projects.length === 0 && (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          border: '1px dashed var(--color-border)',
          borderRadius: '8px',
          color: 'var(--color-text-secondary)',
          fontSize: '0.875rem',
        }}>
          No projects yet.{' '}
          <a href="/new" style={{ color: 'var(--color-text)', fontWeight: 500 }}>
            Create one →
          </a>
        </div>
      )}

      {projects.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onDelete={() => removeProject(p.id)}
              onNavigate={() => router.push(`/project/${p.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── ProjectCard ───────────────────────────────────────────────────────────────

function ProjectCard({
  project: p,
  onDelete,
  onNavigate,
}: {
  project: Project;
  onDelete: () => void;
  onNavigate: () => void;
}) {
  const [fob, setFob]                     = useState<number | null>(null);
  const [thumbErrored, setThumbErrored]   = useState(false);
  const [thumbLoaded, setThumbLoaded]     = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  const progress = wizardProgress(p);

  // Lazy-fetch FOB estimate
  useEffect(() => {
    fetch(`/api/projects/${p.id}/cost`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.breakdown?.fobCost != null) setFob(data.breakdown.fobCost);
      })
      .catch(() => {});
  }, [p.id]);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${p.id}`, { method: 'DELETE' });
      if (res.ok) onDelete();
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  const fmtFob = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

  const thumbSrc = `/api/projects/${p.id}/ai-sketch?view=front`;

  return (
    <div
      onClick={onNavigate}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.875rem',
        padding: '0.75rem 1rem',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        background: 'var(--color-surface)',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
    >
      {/* Sketch thumbnail */}
      {!thumbErrored && (
        <img
          src={thumbSrc}
          alt=""
          onLoad={() => setThumbLoaded(true)}
          onError={() => setThumbErrored(true)}
          style={{
            width: '40px',
            height: '54px',
            objectFit: 'contain',
            borderRadius: '4px',
            border: '1px solid var(--color-border)',
            background: '#fff',
            flexShrink: 0,
            display: thumbLoaded ? 'block' : 'none',
          }}
        />
      )}
      {(!thumbLoaded || thumbErrored) && (
        <div style={{
          width: '40px',
          height: '54px',
          borderRadius: '4px',
          border: '1px dashed var(--color-border)',
          flexShrink: 0,
          background: 'var(--color-bg)',
          display: thumbErrored ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }} />
      )}

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.style_name}
          </span>
          {p.style_number && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-secondary)', flexShrink: 0 }}>
              {p.style_number}
            </span>
          )}
          {p.season && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
              {p.season}
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          {CATEGORY_LABELS[p.category] ?? p.category}
          {p.base_size && ` · Size ${p.base_size}`}
        </div>
      </div>

      {/* FOB estimate */}
      <div style={{ flexShrink: 0, textAlign: 'right', minWidth: '80px' }}>
        {fob != null ? (
          <>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
              {fmtFob(fob)}
            </p>
            <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', margin: 0 }}>FOB est.</p>
          </>
        ) : (
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', margin: 0 }}>—</p>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ width: '80px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
            {progress}%
          </span>
        </div>
        <div style={{ height: '4px', background: 'var(--color-border)', borderRadius: '2px' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: progress === 100 ? 'var(--color-confirmed)' : 'var(--color-text)',
              borderRadius: '2px',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>

      {/* Delete */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ flexShrink: 0 }}
      >
        {!deleteConfirm ? (
          <button
            onClick={e => { e.stopPropagation(); setDeleteConfirm(true); }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-tertiary)',
              fontSize: '1rem',
              lineHeight: 1,
              padding: '0.25rem',
              fontFamily: 'inherit',
            }}
            title="Delete project"
          >
            ✕
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                padding: '0.25rem 0.5rem',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.75rem',
                color: '#fff',
                background: 'var(--color-error)',
                cursor: deleting ? 'default' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {deleting ? '…' : 'Delete'}
            </button>
            <button
              onClick={e => { e.stopPropagation(); setDeleteConfirm(false); }}
              style={{
                padding: '0.25rem 0.5rem',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                fontSize: '0.75rem',
                color: 'var(--color-text)',
                background: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
