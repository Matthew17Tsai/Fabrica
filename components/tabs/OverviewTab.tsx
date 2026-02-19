'use client';

import { useState } from 'react';

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

interface HasAssets {
  svg: boolean;
  flat_front: boolean;
  flat_back: boolean;
  techpack_json: boolean;
}

interface Props {
  project: ProjectData;
  hasAssets: HasAssets;
  measurementCount: number;
  onRefresh: () => void;
}

const SUB_TYPE_LABELS: Record<string, string> = {
  oversized_hoodie: 'Oversized Hoodie',
  pullover_hoodie:  'Pullover Hoodie',
  zip_hoodie:       'Zip Hoodie',
  unisex_hoodie:    'Unisex Hoodie',
  crewneck:         'Crewneck Sweatshirt',
  sweatpants:       'Sweatpants',
};

const STATUS_STYLES: Record<string, string> = {
  uploaded:   'bg-gray-100 text-gray-700',
  processing: 'bg-blue-100 text-blue-700',
  ready:      'bg-green-100 text-green-700',
  error:      'bg-red-100 text-red-700',
};

export default function OverviewTab({ project, hasAssets, measurementCount, onRefresh }: Props) {
  const [analyzing,  setAnalyzing]  = useState(false);
  const [generating, setGenerating] = useState(false);
  const [actionMsg,  setActionMsg]  = useState('');
  const [actionErr,  setActionErr]  = useState('');

  const analysis = (() => {
    try { return project.ai_analysis_json ? JSON.parse(project.ai_analysis_json) : null; }
    catch { return null; }
  })();

  const runAnalysis = async () => {
    setAnalyzing(true);
    setActionMsg('');
    setActionErr('');
    try {
      const res  = await fetch('/api/vision/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setActionMsg(`AI analysis complete — ${data.measurements_prefilled} measurements pre-filled.`);
      onRefresh();
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const runGenerateFlat = async () => {
    setGenerating(true);
    setActionMsg('');
    setActionErr('');
    try {
      const res  = await fetch(`/api/projects/${project.id}/generate-flat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view: 'both' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setActionMsg('Flat sketches generated — front and back views ready.');
      onRefresh();
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Project info */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Project details</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Status</dt>
              <dd>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[project.status] ?? ''}`}>
                  {project.status}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Category</dt>
              <dd className="capitalize">{project.category}</dd>
            </div>
            {project.sub_type && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Sub-type</dt>
                <dd>{SUB_TYPE_LABELS[project.sub_type] ?? project.sub_type}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Base size</dt>
              <dd>{project.base_size ?? 'M'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Fit</dt>
              <dd className="capitalize">{project.fit ?? 'regular'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Measurements</dt>
              <dd>{measurementCount > 0 ? `${measurementCount} points` : 'Not set'}</dd>
            </div>
          </dl>
        </div>

        {/* AI-detected attributes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">AI detection</h3>
          {analysis ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Material</dt>
                <dd>{analysis.material?.primary ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Weight</dt>
                <dd>{analysis.material?.weight_estimate ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Composition</dt>
                <dd className="text-right max-w-[60%]">{analysis.material?.composition_guess ?? '—'}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-gray-500">Color</dt>
                <dd className="flex items-center gap-2">
                  {analysis.color?.primary_hex && (
                    <span
                      className="w-4 h-4 rounded-full border border-gray-300 inline-block"
                      style={{ background: analysis.color.primary_hex }}
                    />
                  )}
                  {analysis.color?.primary_name ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Shoulder</dt>
                <dd className="capitalize">{analysis.construction?.shoulder_type ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Confidence</dt>
                <dd>{analysis.confidence != null ? `${Math.round(analysis.confidence * 100)}%` : '—'}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-400">Run AI analysis to detect material, color, and construction details.</p>
          )}
        </div>
      </div>

      {/* Asset status */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Assets</h3>
        <div className="flex flex-wrap gap-3 text-sm">
          {[
            { label: 'Original image', ready: true },
            { label: 'AI analysis',    ready: !!project.ai_analysis_json },
            { label: 'Front sketch',   ready: hasAssets.flat_front },
            { label: 'Back sketch',    ready: hasAssets.flat_back },
            { label: 'Measurements',   ready: measurementCount > 0 },
            { label: 'Tech pack',      ready: hasAssets.techpack_json },
          ].map(({ label, ready }) => (
            <span
              key={label}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                ready ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-400 border border-gray-200'
              }`}
            >
              {ready ? '✓ ' : ''}{label}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={runAnalysis}
            disabled={analyzing || generating}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {analyzing ? 'Analyzing…' : project.ai_analysis_json ? 'Re-run AI analysis' : 'Run AI analysis'}
          </button>
          <button
            onClick={runGenerateFlat}
            disabled={generating || analyzing}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50"
          >
            {generating ? 'Generating…' : hasAssets.flat_front ? 'Regenerate flat sketch' : 'Generate flat sketch'}
          </button>
        </div>

        {actionMsg && (
          <p className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
            {actionMsg}
          </p>
        )}
        {actionErr && (
          <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {actionErr}
          </p>
        )}
      </div>

      {project.error_message && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          Error: {project.error_message}
        </div>
      )}
    </div>
  );
}
