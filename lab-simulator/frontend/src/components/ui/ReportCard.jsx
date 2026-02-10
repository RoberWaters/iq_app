import ProgressBar from '../common/ProgressBar';

export default function ReportCard({ report }) {
  if (!report) return null;

  const { criteria, total_score, max_score, passed, overall_feedback } = report;

  const scoreColor = total_score >= 80 ? 'var(--color-success)' : total_score >= 60 ? 'var(--color-warning)' : 'var(--color-error)';

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      boxShadow: 'var(--shadow-md)',
      border: '1px solid var(--color-border)',
    }}>
      {/* Total score */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '3rem', fontWeight: 700, color: scoreColor, fontFamily: 'var(--font-mono)' }}>
          {total_score}
        </div>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          de {max_score} puntos
        </div>
        <div style={{ marginTop: '8px' }}>
          <ProgressBar value={total_score} max={max_score} color={scoreColor} height={10} />
        </div>
        <div style={{
          marginTop: '12px',
          padding: '8px 16px',
          display: 'inline-block',
          borderRadius: '20px',
          fontSize: '0.85rem',
          fontWeight: 600,
          background: passed ? '#F0FDF4' : '#FEF2F2',
          color: passed ? 'var(--color-success)' : 'var(--color-error)',
        }}>
          {passed ? 'Aprobado' : 'No aprobado'}
        </div>
      </div>

      {/* Criteria breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {criteria.map((c) => (
          <div key={c.criterion_id} style={{
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border-light)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{c.criterion_label}</span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                color: c.score >= c.max_score ? 'var(--color-success)' : c.score > 0 ? 'var(--color-warning)' : 'var(--color-error)',
              }}>
                {c.score}/{c.max_score}
              </span>
            </div>
            <ProgressBar value={c.score} max={c.max_score}
              color={c.score >= c.max_score ? 'var(--color-success)' : c.score > 0 ? 'var(--color-warning)' : 'var(--color-error)'}
            />
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              {c.feedback}
            </div>
          </div>
        ))}
      </div>

      {/* Overall feedback */}
      <div style={{
        marginTop: '20px',
        padding: '14px',
        background: '#F0F7FF',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.9rem',
        color: 'var(--color-text)',
        border: '1px solid #BFDBFE',
      }}>
        {overall_feedback}
      </div>
    </div>
  );
}
