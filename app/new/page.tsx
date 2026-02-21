'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function NewProjectPage() {
  const router = useRouter();

  const photoInput  = useRef<HTMLInputElement>(null);
  const sketchInput = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');

  // Inspiration photos (required — at least 1)
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);

  // Flat sketch (optional — front + back)
  const [sketchFront, setSketchFront] = useState<{ file: File; preview: string } | null>(null);
  const [sketchBack,  setSketchBack]  = useState<{ file: File; preview: string } | null>(null);

  function addPhotos(fileList: FileList | null) {
    if (!fileList) return;
    const picked = Array.from(fileList);
    setPhotos(prev => {
      const combined = [...prev];
      for (const f of picked) {
        if (combined.length >= 5) break;
        combined.push({ file: f, preview: URL.createObjectURL(f) });
      }
      return combined;
    });
  }

  function removePhoto(idx: number) {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function addSketch(side: 'front' | 'back', fileList: FileList | null) {
    const f = fileList?.[0];
    if (!f) return;
    const preview = URL.createObjectURL(f);
    if (side === 'front') setSketchFront({ file: f, preview });
    else                  setSketchBack ({ file: f, preview });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (photos.length === 0) { setError('Upload at least one photo.'); return; }

    setError('');
    setUploading(true);

    try {
      const form = new FormData(e.currentTarget);
      photos.forEach(p => form.append('photo', p.file));
      if (sketchFront) form.append('sketch_front', sketchFront.file);
      if (sketchBack)  form.append('sketch_back',  sketchBack.file);

      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      router.push(`/project/${data.projectId}/loading`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.375rem' }}>
        New Project
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
        Upload a garment photo and fill in the style details. We'll analyze it and pre-fill your BOM.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Style Name */}
        <Field label="Style Name" required>
          <input type="text" name="style_name" required placeholder="e.g. Oversized Hoodie" style={inputStyle} />
        </Field>

        {/* Style Number + Season */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Style Number">
            <input type="text" name="style_number" placeholder="FW26-HD-001" style={inputStyle} />
          </Field>
          <Field label="Season">
            <input type="text" name="season" placeholder="FW26" style={inputStyle} />
          </Field>
        </div>

        {/* Category */}
        <Field label="Garment Category" required>
          <select name="category" required style={inputStyle}>
            <option value="">Select category…</option>
            <option value="hoodie">Hoodie</option>
            <option value="sweatshirt">Crewneck Sweatshirt</option>
            <option value="sweatpants">Sweatpants</option>
          </select>
        </Field>

        {/* Base size */}
        <Field label="Base Size">
          <select name="base_size" defaultValue="M" style={inputStyle}>
            {['XS','S','M','L','XL','XXL'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>

        {/* Garment photos */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={labelStyle}>
              Garment Photos <span style={{ color: 'var(--color-error)' }}>*</span>
              <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400, marginLeft: '0.375rem' }}>(1–5 images)</span>
            </label>
            {photos.length > 0 && photos.length < 5 && (
              <button
                type="button"
                onClick={() => photoInput.current?.click()}
                style={{ fontSize: '0.8125rem', color: 'var(--color-text)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                + Add image
              </button>
            )}
          </div>

          <input
            ref={photoInput}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={e => { addPhotos(e.target.files); e.target.value = ''; }}
            style={{ display: 'none' }}
          />

          {photos.length === 0 ? (
            <button
              type="button"
              onClick={() => photoInput.current?.click()}
              style={{
                width: '100%',
                border: '2px dashed var(--color-border)',
                borderRadius: '8px',
                padding: '2.5rem 1rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'none',
                color: 'var(--color-text-secondary)',
                fontFamily: 'inherit',
              }}
            >
              <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Click to upload photos</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>PNG · JPG · WEBP — front, back, detail</p>
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {photos.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    background: 'var(--color-bg)',
                  }}
                >
                  <img src={p.preview} alt="" style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '4px', background: '#fff' }} />
                  <span style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: '1.125rem', lineHeight: 1, padding: '0.25rem' }}
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <button
                  type="button"
                  onClick={() => photoInput.current?.click()}
                  style={{
                    border: '1px dashed var(--color-border)',
                    borderRadius: '6px',
                    padding: '0.625rem',
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    background: 'none',
                    fontFamily: 'inherit',
                  }}
                >
                  + Add another ({photos.length}/5)
                </button>
              )}
            </div>
          )}
        </div>

        {/* Flat sketches (optional) */}
        <div>
          <label style={{ ...labelStyle, display: 'block', marginBottom: '0.5rem' }}>
            Flat Sketches
            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400, marginLeft: '0.375rem' }}>(optional)</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <SketchUpload
              label="Front sketch"
              file={sketchFront}
              onPick={fl => addSketch('front', fl)}
              onClear={() => setSketchFront(null)}
            />
            <SketchUpload
              label="Back sketch"
              file={sketchBack}
              onPick={fl => addSketch('back', fl)}
              onClear={() => setSketchBack(null)}
            />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.375rem' }}>
            Upload your own flat sketches. They'll appear in the tech pack PDF.
          </p>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            fontSize: '0.8125rem',
            color: 'var(--color-error)',
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={uploading || photos.length === 0}
          style={{
            padding: '0.75rem',
            background: 'var(--color-accent)',
            color: '#fff',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.9375rem',
            border: 'none',
            cursor: uploading || photos.length === 0 ? 'not-allowed' : 'pointer',
            opacity: uploading || photos.length === 0 ? 0.5 : 1,
            fontFamily: 'inherit',
          }}
        >
          {uploading ? 'Creating project…' : 'Create Project →'}
        </button>
      </form>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ ...labelStyle, display: 'block', marginBottom: '0.375rem' }}>
        {label}
        {required && <span style={{ color: 'var(--color-error)', marginLeft: '0.25rem' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function SketchUpload({
  label,
  file,
  onPick,
  onClear,
}: {
  label: string;
  file: { file: File; preview: string } | null;
  onPick: (fl: FileList | null) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={e => { onPick(e.target.files); e.target.value = ''; }}
        style={{ display: 'none' }}
      />
      {file ? (
        <div style={{ position: 'relative', border: '1px solid var(--color-border)', borderRadius: '6px', overflow: 'hidden' }}>
          <img src={file.preview} alt={label} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'contain', background: '#fff' }} />
          <button
            type="button"
            onClick={onClear}
            style={{
              position: 'absolute',
              top: '0.375rem',
              right: '0.375rem',
              width: '1.5rem',
              height: '1.5rem',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{
            width: '100%',
            aspectRatio: '3 / 4',
            border: '1px dashed var(--color-border)',
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            background: 'none',
            gap: '0.25rem',
            fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: '1.25rem', color: 'var(--color-text-tertiary)' }}>+</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{label}</span>
        </button>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: 'var(--color-text)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};
