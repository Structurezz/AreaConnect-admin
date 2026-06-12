export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: '#F1F5F9', border: '1px solid #E2E8F0' }}
        >
          <Icon size={28} style={{ color: '#CBD5E1' }} />
        </div>
      )}
      <h3 className="font-semibold mb-1" style={{ color: '#475569' }}>{title}</h3>
      {message && <p className="text-sm mb-4" style={{ color: '#94A3B8' }}>{message}</p>}
      {action}
    </div>
  );
}
