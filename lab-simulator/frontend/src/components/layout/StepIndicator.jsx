import { STAGES } from '../../utils/constants';
import useSimulatorStore from '../../store/useSimulatorStore';

export default function StepIndicator() {
  const { currentStage } = useSimulatorStore();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      padding: '12px 24px',
      background: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
    }}>
      {STAGES.map((stage) => {
        const isActive = stage.number === currentStage;
        const isCompleted = stage.number < currentStage;

        return (
          <div key={stage.number} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '28px', height: '28px',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 600,
              background: isActive ? 'var(--color-primary)' : isCompleted ? 'var(--color-success)' : 'var(--color-border)',
              color: isActive || isCompleted ? '#fff' : 'var(--color-text-secondary)',
              transition: 'all 0.3s',
            }}>
              {isCompleted ? '✓' : stage.number}
            </div>
            <span style={{
              fontSize: '0.7rem',
              marginLeft: '4px',
              marginRight: '8px',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontWeight: isActive ? 600 : 400,
              display: isActive ? 'inline' : 'none',
            }}>
              {stage.name}
            </span>
            {stage.number < 9 && (
              <div style={{
                width: '20px', height: '2px',
                background: isCompleted ? 'var(--color-success)' : 'var(--color-border)',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
