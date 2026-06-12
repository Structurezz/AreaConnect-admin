export default function Spinner({ size = 24, className = '' }) {
  return (
    <div
      className={`inline-block animate-spin rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        border: '2px solid #E2E8F0',
        borderTopColor: '#10B981',
        borderRadius: '50%',
      }}
    />
  );
}

export function LoadingScreen() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: '#F8FAFC' }}
    >
      <div className="text-2xl font-semibold" style={{ color: '#0F172A' }}>
        Area<span style={{ color: '#10B981' }}>Connect</span>
      </div>
      <Spinner size={36} />
      <p className="text-[11px] text-slate-400 text-center mt-6 tracking-wide">
        Powered by <span className="font-semibold text-slate-500">AREA CONNECTOR TECHNOLOGIES</span> · RC&nbsp;9607864
      </p>
    </div>
  );
}
