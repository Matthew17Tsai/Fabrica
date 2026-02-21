'use client';

/**
 * WizardNav — horizontal 5-step navigation bar.
 * Clicking a step calls onStepChange(index).
 */

export type WizardStepStatus = 'not_started' | 'unconfirmed' | 'confirmed';

export interface WizardStep {
  label: string;
  status: WizardStepStatus;
}

interface WizardNavProps {
  steps: WizardStep[];
  currentStep: number; // 1-indexed
  onStepChange: (step: number) => void;
}

const STATUS_DOT: Record<WizardStepStatus, { color: string; title: string }> = {
  confirmed:   { color: 'var(--color-confirmed)',   title: 'Confirmed' },
  unconfirmed: { color: 'var(--color-unconfirmed)', title: 'Unconfirmed' },
  not_started: { color: 'var(--color-not-started)', title: 'Not started' },
};

export default function WizardNav({ steps, currentStep, onStepChange }: WizardNavProps) {
  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        paddingLeft: '1.5rem',
        paddingRight: '1.5rem',
        overflowX: 'auto',
      }}
    >
      {steps.map((step, i) => {
        const num = i + 1;
        const isActive = num === currentStep;
        const dot = STATUS_DOT[step.status];

        return (
          <button
            key={num}
            onClick={() => onStepChange(num)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.875rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: isActive ? '2px solid var(--color-text)' : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              color: isActive ? 'var(--color-text)' : 'var(--color-text-secondary)',
              fontWeight: isActive ? 600 : 400,
              fontSize: '0.8125rem',
              fontFamily: 'inherit',
              transition: 'color 0.15s',
            }}
          >
            {/* Step number badge */}
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '1.25rem',
                height: '1.25rem',
                borderRadius: '50%',
                fontSize: '0.6875rem',
                fontWeight: 600,
                background: isActive ? 'var(--color-text)' : 'var(--color-border)',
                color: isActive ? '#fff' : 'var(--color-text-secondary)',
                flexShrink: 0,
              }}
            >
              {num}
            </span>
            {step.label}
            {/* Status dot */}
            <span
              title={dot.title}
              style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: dot.color,
                flexShrink: 0,
              }}
            />
          </button>
        );
      })}
    </nav>
  );
}
