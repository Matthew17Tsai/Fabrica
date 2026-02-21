export default function HomePage() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '5rem 1.5rem' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: '1rem' }}>
          Photo to Factory-Ready Tech Pack in Minutes
        </h1>
        <p style={{ fontSize: '1.0625rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: '460px', margin: '0 auto 2rem' }}>
          Upload a garment photo. AI detects features and pre-fills your BOM.
          Confirm in 5 steps and export a costed tech pack ready for your factory.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <a
            href="/new"
            style={{
              padding: '0.75rem 1.75rem',
              background: 'var(--color-accent)',
              color: '#fff',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9375rem',
              textDecoration: 'none',
            }}
          >
            New Project →
          </a>
          <a
            href="/projects"
            style={{
              padding: '0.75rem 1.75rem',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '0.9375rem',
              textDecoration: 'none',
              background: 'var(--color-surface)',
            }}
          >
            View Projects
          </a>
        </div>
      </div>

      {/* 3-step visual */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '4rem' }}>
        {[
          {
            number: '1',
            title: 'Upload',
            description: 'Photo of your garment. AI detects features and pre-fills the BOM.',
          },
          {
            number: '2',
            title: 'Confirm',
            description: 'Review features, materials, POM, and size run in 5 guided steps.',
          },
          {
            number: '3',
            title: 'Export',
            description: 'Download a 5-page tech pack PDF with full cost breakdown.',
          },
        ].map((step) => (
          <div
            key={step.number}
            style={{
              padding: '1.5rem',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              background: 'var(--color-surface)',
            }}
          >
            <div style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '50%',
              background: 'var(--color-accent)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.875rem',
              marginBottom: '0.875rem',
            }}>
              {step.number}
            </div>
            <h3 style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.375rem' }}>
              {step.title}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
              {step.description}
            </p>
          </div>
        ))}
      </div>

      {/* Supported categories */}
      <div style={{
        padding: '1.25rem 1.5rem',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        background: 'var(--color-surface)',
      }}>
        <h2 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Supported Garments
        </h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {['Pullover Hoodie', 'Zip Hoodie', 'Oversized Hoodie', 'Crewneck Sweatshirt', 'Sweatpants'].map(g => (
            <span
              key={g}
              style={{
                padding: '0.25rem 0.75rem',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: '999px',
                fontSize: '0.8125rem',
                color: 'var(--color-text)',
              }}
            >
              {g}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
