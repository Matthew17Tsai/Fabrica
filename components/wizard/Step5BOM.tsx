'use client';

/**
 * Step 4 — BOM (Bill of Materials)
 *
 * Grouped BOM table with editable pricing cells.
 * Cost settings and breakdown have moved to Step 5 (Cost).
 */

import { useState, useEffect } from 'react';

interface BomItem {
  id: string;
  component: string;
  material: string;
  composition: string;
  specification: string | null;
  notes: string | null;
  category: string;
  unit_price: number;
  unit: string;
  consumption: number;
  wastage: number;
  total_cost: number;
}

interface Props {
  projectId: string;
  subType?: string;
  initialBomItems: BomItem[];
  bomLoaded?: boolean;
  onCostChange?: () => void;
  onConfirm: () => void;
}

const CATEGORY_ORDER = ['fabric', 'trim', 'label', 'packaging', 'thread'];
const CATEGORY_LABELS: Record<string, string> = {
  fabric:    'Fabrics',
  trim:      'Trims & Hardware',
  label:     'Labels',
  packaging: 'Packaging',
  thread:    'Thread',
};

export default function Step5BOM({
  projectId,
  initialBomItems,
  bomLoaded = true,
  onCostChange,
  onConfirm,
}: Props) {
  const [bomItems, setBomItems] = useState<BomItem[]>(initialBomItems);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    setBomItems(initialBomItems);
  }, [initialBomItems]);

  function handleBomItemChange(id: string, field: keyof BomItem, value: string | number) {
    setBomItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  }

  async function handleConfirm() {
    setSaving(true);
    try {
      // Save all BOM items
      await fetch(`/api/projects/${projectId}/bom`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: bomItems }),
      });
      onCostChange?.();
      onConfirm();
    } finally {
      setSaving(false);
    }
  }

  // Group BOM items
  const grouped: Record<string, BomItem[]> = {};
  for (const cat of CATEGORY_ORDER) grouped[cat] = [];
  for (const item of bomItems) {
    const cat = item.category in grouped ? item.category : 'trim';
    grouped[cat].push(item);
  }

  const filledCategories = CATEGORY_ORDER.filter(cat => grouped[cat].length > 0);

  return (
    <div style={{ padding: '2rem 2.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Step 4 — BOM</h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          Review and adjust materials, quantities, and unit prices. Confirm to lock the BOM.
        </p>
      </div>

      {/* BOM grouped table */}
      {!bomLoaded ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Loading…</p>
      ) : bomItems.length === 0 ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          No BOM items found. Try re-uploading your garment photo or contact support.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {filledCategories.map(cat => (
            <BomGroup
              key={cat}
              title={CATEGORY_LABELS[cat] ?? cat}
              items={grouped[cat]}
              onItemChange={handleBomItemChange}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: 'auto' }}>
        <button onClick={handleConfirm} disabled={saving || !bomLoaded || bomItems.length === 0} style={ctaStyle}>
          {saving ? 'Saving…' : 'Confirm BOM →'}
        </button>
      </div>
    </div>
  );
}

// ── BOM group ─────────────────────────────────────────────────────────────────

function BomGroup({
  title,
  items,
  onItemChange,
}: {
  title: string;
  items: BomItem[];
  onItemChange: (id: string, field: keyof BomItem, value: string | number) => void;
}) {
  return (
    <div>
      <h3 style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'var(--color-text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: '0.375rem',
        paddingBottom: '0.25rem',
        borderBottom: '1px solid var(--color-border)',
      }}>
        {title}
      </h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
        <thead>
          <tr style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            {['Component', 'Material', 'Composition', '$/unit', 'Qty', 'Waste%', 'Total'].map(h => (
              <th key={h} style={{
                padding: '0.375rem 0.5rem',
                textAlign: h === 'Component' || h === 'Material' || h === 'Composition' ? 'left' : 'right',
                borderBottom: '1px solid var(--color-border)',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'var(--color-bg)' }}>
              <td style={{ padding: '0.375rem 0.5rem', color: 'var(--color-text)', fontWeight: 500 }}>{item.component}</td>
              <td style={{ padding: '0.375rem 0.5rem', color: 'var(--color-text-secondary)' }}>{item.material}</td>
              <td style={{ padding: '0.375rem 0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>{item.composition}</td>
              <EditableCell value={item.unit_price}   step={0.01} onBlur={v => onItemChange(item.id, 'unit_price',   v)} />
              <EditableCell value={item.consumption}  step={0.1}  onBlur={v => onItemChange(item.id, 'consumption',  v)} />
              <EditableCell value={item.wastage}      step={1}    onBlur={v => onItemChange(item.id, 'wastage',      v)} />
              <td style={{ padding: '0.375rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                ${item.total_cost.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EditableCell({
  value,
  step,
  onBlur,
}: {
  value: number;
  step: number;
  onBlur: (v: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  return (
    <td style={{ padding: '0.25rem 0.375rem', textAlign: 'right' }}>
      <input
        type="number"
        step={step}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => {
          const n = parseFloat(draft);
          if (!isNaN(n)) onBlur(n);
        }}
        style={{
          width: '64px',
          textAlign: 'right',
          padding: '0.25rem 0.375rem',
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8125rem',
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
        }}
      />
    </td>
  );
}

const ctaStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.625rem 1.5rem',
  borderRadius: '6px',
  background: 'var(--color-confirmed)',
  color: '#fff',
  fontWeight: 600,
  fontSize: '0.875rem',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
};
