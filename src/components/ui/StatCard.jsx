import { useEffect, useState } from 'react';

const AnimatedNumber = ({ value }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = parseFloat(value) || 0;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min((now - start) / 700, 1);
      setDisplay(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span>{display.toLocaleString()}</span>;
};

const COLOR_MAP = {
  gold:   { fg: '#047857', bg: '#ECFDF3', bar: '#10B981' },
  green:  { fg: '#047857', bg: '#ECFDF3', bar: '#10B981' },
  red:    { fg: '#B42318', bg: '#FEF3F2', bar: '#F04438' },
  blue:   { fg: '#175CD3', bg: '#EFF8FF', bar: '#2E90FA' },
  purple: { fg: '#5925DC', bg: '#F4F3FF', bar: '#7A5AF8' },
  amber:  { fg: '#B54708', bg: '#FFFAEB', bar: '#F79009' },
};

export default function StatCard({ label, value, icon: Icon, color = 'gold', trend, suffix = '', hint }) {
  const c = COLOR_MAP[color] || COLOR_MAP.gold;
  const isNumber = typeof value === 'number' || /^-?\d+(\.\d+)?$/.test(String(value ?? ''));

  return (
    <div className="stat-card animate-fade-in relative overflow-hidden">
      <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: c.bar }} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12.5px] font-medium text-[#475467] truncate">{label}</span>
        {Icon && (
          <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: c.bg, color: c.fg }}>
            <Icon size={16} />
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[26px] leading-none font-semibold tracking-tight text-[#101828] tabular-nums">
          {isNumber ? <AnimatedNumber value={value} /> : value}{suffix}
        </span>
        {trend !== undefined && trend !== null && (
          <span className="text-[11.5px] font-medium px-1.5 py-0.5 rounded-full"
            style={trend >= 0 ? { color: '#067647', background: '#ECFDF3' } : { color: '#B42318', background: '#FEF3F2' }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      {hint && <p className="mt-1.5 text-[11.5px] text-[#98A2B3] truncate">{hint}</p>}
    </div>
  );
}
