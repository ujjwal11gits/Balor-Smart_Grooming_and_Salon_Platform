export default function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;

  const start = Math.max(1, page - 2);
  const end = Math.min(pages, page + 2);
  const pageNums = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginTop: '18px', flexWrap: 'wrap' }}>
      <button style={btn(false, false)} disabled={page === 1} onClick={() => onPage(page - 1)}>← Prev</button>
      {start > 1 && (
        <>
          <button style={btn(false, false)} onClick={() => onPage(1)}>1</button>
          {start > 2 && <span style={{ color: 'var(--text3)', padding: '0 4px' }}>…</span>}
        </>
      )}
      {pageNums.map((p) => (
        <button key={p} style={btn(p === page, false)} onClick={() => onPage(p)}>{p}</button>
      ))}
      {end < pages && (
        <>
          {end < pages - 1 && <span style={{ color: 'var(--text3)', padding: '0 4px' }}>…</span>}
          <button style={btn(false, false)} onClick={() => onPage(pages)}>{pages}</button>
        </>
      )}
      <button style={btn(false, false)} disabled={page === pages} onClick={() => onPage(page + 1)}>Next →</button>
    </div>
  );
}

const btn = (active, disabled) => ({
  padding: '6px 12px',
  border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
  borderRadius: '6px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  background: active ? 'var(--accent)' : 'var(--card)',
  color: active ? '#fff' : 'var(--text)',
  fontSize: '0.85rem',
  fontFamily: 'inherit',
  fontWeight: active ? 600 : 400,
  opacity: disabled ? 0.4 : 1,
  transition: 'all 0.15s',
});
