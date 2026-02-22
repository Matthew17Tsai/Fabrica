'use client';

/**
 * /project/[id] — two-column wizard layout.
 *
 * Steps: Features(1) → POM(2) → Size Run(3) → BOM(4) → Cost(5)
 * Materials editing lives inside the BOM table (no separate Materials step).
 *
 * Left column: WizardNav + current step component + Back/Next buttons.
 * Right column: CostSidebar (persistent, refreshes after each mutation).
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import WizardNav from '@/components/wizard/WizardNav';
import CostSidebar from '@/components/CostSidebar';
import type { CostSidebarHandle } from '@/components/CostSidebar';
import Step1Features from '@/components/wizard/Step1Features';
import Step3POM from '@/components/wizard/Step3POM';
import Step4SizeRun from '@/components/wizard/Step4SizeRun';
import Step5BOM from '@/components/wizard/Step5BOM';
import Step5Cost from '@/components/wizard/Step5Cost';
import type { ConfirmedFeatures } from '@/lib/cost/features';
import type { SubType } from '@/lib/db';

// ── Types ─────────────────────────────────────────────────────────────────────

type StepStatus = 'not_started' | 'unconfirmed' | 'confirmed';

interface WizardStepStatuses {
  features:  string;
  materials: string;
  pom:       string;
  sizerun:   string;
  bom:       string;
}

interface ProjectStatus {
  project: {
    id: string;
    style_name: string;
    style_number: string | null;
    season: string | null;
    category: string;
    sub_type: string | null;
    base_size: string;
    fit: string | null;
    status: string;
    ai_analysis_json: string | null;
    confirmed_features_json: string | null;
    confirmed_materials_json: string | null;
    moq_quantity: number;
  };
  hasAssets: {
    photo_front:      boolean;
    sketch_front:     boolean;
    sketch_back:      boolean;
    ai_sketch_front:  boolean;
    ai_sketch_back:   boolean;
  };
  measurementCount: number;
  wizardStepStatuses: WizardStepStatuses;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectPage({ params }: { params: { id: string } }) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(null);
  const [bomItems, setBomItems]           = useState<unknown[]>([]);
  const [bomLoaded, setBomLoaded]         = useState(false);
  const [measurements, setMeasurements]   = useState<unknown[]>([]);
  const [sizeRun, setSizeRun]             = useState<unknown[]>([]);
  const [loadErr, setLoadErr]             = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  const sidebarRef = useRef<CostSidebarHandle>(null);

  // Current step from URL (1-5), default to 1
  const stepParam   = parseInt(searchParams.get('step') ?? '1', 10);
  const currentStep = isNaN(stepParam) || stepParam < 1 || stepParam > 5 ? 1 : stepParam;

  function goToStep(n: number) {
    router.push(`/project/${params.id}?step=${n}`, { scroll: false });
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    const res = await fetch(`/api/projects/${params.id}/status`);
    if (!res.ok) { setLoadErr('Project not found'); return; }
    const data: ProjectStatus = await res.json();
    setProjectStatus(data);
  }, [params.id]);

  const fetchBom = useCallback(async () => {
    const res = await fetch(`/api/projects/${params.id}/bom`);
    if (res.ok) {
      const data = await res.json();
      // BOM endpoint returns { bom: [...], costBreakdown: {...} }
      setBomItems(data.bom ?? data.items ?? []);
    }
    setBomLoaded(true);
  }, [params.id]);

  const fetchMeasurements = useCallback(async () => {
    const res = await fetch(`/api/projects/${params.id}/measurements`);
    if (!res.ok) return;
    const data = await res.json();
    // Auto-seed from template on first load
    if ((data.measurements ?? []).length === 0) {
      const seedRes = await fetch(`/api/projects/${params.id}/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replace: false }),
      });
      if (seedRes.ok) {
        const seedData = await seedRes.json();
        setMeasurements(seedData.measurements ?? []);
        return;
      }
    }
    setMeasurements(data.measurements ?? []);
  }, [params.id]);

  const fetchSizeRun = useCallback(async () => {
    const res = await fetch(`/api/projects/${params.id}/sizerun`);
    if (res.ok) {
      const data = await res.json();
      setSizeRun(data.sizeRun ?? []);
    }
  }, [params.id]);

  useEffect(() => {
    fetchStatus();
    fetchBom();
    fetchMeasurements();
    fetchSizeRun();
  }, [fetchStatus, fetchBom, fetchMeasurements, fetchSizeRun]);

  function refreshAll() {
    fetchStatus();
    fetchBom();
    sidebarRef.current?.refresh();
  }

  // ── Loading/error ─────────────────────────────────────────────────────────

  if (loadErr) {
    return (
      <div style={{ maxWidth: '480px', margin: '4rem auto', padding: '0 1.5rem' }}>
        <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: 'var(--color-error)', fontSize: '0.875rem' }}>
          {loadErr}
        </div>
        <a href="/" style={{ display: 'inline-block', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          ← Back to projects
        </a>
      </div>
    );
  }

  if (!projectStatus) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
        Loading…
      </div>
    );
  }

  const { project, hasAssets, wizardStepStatuses } = projectStatus;
  const stepStatuses = wizardStepStatuses;

  const photoUrl  = hasAssets.photo_front  ? `/api/projects/${params.id}/original-image` : undefined;
  // Prefer user-uploaded sketch; fall back to AI-generated sketch
  const sketchUrl = hasAssets.sketch_front
    ? `/api/projects/${params.id}/sketch-front`
    : hasAssets.ai_sketch_front
      ? `/api/projects/${params.id}/ai-sketch?view=front`
      : undefined;

  const confirmedFeatures = project.confirmed_features_json
    ? (JSON.parse(project.confirmed_features_json) as ConfirmedFeatures)
    : null;

  const visibleGroups = confirmedFeatures
    ? (() => {
        const groups = ['body', 'sleeve'];
        if (confirmedFeatures.hasHood)     groups.push('hood');
        if (confirmedFeatures.hasPockets)  groups.push('pocket');
        if (confirmedFeatures.hasZipper)   groups.push('zipper');
        if (confirmedFeatures.hasDrawcord) groups.push('drawcord');
        return groups;
      })()
    : ['body', 'sleeve'];

  // ── Wizard steps (5 steps, no Materials) ─────────────────────────────────

  const WIZARD_STEPS = [
    { label: 'Features', status: (stepStatuses.features || 'unconfirmed') as StepStatus },
    { label: 'POM',      status: (stepStatuses.pom      || 'unconfirmed') as StepStatus },
    { label: 'Size Run', status: (stepStatuses.sizerun  || 'not_started') as StepStatus },
    { label: 'BOM',      status: (stepStatuses.bom      || 'unconfirmed') as StepStatus },
    { label: 'Cost',     status: 'not_started' as StepStatus },
  ];

  // ── Delete project ────────────────────────────────────────────────────────

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${params.id}`, { method: 'DELETE' });
      if (res.ok) router.push('/');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  // ── Confirm step helper ───────────────────────────────────────────────────

  async function confirmStep(statusKey: string, nextStep?: number) {
    await fetch(`/api/projects/${params.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [statusKey]: 'confirmed' }),
    });
    refreshAll();
    if (nextStep) goToStep(nextStep);
  }

  // ── Sidebar step statuses (5 steps: Features, POM, Size Run, BOM, Cost) ────

  const sidebarStatuses = {
    features: (stepStatuses.features || 'unconfirmed') as StepStatus,
    pom:      (stepStatuses.pom      || 'unconfirmed') as StepStatus,
    sizerun:  (stepStatuses.sizerun  || 'not_started') as StepStatus,
    bom:      (stepStatuses.bom      || 'unconfirmed') as StepStatus,
    cost:     'unconfirmed' as StepStatus,
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>

      {/* Project header */}
      <div style={{
        padding: '0.75rem 1.5rem',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flexShrink: 0,
      }}>
        <a href="/projects" style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
          Projects
        </a>
        <span style={{ color: 'var(--color-border)' }}>/</span>
        <h1 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
          {project.style_name}
        </h1>
        {project.style_number && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {project.style_number}
          </span>
        )}
        {project.season && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>
            · {project.season}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <a
            href={`/project/${params.id}/preview`}
            style={{
              padding: '0.375rem 0.875rem',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              textDecoration: 'none',
              color: 'var(--color-text)',
              background: 'var(--color-surface)',
            }}
          >
            Preview & Export
          </a>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                padding: '0.375rem 0.625rem',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                color: 'var(--color-text-tertiary)',
                background: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Delete
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                Delete project?
              </span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: '0.375rem 0.75rem',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  color: '#fff',
                  background: 'var(--color-error)',
                  cursor: deleting ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: '0.375rem 0.625rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
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

      {/* Two-column */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Main column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          <WizardNav
            steps={WIZARD_STEPS}
            currentStep={currentStep}
            onStepChange={goToStep}
          />

          {/* Step content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {currentStep === 1 && (
              <Step1Features
                projectId={params.id}
                photoUrl={photoUrl}
                initialFeatures={confirmedFeatures}
                aiAnalysis={project.ai_analysis_json ? JSON.parse(project.ai_analysis_json) as Record<string, unknown> : null}
                onFeaturesChange={() => { fetchBom(); sidebarRef.current?.refresh(); }}
                onConfirm={() => confirmStep('step_features_status', 2)}
              />
            )}

            {/* Step 2 = POM (was step 3) */}
            {currentStep === 2 && (
              <Step3POM
                key={`pom-${measurements.length}`}
                projectId={params.id}
                sketchUrl={sketchUrl}
                photoUrl={photoUrl}
                measurements={measurements as Parameters<typeof Step3POM>[0]['measurements']}
                baseSize={(project.base_size || 'M') as Parameters<typeof Step3POM>[0]['baseSize']}
                visibleGroups={visibleGroups}
                garmentCategory={project.category}
                onMeasurementChange={() => fetchMeasurements()}
                onConfirm={() => confirmStep('step_pom_status', 3)}
                onSketchChange={() => sidebarRef.current?.refresh()}
              />
            )}

            {/* Step 3 = Size Run (was step 4) */}
            {currentStep === 3 && (
              <Step4SizeRun
                projectId={params.id}
                baseSize={(project.base_size || 'M') as Parameters<typeof Step4SizeRun>[0]['baseSize']}
                category={project.category}
                measurements={measurements as Parameters<typeof Step4SizeRun>[0]['measurements']}
                initialSizeRun={sizeRun as Parameters<typeof Step4SizeRun>[0]['initialSizeRun']}
                onConfirm={() => confirmStep('step_sizerun_status', 4)}
              />
            )}

            {/* Step 4 = BOM */}
            {currentStep === 4 && (
              <Step5BOM
                projectId={params.id}
                subType={project.sub_type ?? undefined}
                initialBomItems={bomItems as Parameters<typeof Step5BOM>[0]['initialBomItems']}
                bomLoaded={bomLoaded}
                onCostChange={() => sidebarRef.current?.refresh()}
                onConfirm={() => confirmStep('step_bom_status', 5)}
              />
            )}

            {/* Step 5 = Cost */}
            {currentStep === 5 && (
              <Step5Cost
                projectId={params.id}
                subType={(project.sub_type as SubType) ?? undefined}
                onCostChange={() => sidebarRef.current?.refresh()}
                onExportPdf={() => window.open(`/api/projects/${params.id}/export/pdf`, '_blank')}
              />
            )}
          </div>

          {/* Back / Next navigation footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0.75rem 1.5rem',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            flexShrink: 0,
          }}>
            <button
              onClick={() => currentStep > 1 && goToStep(currentStep - 1)}
              disabled={currentStep === 1}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                background: 'none',
                color: currentStep === 1 ? 'var(--color-text-tertiary)' : 'var(--color-text)',
                cursor: currentStep === 1 ? 'default' : 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
              }}
            >
              ← Back
            </button>
            {currentStep < 5 && (
              <button
                onClick={() => goToStep(currentStep + 1)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  background: 'none',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                }}
              >
                Next Step →
              </button>
            )}
          </div>
        </div>

        {/* Cost sidebar */}
        <CostSidebar
          ref={sidebarRef}
          projectId={params.id}
          stepStatuses={sidebarStatuses}
        />
      </div>
    </div>
  );
}
