'use client';

/**
 * Step 1 — Features
 *
 * Left: garment photo. Right: garment type + feature cards.
 * AI-detected features show a confidence badge and are grouped at top.
 * Undetected features appear in a collapsed "+ Add Feature" section.
 * On toggle → PATCH /api/projects/[id]/features → cost sidebar refreshes.
 */

import { useState } from 'react';
import type { ConfirmedFeatures } from '@/lib/cost/features';
import { defaultFeaturesForSubType } from '@/lib/cost/features';
import type { SubType } from '@/lib/db';

interface Props {
  projectId: string;
  photoUrl?: string;
  initialFeatures?: ConfirmedFeatures | null;
  aiAnalysis?: Record<string, unknown> | null;
  onConfirm: (features: ConfirmedFeatures) => void;
  onFeaturesChange?: () => void;
}

// ── Garment type options ───────────────────────────────────────────────────────

interface GarmentOption {
  value: SubType;
  label: string;
  group: string;
}

const GARMENT_OPTIONS: GarmentOption[] = [
  // Hoodies
  { value: 'pullover_hoodie',  label: 'Pullover Hoodie',        group: 'Hoodies' },
  { value: 'zip_hoodie',       label: 'Zip-Up Hoodie',          group: 'Hoodies' },
  { value: 'oversized_hoodie', label: 'Oversized Hoodie',       group: 'Hoodies' },
  { value: 'unisex_hoodie',    label: 'Unisex Hoodie',          group: 'Hoodies' },
  // Sweatshirts / Tops
  { value: 'crewneck',         label: 'Crewneck Sweatshirt',    group: 'Tops' },
  // Bottoms
  { value: 'sweatpants',       label: 'Sweatpants / Joggers',   group: 'Bottoms' },
];

const GROUPED_GARMENTS = GARMENT_OPTIONS.reduce<Record<string, GarmentOption[]>>((acc, opt) => {
  (acc[opt.group] ??= []).push(opt);
  return acc;
}, {});

// ── Feature definitions ────────────────────────────────────────────────────────

interface FeatureDef {
  key: keyof Pick<ConfirmedFeatures, 'hasHood' | 'hasDrawcord' | 'hasZipper' | 'hasPockets' | 'hasRibCuffs' | 'hasRibHem' | 'hasThumbHoles'>;
  label: string;
  description: string;
  /** Map from ExpandedAnalysis.features field name (from AI) */
  aiKey?: string;
  /** Features that must be enabled for this to make sense */
  requiresEnabled?: Array<keyof Pick<ConfirmedFeatures, 'hasHood' | 'hasDrawcord' | 'hasZipper' | 'hasPockets' | 'hasRibCuffs' | 'hasRibHem' | 'hasThumbHoles'>>;
}

const ALL_FEATURES: FeatureDef[] = [
  { key: 'hasHood',       label: 'Hood',          description: 'Attached hood panel',        aiKey: undefined        },
  { key: 'hasDrawcord',   label: 'Drawcord',      description: 'Adjustable drawstring',      aiKey: 'drawcord',      requiresEnabled: ['hasHood'] },
  { key: 'hasZipper',     label: 'Front Zipper',  description: 'Full-front zipper closure',  aiKey: 'zip'            },
  { key: 'hasPockets',    label: 'Pockets',        description: 'Front or side pockets',      aiKey: 'kangarooPocket' },
  { key: 'hasRibCuffs',   label: 'Rib Cuffs',     description: 'Knit rib cuff finish',       aiKey: 'ribCuff'        },
  { key: 'hasRibHem',     label: 'Rib Hem',        description: 'Knit rib hem band',          aiKey: 'ribHem'         },
  { key: 'hasThumbHoles', label: 'Thumb Holes',    description: 'Cuff thumb openings',        aiKey: undefined        },
];

const POCKET_TYPE_OPTIONS = [
  { value: 'single_kangaroo', label: 'Single Kangaroo' },
  { value: 'split_kangaroo',  label: 'Split Kangaroo' },
  { value: 'side_seam',       label: 'Side Seam' },
  { value: 'none',            label: 'None' },
];

const ZIPPER_TYPE_OPTIONS = [
  { value: 'full_front_metal', label: 'Full Front Metal' },
  { value: 'full_front_nylon', label: 'Full Front Nylon' },
  { value: 'none',             label: 'None' },
];

const HOOD_STYLE_OPTIONS = [
  { value: 'standard_2panel', label: 'Standard 2-Panel' },
  { value: 'drawstring',      label: 'Drawstring Only' },
  { value: 'none',            label: 'None' },
];

// ── AI helpers ────────────────────────────────────────────────────────────────

function featuresFromAnalysis(analysis: Record<string, unknown>): ConfirmedFeatures {
  const rawFeatures   = (analysis.features ?? {}) as Record<string, unknown>;
  const rawSubType    = String(analysis.sub_type ?? '');
  const rawPocketType = String((rawFeatures.pocketType ?? '') as string);

  const subType: SubType = (
    ['oversized_hoodie','pullover_hoodie','zip_hoodie','unisex_hoodie','crewneck','sweatpants']
      .includes(rawSubType) ? rawSubType : 'pullover_hoodie'
  ) as SubType;

  const hasZip    = Boolean(rawFeatures.zip);
  const hasPocket = Boolean(rawFeatures.kangarooPocket);

  const pocketType: ConfirmedFeatures['pocketType'] =
    rawPocketType === 'split_kangaroo'      ? 'split_kangaroo'  :
    rawPocketType === 'continuous_kangaroo' ? 'single_kangaroo' :
    hasPocket ? 'single_kangaroo' : 'none';

  return {
    subType,
    hasHood:       subType !== 'crewneck' && subType !== 'sweatpants',
    hasDrawcord:   Boolean(rawFeatures.drawcord),
    hasZipper:     hasZip,
    hasPockets:    hasPocket,
    hasRibCuffs:   Boolean(rawFeatures.ribCuff),
    hasRibHem:     Boolean(rawFeatures.ribHem),
    hasThumbHoles: false,
    pocketType,
    zipperType:   hasZip ? 'full_front_metal' : 'none',
    hoodStyle:    (subType !== 'crewneck' && subType !== 'sweatpants') ? 'standard_2panel' : 'none',
  };
}

/** Returns the set of feature keys that the AI analysis flagged as present. */
function getAiDetectedKeys(
  analysis: Record<string, unknown>,
): Set<FeatureDef['key']> {
  const rawFeatures = (analysis.features ?? {}) as Record<string, unknown>;
  const rawSubType  = String(analysis.sub_type ?? '');
  const detected    = new Set<FeatureDef['key']>();

  // Hood is implied by sub_type
  if (['oversized_hoodie','pullover_hoodie','zip_hoodie','unisex_hoodie'].includes(rawSubType)) {
    detected.add('hasHood');
  }

  for (const feat of ALL_FEATURES) {
    if (feat.aiKey && rawFeatures[feat.aiKey]) {
      detected.add(feat.key);
    }
  }
  return detected;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Step1Features({
  projectId,
  photoUrl,
  initialFeatures,
  aiAnalysis,
  onConfirm,
  onFeaturesChange,
}: Props) {
  const [features, setFeatures] = useState<ConfirmedFeatures>(() => {
    if (initialFeatures) return initialFeatures;
    if (aiAnalysis) {
      try { return featuresFromAnalysis(aiAnalysis); } catch { /* fall through */ }
    }
    return defaultFeaturesForSubType('pullover_hoodie');
  });
  const [showAddFeature, setShowAddFeature] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const aiConfidence: number | null = aiAnalysis
    ? (typeof aiAnalysis.confidence === 'number' ? Math.round(aiAnalysis.confidence * 100) : null)
    : null;

  const aiDetectedKeys: Set<FeatureDef['key']> = aiAnalysis
    ? getAiDetectedKeys(aiAnalysis)
    : new Set();

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleSubTypeChange(subType: SubType) {
    const defaults = defaultFeaturesForSubType(subType);
    setFeatures(defaults);
    patchFeatures(defaults);
  }

  function handleToggle(key: FeatureDef['key']) {
    const updated = { ...features, [key]: !features[key] };
    if (key === 'hasHood' && !updated.hasHood) {
      updated.hasDrawcord = false;
      updated.hoodStyle   = 'none';
    }
    setFeatures(updated);
    patchFeatures(updated);
  }

  function handleSelect<K extends 'pocketType' | 'zipperType' | 'hoodStyle'>(
    key: K,
    value: ConfirmedFeatures[K],
  ) {
    const updated = { ...features, [key]: value };
    setFeatures(updated);
    patchFeatures(updated);
  }

  async function patchFeatures(f: ConfirmedFeatures) {
    try {
      await fetch(`/api/projects/${projectId}/features`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      });
      onFeaturesChange?.();
    } catch { /* ignore */ }
  }

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/features`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(features),
      });
      if (!res.ok) throw new Error('Failed to save features');
      onFeaturesChange?.();
      onConfirm(features);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // ── Feature card lists ──────────────────────────────────────────────────────

  const activeFeatures  = ALL_FEATURES.filter(f => features[f.key]);
  const inactiveFeatures = ALL_FEATURES.filter(f => !features[f.key] && (
    // hide requiresEnabled features if their dependency is off
    !f.requiresEnabled || f.requiresEnabled.some(dep => features[dep])
  ));

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', gap: '2rem', padding: '2rem', flex: 1 }}>

      {/* Left: photo */}
      <div style={{ flexShrink: 0, width: '200px' }}>
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="Garment"
            style={{
              width: '100%',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              objectFit: 'cover',
              aspectRatio: '3 / 4',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              aspectRatio: '3 / 4',
              borderRadius: '8px',
              border: '1px dashed var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-tertiary)',
              fontSize: '0.8125rem',
            }}
          >
            No photo
          </div>
        )}

        {/* AI confidence badge below photo */}
        {aiConfidence !== null && (
          <div style={{
            marginTop: '0.625rem',
            padding: '0.375rem 0.625rem',
            background: 'var(--color-accent-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
              AI analysis
            </p>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
              {aiConfidence}% confident
            </p>
          </div>
        )}
      </div>

      {/* Right: controls */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>

        {/* Header */}
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            Step 1 — Features
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Confirm the garment type and construction features. Changes update the BOM automatically.
          </p>
        </div>

        {/* Garment type */}
        <div>
          <Label>Garment Type</Label>
          <select
            value={features.subType}
            onChange={e => handleSubTypeChange(e.target.value as SubType)}
            style={selectStyle}
          >
            {Object.entries(GROUPED_GARMENTS).map(([group, opts]) => (
              <optgroup key={group} label={group}>
                {opts.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Active feature cards */}
        <div>
          <Label>Construction Features</Label>
          {activeFeatures.length === 0 && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>
              No features enabled. Add features below.
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {activeFeatures.map(feat => {
              const isAiDetected = aiDetectedKeys.has(feat.key);
              return (
                <FeatureCard
                  key={feat.key}
                  label={feat.label}
                  description={feat.description}
                  isAiDetected={isAiDetected}
                  aiConfidence={null}
                  onRemove={() => handleToggle(feat.key)}
                />
              );
            })}
          </div>
        </div>

        {/* Add Feature accordion */}
        {inactiveFeatures.length > 0 && (
          <div>
            <button
              onClick={() => setShowAddFeature(v => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>{showAddFeature ? '−' : '+'}</span>
              Add Feature
            </button>
            {showAddFeature && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.625rem' }}>
                {inactiveFeatures.map(feat => (
                  <button
                    key={feat.key}
                    onClick={() => handleToggle(feat.key)}
                    title={feat.description}
                    style={{
                      padding: '0.3rem 0.75rem',
                      borderRadius: '999px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      fontSize: '0.8125rem',
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    + {feat.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-error)' }}>{error}</p>
        )}

        {/* CTA */}
        <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
          <button onClick={handleConfirm} disabled={saving} style={ctaStyle}>
            {saving ? 'Saving…' : 'Confirm Features →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text)', marginBottom: '0.375rem', ...style }}>
      {children}
    </p>
  );
}

function FeatureCard({
  label,
  description,
  isAiDetected,
  aiConfidence,
  onRemove,
}: {
  label: string;
  description: string;
  isAiDetected: boolean;
  aiConfidence: number | null;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        padding: '0.5rem 0.75rem',
        borderRadius: '6px',
        border: `1px solid ${isAiDetected ? 'var(--color-unconfirmed)' : 'var(--color-border)'}`,
        background: isAiDetected ? 'var(--color-accent-bg)' : 'var(--color-surface)',
      }}
    >
      {/* Feature name + description */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text)' }}>
          {label}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginLeft: '0.5rem' }}>
          {description}
        </span>
      </div>

      {/* AI confidence badge */}
      {isAiDetected && aiConfidence !== null && (
        <span style={{
          padding: '0.1rem 0.45rem',
          borderRadius: '999px',
          background: 'var(--color-unconfirmed)',
          color: '#fff',
          fontSize: '0.6875rem',
          fontWeight: 600,
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}>
          AI {aiConfidence}%
        </span>
      )}
      {isAiDetected && aiConfidence === null && (
        <span style={{
          fontSize: '0.6875rem',
          color: 'var(--color-text-secondary)',
          flexShrink: 0,
        }}>
          AI detected
        </span>
      )}

      {/* Remove button */}
      <button
        onClick={onRemove}
        title={`Remove ${label}`}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-tertiary)',
          fontSize: '1rem',
          lineHeight: 1,
          padding: '0 0.125rem',
          flexShrink: 0,
          fontFamily: 'inherit',
        }}
      >
        ×
      </button>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: '6px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
};

const ctaStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.625rem 1.25rem',
  borderRadius: '6px',
  background: 'var(--color-accent)',
  color: '#fff',
  fontWeight: 600,
  fontSize: '0.875rem',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
};
