export default function ProgressBar({ value, max = 100, color = 'var(--color-primary)', height = 8 }) {
  const pct = Math.min(100, (value / max) * 100);

  return (
    <div style={{
      height, background: 'var(--color-border-light)',
      borderRadius: height / 2, overflow: 'hidden',
    }}>
      <div style={{
        height: '100%', width: `${pct}%`,
        background: color, borderRadius: height / 2,
        transition: 'width 0.5s ease',
      }} />
    </div>
  );
}
