'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import OverviewTab      from '@/components/tabs/OverviewTab';
import FlatSketchTab    from '@/components/tabs/FlatSketchTab';
import MeasurementsTab  from '@/components/tabs/MeasurementsTab';
import BomTab           from '@/components/tabs/BomTab';
import ConstructionTab  from '@/components/tabs/ConstructionTab';
import ExportTab        from '@/components/tabs/ExportTab';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ProjectData {
  id: string;
  title: string;
  category: string;
  sub_type: string | null;
  fit: string | null;
  base_size: string | null;
  status: string;
  detected_color: string | null;
  detected_material: string | null;
  ai_analysis_json: string | null;
  error_message: string | null;
}

interface ProjectStatus {
  project: ProjectData;
  job: { status: string; step: string; progress: number; error_message: string | null } | null;
  hasAssets: { svg: boolean; flat_front: boolean; flat_back: boolean; techpack_json: boolean };
  measurementCount: number;
  processingPath: string;
  visionConfidence: number;
  templateMode: boolean;
}

type TabId = 'overview' | 'flat-sketch' | 'measurements' | 'bom' | 'construction' | 'export';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview',      label: 'Overview'      },
  { id: 'flat-sketch',   label: 'Flat Sketch'   },
  { id: 'measurements',  label: 'Measurements'  },
  { id: 'bom',           label: 'BOM'           },
  { id: 'construction',  label: 'Construction'  },
  { id: 'export',        label: 'Export'        },
];

const CATEGORY_LABELS: Record<string, string> = {
  hoodie:     'Hoodie',
  sweatshirt: 'Sweatshirt',
  sweatpants: 'Sweatpants',
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ProjectPage({ params }: { params: { id: string } }) {
  const [status,  setStatus]  = useState<ProjectStatus | null>(null);
  const [tab,     setTab]     = useState<TabId>('overview');
  const [loadErr, setLoadErr] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      const res  = await fetch(`/api/projects/${params.id}/status`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load project');
      setStatus(data);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Failed to load project');
    }
  }, [params.id]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // ── Loading / error states ──────────────────────────────────────────────────

  if (loadErr) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {loadErr}
        </div>
        <Link href="/" className="mt-4 inline-block text-primary hover:underline text-sm">
          ← Go home
        </Link>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  const { project, job, hasAssets, measurementCount } = status;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <Link href="/" className="hover:text-gray-600 transition">Projects</Link>
          <span>/</span>
          <span className="text-gray-600">{project.title}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500">
                {CATEGORY_LABELS[project.category] ?? project.category}
              </span>
              {project.base_size && (
                <span className="text-sm text-gray-400">· Size {project.base_size}</span>
              )}
              {project.fit && (
                <span className="text-sm text-gray-400 capitalize">· {project.fit}</span>
              )}
            </div>
          </div>
          <StatusBadge status={project.status} />
        </div>

        {/* Processing progress bar */}
        {project.status === 'processing' && job && (
          <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Processing: {job.step}</span>
              <span>{job.progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-0 overflow-x-auto">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                tab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="min-h-[500px]">
        {tab === 'overview' && (
          <OverviewTab
            project={project}
            hasAssets={hasAssets}
            measurementCount={measurementCount}
            onRefresh={fetchStatus}
          />
        )}

        {tab === 'flat-sketch' && (
          <FlatSketchTab
            projectId={project.id}
            hasAssets={hasAssets}
            onRefresh={fetchStatus}
          />
        )}

        {tab === 'measurements' && (
          <MeasurementsTab
            projectId={project.id}
            hasFlatFront={hasAssets.flat_front}
            baseSize={project.base_size}
            fit={project.fit}
          />
        )}

        {tab === 'bom' && (
          <BomTab projectId={project.id} />
        )}

        {tab === 'construction' && (
          <ConstructionTab projectId={project.id} />
        )}

        {tab === 'export' && (
          <ExportTab
            projectId={project.id}
            hasAssets={hasAssets}
            measurementCount={measurementCount}
          />
        )}
      </div>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    uploaded:   'bg-gray-100 text-gray-600',
    processing: 'bg-blue-50 text-blue-700 animate-pulse',
    ready:      'bg-green-50 text-green-700',
    error:      'bg-red-50 text-red-700',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${styles[status] ?? ''}`}>
      {status}
    </span>
  );
}
