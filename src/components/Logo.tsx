export default function Logo({ size = 'md', dark = false }: { size?: 'sm' | 'md' | 'lg'; dark?: boolean }) {
  const sizes = { sm: { box: 28, font: 16, sub: 9 }, md: { box: 36, font: 22, sub: 11 }, lg: { box: 48, font: 30, sub: 13 } }
  const s = sizes[size]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, userSelect: 'none' }}>
      <div style={{ width: s.box, height: s.box, borderRadius: s.box * 0.25, background: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width={s.box * 0.65} height={s.box * 0.65} viewBox="0 0 20 20" fill="none">
          <polyline points="3,10 8,15 17,5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: s.font, lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ color: '#0ea5e9' }}>Todo</span>
          <span style={{ color: dark ? '#fff' : 'var(--text, #1e293b)' }}>Click</span>
          <span style={{ color: '#f59e0b' }}>MX</span>
        </div>
        {size !== 'sm' && <div style={{ fontSize: s.sub, color: 'var(--text2, #94a3b8)', letterSpacing: '0.08em', marginTop: 1, textTransform: 'uppercase' }}>Todo lo que necesitas, a un clic</div>}
      </div>
    </div>
  )
}
