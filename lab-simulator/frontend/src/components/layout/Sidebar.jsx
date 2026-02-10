export default function Sidebar({ title, children }) {
  return (
    <aside style={{
      background: 'var(--color-surface)',
      borderLeft: '1px solid var(--color-border)',
      padding: '20px',
      overflowY: 'auto',
    }}>
      {title && (
        <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--color-text)' }}>
          {title}
        </h3>
      )}
      {children}
    </aside>
  );
}
