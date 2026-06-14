export default function LoadingSkeleton({ rows = 3, height = 80 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height, borderRadius: '8px' }} />
      ))}
    </div>
  );
}
