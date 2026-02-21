'use client';

/**
 * Step 2 — Materials
 *
 * Expandable panels for Body Fabric and Rib Fabric.
 * Changing a material → PATCH /api/projects/[id]/materials → cost sidebar refreshes.
 */

import { useState, useEffect } from 'react';
import { FABRIC_DEFAULTS, RIB_DEFAULTS } from '@/lib/cost/materials';

interface BomItem {
  id: string;
  component: string;
  material: string;
  composition: string;
  category: string;
  unit_price: number;
  unit: string;
  consumption: number;
  wastage: number;
  total_cost: number;
  specification?: string | null;
}

interface Props {
  projectId: string;
  initialBomItems?: BomItem[];
  onConfirm: () => void;
  onMaterialChange?: () => void;
}

interface PanelState {
  open: boolean;
  material: string;
  composition: string;
  weight: string;
  unit_price: number;
  consumption: number;
  wastage: number;
}

const FABRIC_NAMES = Object.keys(FABRIC_DEFAULTS);
const RIB_NAMES    = Object.keys(RIB_DEFAULTS);

const fmt2 = (n: number) => `$${n.toFixed(2)}`;

export default function Step2Materials({
  projectId,
  initialBomItems = [],
  onConfirm,
  onMaterialChange,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // Build initial state from BOM items
  const bodyItem = initialBomItems.find(i => i.component === 'Body Fabric');
  const ribItem  = initialBomItems.find(i => i.component === 'Rib Fabric');

  const defaultBodyMat = bodyItem?.material ?? 'French Terry';
  const bodyDefaults   = FABRIC_DEFAULTS[defaultBodyMat] ?? FABRIC_DEFAULTS['French Terry'];

  const [body, setBody] = useState<PanelState>({
    open:        true,
    material:    bodyItem?.material     ?? 'French Terry',
    composition: bodyItem?.composition  ?? bodyDefaults.defaultComposition,
    weight:      bodyItem?.specification ?? bodyDefaults.defaultWeight,
    unit_price:  bodyItem?.unit_price   ?? bodyDefaults.unitPrice,
    consumption: bodyItem?.consumption  ?? bodyDefaults.consumption,
    wastage:     bodyItem?.wastage      ?? bodyDefaults.wastage,
  });

  const defaultRibMat = ribItem?.material ?? '1x1 Rib';
  const ribDefaults   = RIB_DEFAULTS[defaultRibMat] ?? RIB_DEFAULTS['1x1 Rib'];

  const [rib, setRib] = useState<PanelState>({
    open:        false,
    material:    ribItem?.material     ?? '1x1 Rib',
    composition: ribItem?.composition  ?? ribDefaults.defaultComposition,
    weight:      ribItem?.specification ?? ribDefaults.defaultWeight,
    unit_price:  ribItem?.unit_price   ?? ribDefaults.unitPrice,
    consumption: ribItem?.consumption  ?? ribDefaults.consumption,
    wastage:     ribItem?.wastage      ?? ribDefaults.wastage,
  });

  async function patchMaterial(component: 'Body Fabric' | 'Rib Fabric', state: PanelState) {
    await fetch(`/api/projects/${projectId}/materials`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        component,
        material:    state.material,
        composition: state.composition,
        specification: state.weight,
        unit_price:  state.unit_price,
        consumption: state.consumption,
        wastage:     state.wastage,
      }),
    });
    onMaterialChange?.();
  }

  function handleBodyMaterial(mat: string) {
    const defaults = FABRIC_DEFAULTS[mat];
    if (!defaults) return;
    const updated: PanelState = {
      ...body,
      material:    mat,
      composition: defaults.defaultComposition,
      weight:      defaults.defaultWeight,
      unit_price:  defaults.unitPrice,
      consumption: defaults.consumption,
      wastage:     defaults.wastage,
    };
    setBody(updated);
    patchMaterial('Body Fabric', updated);
  }

  function handleRibMaterial(mat: string) {
    const defaults = RIB_DEFAULTS[mat];
    if (!defaults) return;
    const updated: PanelState = {
      ...rib,
      material:    mat,
      composition: defaults.defaultComposition,
      weight:      defaults.defaultWeight,
      unit_price:  defaults.unitPrice,
      consumption: defaults.consumption,
      wastage:     defaults.wastage,
    };
    setRib(updated);
    patchMaterial('Rib Fabric', updated);
  }

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      await patchMaterial('Body Fabric', body);
      await patchMaterial('Rib Fabric', rib);
      onConfirm();
    } catch {
      setError('Failed to save materials');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
          Step 2 — Materials
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          Select fabric type for each component. Prices update automatically from factory defaults.
        </p>
      </div>

      {/* Body Fabric panel */}
      <FabricPanel
        title="Body Fabric"
        state={body}
        options={FABRIC_NAMES}
        defaults={FABRIC_DEFAULTS}
        isRib={false}
        onMaterialChange={handleBodyMaterial}
        onFieldChange={(field, val) => {
          const updated = { ...body, [field]: val };
          setBody(updated);
          patchMaterial('Body Fabric', updated);
        }}
        onToggleOpen={() => setBody(b => ({ ...b, open: !b.open }))}
      />

      {/* Rib Fabric panel */}
      <FabricPanel
        title="Rib Fabric"
        state={rib}
        options={RIB_NAMES}
        defaults={RIB_DEFAULTS}
        isRib
        onMaterialChange={handleRibMaterial}
        onFieldChange={(field, val) => {
          const updated = { ...rib, [field]: val };
          setRib(updated);
          patchMaterial('Rib Fabric', updated);
        }}
        onToggleOpen={() => setRib(r => ({ ...r, open: !r.open }))}
      />

      {error && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-error)' }}>{error}</p>
      )}

      <div style={{ marginTop: 'auto' }}>
        <button onClick={handleConfirm} disabled={saving} style={ctaStyle}>
          {saving ? 'Saving…' : 'Confirm Materials →'}
        </button>
      </div>
    </div>
  );
}

// ── Panel component ───────────────────────────────────────────────────────────

function FabricPanel({
  title,
  state,
  options,
  defaults,
  isRib,
  onMaterialChange,
  onFieldChange,
  onToggleOpen,
}: {
  title: string;
  state: PanelState;
  options: string[];
  defaults: Record<string, { unitPrice: number; unit: string; consumption: number; wastage: number; defaultComposition: string; defaultWeight: string }>;
  isRib: boolean;
  onMaterialChange: (mat: string) => void;
  onFieldChange: (field: string, val: string | number) => void;
  onToggleOpen: () => void;
}) {
  const totalCost = state.unit_price * state.consumption * (1 + state.wastage / 100);

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={onToggleOpen}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.875rem 1rem',
          background: 'var(--color-surface)',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>{title}</span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{state.material}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 500 }}>
            ${totalCost.toFixed(2)}/unit
          </span>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            {state.open ? '▲' : '▼'}
          </span>
        </div>
      </button>

      {/* Body */}
      {state.open && (
        <div style={{
          padding: '1rem',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          background: 'var(--color-bg)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {/* Material type */}
            <div>
              <Label>Type</Label>
              <select
                value={state.material}
                onChange={e => onMaterialChange(e.target.value)}
                style={selectStyle}
              >
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Composition */}
            <div>
              <Label>Composition</Label>
              <input
                type="text"
                value={state.composition}
                onChange={e => onFieldChange('composition', e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Weight / spec */}
            <div>
              <Label>Weight</Label>
              <input
                type="text"
                value={state.weight}
                onChange={e => onFieldChange('weight', e.target.value)}
                style={inputStyle}
                placeholder="e.g. 280 GSM"
              />
            </div>

            {/* Price per yard */}
            <div>
              <Label>Price / yard (USD)</Label>
              <input
                type="number"
                step="0.01"
                value={state.unit_price}
                onChange={e => onFieldChange('unit_price', parseFloat(e.target.value))}
                style={inputStyle}
              />
            </div>

            {/* Consumption */}
            <div>
              <Label>Consumption (yards)</Label>
              <input
                type="number"
                step="0.01"
                value={state.consumption}
                onChange={e => onFieldChange('consumption', parseFloat(e.target.value))}
                style={inputStyle}
              />
            </div>

            {/* Wastage */}
            <div>
              <Label>Wastage (%)</Label>
              <input
                type="number"
                step="1"
                value={state.wastage}
                onChange={e => onFieldChange('wastage', parseFloat(e.target.value))}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Computed cost */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '0.5rem 0.75rem',
            background: 'var(--color-cost-bg)',
            borderRadius: '6px',
            fontSize: '0.8125rem',
          }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Total / unit: </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, marginLeft: '0.5rem' }}>
              ${totalCost.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
      {children}
    </p>
  );
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.625rem',
  borderRadius: '6px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: '0.8125rem',
  fontFamily: 'inherit',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.625rem',
  borderRadius: '6px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: '0.8125rem',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const ctaStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
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
