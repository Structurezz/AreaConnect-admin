import { useEffect, useState } from 'react';

const AnimatedNumber = ({ value }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = parseInt(value) || 0;
    const duration = 800;
    const step = Math.ceil(target / (duration / 16));
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setDisplay(current);
      if (current >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{display.toLocaleString()}</span>;
};

const COLOR_MAP = {
  gold: {
    icon:   { background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.20)', color: '#059669' },
  },
  green: {
    icon:   { background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.20)', color: '#059669' },
  },
  red: {
    icon:   { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#DC2626' },
  },
  blue: {
    icon:   { background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)', color: '#2563EB' },
  },
  purple: {
    icon:   { background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', color: '#7C3AED' },
  },
};

export default function StatCard({ label, value, icon: Icon, color = 'gold', trend, suffix = '' }) {
  const colors = COLOR_MAP[color] || COLOR_MAP.gold;

  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div
          className="p-2.5 rounded-xl"
          style={colors.icon}
        >
          <Icon size={22} />
        </div>
        {trend !== undefined && (
          <span
            className="text-xs font-medium"
            style={{ color: trend >= 0 ? '#059669' : '#DC2626' }}
          >
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="text-3xl font-bold mb-1" style={{ color: '#0F172A' }}>
        <AnimatedNumber value={value} />{suffix}
      </div>
      <div className="text-sm font-medium" style={{ color: '#94A3B8' }}>{label}</div>
    </div>
  );
}
