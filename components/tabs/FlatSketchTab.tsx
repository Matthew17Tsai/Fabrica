'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface HasAssets {
  flat_front: boolean;
  flat_back: boolean;
}

interface Props {
  projectId: string;
  hasAssets: HasAssets;
  onRefresh: () => void;
}

interface GenerationMeta {
  generation_number: number;
  is_active: boolean;
  method: string;
  png_url: string;
}

interface ViewData {
  has_sketch: boolean;
  is_png: boolean;
  svg: string | null;
  generation_number: number | null;
  total_generations: number;
  method: string | null;
  all_generations: GenerationMeta[];
  png_url: string | null;
  png_download_url: string | null;
  svg_download_url: string | null;
}

const CORRECTION_CHIPS: { key: string; label: string }[] = [
  { key: 'remove_drawcord',   label: 'Remove drawcord' },
  { key: 'add_drawcord',      label: 'Add drawcord' },
  { key: 'sleeves_too_slim',  label: 'Sleeves too slim' },
  { key: 'sleeves_too_wide',  label: 'Sleeves too wide' },
  { key: 'body_too_long',     label: 'Body too long' },
  { key: 'body_too_short',    label: 'Body too short' },
  { key: 'wrong_zipper',      label: 'Fix zipper' },
  { key: 'hood_shape_wrong',  label: 'Fix hood shape' },
  { key: 'pocket_too_wide',   label: 'Pocket too wide' },
  { key: 'pocket_too_narrow', label: 'Pocket too narrow' },
];

const MAX_GENERATIONS = 5;

function constrainSvg(svg: string): string {
  return svg.replace(
    /(<svg\b)([^>]*)(>)/i,
    (_, open, attrs, close) => {
      const cleaned = attrs
        .replace(/\s+width="[^"]*"/gi, '')
        .replace(/\s+height="[^"]*"/gi, '');
      return `${open}${cleaned} width="100%" style="display:block;height:auto"${close}`;
    },
  );
}

export default function FlatSketchTab({ projectId, hasAssets, onRefresh }: Props) {
  const [view,           setView]          = useState<'front' | 'back'>('front');
  const [frontData,      setFrontData]     = useState<ViewData | null>(null);
  const [backData,       setBackData]      = useState<ViewData | null>(null);
  const [loading,        setLoading]       = useState(false);
  const [regenerating,   setRegenerating]  = useState(false);
  const [reverting,      setReverting]     = useState(false);
  const [uploading,      setUploading]     = useState(false);
  const [error,          setError]         = useState('');
  const [uploadMsg,      setUploadMsg]     = useState('');
  const loadedRef = useRef(false);
  const [selectedChips,  setSelectedChips] = useState<string[]>([]);
  const [freeFormText,   setFreeFormText]  = useState('');
  const [showFeedback,   setShowFeedback]  = useState(false);
  const [imgKey,         setImgKey]        = useState(0);

  const fileRef = useRef<HTMLInputElement>(null);

  const loadSketches = useCallback(async (force = false) => {
    if (loadedRef.current && !force) return;
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/projects/${projectId}/flat-sketch`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load sketches');
      setFrontData(data.front ?? null);
      setBackData(data.back ?? null);
      loadedRef.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (hasAssets.flat_front || hasAssets.flat_back) {
      loadedRef.current = false; // reset so each assets change triggers a fresh load
      loadSketches();
    }
  }, [loadSketches, hasAssets.flat_front, hasAssets.flat_back]);

  const toggleChip = (key: string) => {
    setSelectedChips((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key],
    );
  };

  const handleRegenerate = async () => {
    if (regenerating) return;
    if (selectedChips.length === 0 && !freeFormText.trim()) {
      setError('Select at least one correction chip or describe the issue.');
      return;
    }
    setRegenerating(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/regenerate-flat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          view,
          corrections: selectedChips,
          freeFormFeedback: freeFormText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Regeneration failed');
      loadedRef.current = false;
      setSelectedChips([]);
      setFreeFormText('');
      setShowFeedback(false);
      setImgKey((k) => k + 1);
      onRefresh();
      await loadSketches(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Regeneration failed');
    } finally {
      setRegenerating(false);
    }
  };

  const handleRevert = async (genNum: number) => {
    if (reverting) return;
    setReverting(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/flat-sketch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view, generation_number: genNum }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Revert failed');
      setImgKey((k) => k + 1);
      await loadSketches(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Revert failed');
    } finally {
      setReverting(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg('');
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('view', view);
      const res  = await fetch(`/api/projects/${projectId}/upload-refined-svg`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setUploadMsg(`Refined SVG saved (${(data.bytes / 1024).toFixed(1)} KB).`);
      loadedRef.current = false;
      onRefresh();
      await loadSketches(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const currentData   = view === 'front' ? frontData : backData;
  const hasCurrent    = view === 'front' ? hasAssets.flat_front : hasAssets.flat_back;
  const genNum        = currentData?.generation_number ?? 0;
  const totalGens     = currentData?.total_generations ?? 0;
  const atLimit       = totalGens >= MAX_GENERATIONS;
  const costEst       = currentData?.method === 'image_to_image' ? '~$0.04' : '~$0.02';
  const allGens       = currentData?.all_generations ?? [];

  const originalImageUrl = `/api/projects/${projectId}/original-image?index=1`;

  return (
    <div className="space-y-4">
      {/* View toggle + download controls */}
      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {(['front', 'back'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                view === v
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)} view
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {totalGens > 0 && (
            <span className="text-xs text-gray-400 mr-1">
              Generation {genNum} of {MAX_GENERATIONS} · {costEst}
            </span>
          )}
          {hasCurrent && currentData?.svg_download_url && (
            <a
              href={currentData.svg_download_url}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Download SVG
            </a>
          )}
          {hasCurrent && currentData?.png_download_url && (
            <a
              href={currentData.png_download_url}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Download PNG
            </a>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Upload refined SVG'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".svg,image/svg+xml"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>

      {/* Side-by-side: sketch + reference photo */}
      <div className="grid grid-cols-2 gap-4">
        {/* Generated sketch */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ minHeight: 480 }}>
          <div className="px-3 py-2 border-b border-gray-100 text-xs text-gray-400 font-medium uppercase tracking-wide">
            Generated sketch
          </div>
          {loading && (
            <div className="flex items-center justify-center" style={{ minHeight: 440 }}>
              <div className="text-gray-400 text-sm">Loading sketch…</div>
            </div>
          )}
          {!loading && !hasCurrent && (
            <div className="flex items-center justify-center" style={{ minHeight: 440 }}>
              <div className="text-center space-y-3 p-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl">✏️</span>
                </div>
                <p className="text-gray-500 text-sm">
                  No {view} view sketch yet.
                  <br />Go to Overview and click <strong>Generate flat sketch</strong>.
                </p>
              </div>
            </div>
          )}
          {!loading && hasCurrent && currentData?.is_png && currentData.png_url && (
            <img
              key={imgKey}
              src={`${currentData.png_url}&t=${imgKey}`}
              alt={`Flat sketch ${view} view`}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          )}
          {!loading && hasCurrent && !currentData?.is_png && currentData?.svg && (
            <div
              className="w-full p-4"
              dangerouslySetInnerHTML={{ __html: constrainSvg(currentData.svg) }}
            />
          )}
          {!loading && hasCurrent && !currentData?.is_png && !currentData?.svg && (
            <div className="flex items-center justify-center" style={{ minHeight: 440 }}>
              <div className="text-gray-400 text-sm">Sketch exists but could not be displayed.</div>
            </div>
          )}
        </div>

        {/* Reference photo */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden" style={{ minHeight: 480 }}>
          <div className="px-3 py-2 border-b border-gray-100 text-xs text-gray-400 font-medium uppercase tracking-wide">
            Reference photo
          </div>
          <img
            src={originalImageUrl}
            alt="Original inspiration photo"
            style={{ width: '100%', height: 'auto', display: 'block' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      </div>

      {/* Generation history strip */}
      {allGens.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 shrink-0">History:</span>
          <div className="flex gap-1.5 flex-wrap">
            {allGens.map((g) => (
              <button
                key={g.generation_number}
                onClick={() => !g.is_active && handleRevert(g.generation_number)}
                disabled={g.is_active || reverting}
                title={g.is_active ? 'Current version' : `Revert to generation ${g.generation_number}`}
                className={`w-8 h-8 rounded-md text-xs font-semibold border transition ${
                  g.is_active
                    ? 'bg-blue-600 text-white border-blue-600 cursor-default'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                } disabled:opacity-60`}
              >
                {g.generation_number}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400">Click a number to revert (free)</span>
        </div>
      )}

      {/* Feedback & Regenerate panel */}
      {hasCurrent && !atLimit && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Request corrections</h3>
            <button
              onClick={() => setShowFeedback(!showFeedback)}
              className="text-xs text-blue-600 hover:underline"
            >
              {showFeedback ? 'Hide' : 'Show'}
            </button>
          </div>

          {showFeedback && (
            <>
              <div className="flex flex-wrap gap-2">
                {CORRECTION_CHIPS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => toggleChip(key)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                      selectedChips.includes(key)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <textarea
                value={freeFormText}
                onChange={(e) => setFreeFormText(e.target.value)}
                placeholder="Describe any other issues (optional)…"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {MAX_GENERATIONS - totalGens} generation{MAX_GENERATIONS - totalGens !== 1 ? 's' : ''} remaining · {costEst} each
                </span>
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating || (selectedChips.length === 0 && !freeFormText.trim())}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {regenerating ? 'Regenerating…' : `Regenerate ${view} view`}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {atLimit && hasCurrent && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          Maximum {MAX_GENERATIONS} generations reached for this view.
          Upload a refined SVG above if you need further changes, or revert to a previous version.
        </p>
      )}

      {uploadMsg && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          {uploadMsg}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      <p className="text-xs text-gray-400">
        Download the SVG to refine in Adobe Illustrator, then upload your refined version above.
      </p>
    </div>
  );
}
