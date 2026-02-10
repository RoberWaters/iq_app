export default function InstructionPanel({ title, steps, currentStep }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--color-border)',
    }}>
      {title && <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>{title}</h3>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {steps.map((step, i) => {
          const isCompleted = i < currentStep;
          const isActive = i === currentStep;
          return (
            <div key={i} style={{
              display: 'flex',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              background: isActive ? '#EFF6FF' : isCompleted ? '#F0FDF4' : 'transparent',
              border: isActive ? '1px solid var(--color-primary)' : '1px solid transparent',
            }}>
              <div style={{
                width: '24px', height: '24px',
                borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 600,
                background: isCompleted ? 'var(--color-success)' : isActive ? 'var(--color-primary)' : 'var(--color-border)',
                color: isCompleted || isActive ? '#fff' : 'var(--color-text-secondary)',
              }}>
                {isCompleted ? '\u2713' : i + 1}
              </div>
              <span style={{
                fontSize: '0.85rem',
                color: isActive ? 'var(--color-text)' : 'var(--color-text-secondary)',
                fontWeight: isActive ? 500 : 400,
              }}>
                {typeof step === 'string' ? step : step.description}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
