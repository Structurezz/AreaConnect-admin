import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Megaphone, Plus, Play, Pause, Trash2, Mail, Eye, MousePointer2,
  X, Search, Send, CalendarDays,
} from 'lucide-react';
import { campaignAPI } from '../api';

const STATUS_STYLES = {
  draft:  { bg: '#F1F5F9', color: '#475569', label: 'Draft' },
  active: { bg: '#DCFCE7', color: '#166534', label: 'Active' },
  paused: { bg: '#FEF3C7', color: '#92400E', label: 'Paused' },
  ended:  { bg: '#FEE2E2', color: '#991B1B', label: 'Ended' },
};

const PLACEMENT_LABEL = {
  modal:            'In-App Modal',
  email:            'Email',
  login_sidebar:    'Login Sidebar',
  lounge_feed:      'Lounge Feed',
  dashboard_banner: 'Dashboard Banner',
};

const PLACEMENT_ICON = {
  modal:            '🪟',
  email:            '✉️',
  login_sidebar:    '📱',
  lounge_feed:      '💬',
  dashboard_banner: '🎯',
};

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.q = q;
      if (statusFilter) params.status = statusFilter;
      const res = await campaignAPI.list(params);
      setCampaigns(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => {
    try {
      await campaignAPI.setStatus(id, status);
      toast.success(`Campaign ${status}`);
      load();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const remove = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await campaignAPI.remove(id);
      toast.success('Deleted');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const sendBlast = async (id) => {
    if (!window.confirm('Send email blast to all matching users now?')) return;
    try {
      const res = await campaignAPI.sendEmail(id);
      const { targeted, sent } = res.data?.data || {};
      toast.success(`Sent ${sent}/${targeted} emails`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    }
  };

  const filtered = campaigns.filter(c =>
    !q || c.name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Megaphone size={26} style={{ color: '#EC4899' }} />
              <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
                Campaigns
              </h1>
            </div>
            <p className="text-sm" style={{ color: '#64748B' }}>
              Design ad content, target segments, and ship it across the apps.
            </p>
          </div>

          <Link
            to="/campaigns/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-transform hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg,#EC4899 0%,#F472B6 100%)', textDecoration: 'none' }}
          >
            <Plus size={16} /> New Campaign
          </Link>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search campaigns…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#fff', border: '1px solid #E2E8F0' }}
            />
          </div>

          <div className="flex gap-2">
            {['', 'draft', 'active', 'paused', 'ended'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="px-3 py-2 rounded-lg text-xs font-semibold transition"
                style={{
                  background: statusFilter === s ? '#0F172A' : '#fff',
                  color: statusFilter === s ? '#fff' : '#475569',
                  border: '1px solid #E2E8F0',
                }}
              >
                {s ? STATUS_STYLES[s]?.label : 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="py-16 text-center text-sm" style={{ color: '#94A3B8' }}>Loading campaigns…</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center rounded-2xl" style={{ background: '#fff', border: '1px dashed #E2E8F0' }}>
            <Megaphone size={40} className="mx-auto mb-3" style={{ color: '#CBD5E1' }} />
            <h3 className="text-lg font-semibold" style={{ color: '#0F172A' }}>No campaigns yet</h3>
            <p className="text-sm mt-1 mb-4" style={{ color: '#64748B' }}>
              Launch your first ad to greet new members or promote a feature.
            </p>
            <Link
              to="/campaigns/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white"
              style={{ background: '#EC4899', textDecoration: 'none' }}
            >
              <Plus size={14} /> Create Campaign
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(c => {
              const st = STATUS_STYLES[c.status] || STATUS_STYLES.draft;
              const primary = c.content?.theme?.primaryColor || '#EC4899';
              const bg = c.content?.theme?.backgroundColor || '#0F172A';

              return (
                <div key={c._id} className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
                  {/* Preview strip */}
                  <div
                    className="p-4"
                    style={{
                      background: `linear-gradient(135deg, ${bg} 0%, ${primary} 200%)`,
                      color: c.content?.theme?.textColor || '#fff',
                      minHeight: 96,
                    }}
                  >
                    {c.content?.badge && (
                      <span
                        className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider mb-1.5"
                        style={{ background: 'rgba(255,255,255,0.14)' }}
                      >
                        {c.content.badge}
                      </span>
                    )}
                    <h3 className="text-base font-bold leading-tight" style={{ letterSpacing: '-0.01em' }}>
                      {c.content?.headline}
                    </h3>
                    {c.content?.subheadline && (
                      <p className="text-xs mt-1 opacity-80 line-clamp-2">{c.content.subheadline}</p>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <h4 className="text-sm font-bold" style={{ color: '#0F172A' }}>{c.name}</h4>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: st.bg, color: st.color }}
                      >
                        {st.label}
                      </span>
                    </div>

                    {/* Placements */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {(c.placements || []).map(p => (
                        <span key={p} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#F1F5F9', color: '#475569' }}>
                          {PLACEMENT_ICON[p]} {PLACEMENT_LABEL[p]}
                        </span>
                      ))}
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                      <div className="p-2 rounded-lg" style={{ background: '#F8FAFC' }}>
                        <Eye size={12} className="mx-auto mb-0.5" style={{ color: '#94A3B8' }} />
                        <div className="text-xs font-bold" style={{ color: '#0F172A' }}>{c.metrics?.impressions || 0}</div>
                      </div>
                      <div className="p-2 rounded-lg" style={{ background: '#F8FAFC' }}>
                        <MousePointer2 size={12} className="mx-auto mb-0.5" style={{ color: '#94A3B8' }} />
                        <div className="text-xs font-bold" style={{ color: '#0F172A' }}>{c.metrics?.clicks || 0}</div>
                      </div>
                      <div className="p-2 rounded-lg" style={{ background: '#F8FAFC' }}>
                        <Mail size={12} className="mx-auto mb-0.5" style={{ color: '#94A3B8' }} />
                        <div className="text-xs font-bold" style={{ color: '#0F172A' }}>{c.metrics?.emailsSent || 0}</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => navigate(`/campaigns/${c._id}`)}
                        className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: '#F1F5F9', color: '#0F172A' }}
                      >
                        Edit
                      </button>

                      {c.status === 'active' ? (
                        <button
                          onClick={() => setStatus(c._id, 'paused')}
                          title="Pause"
                          className="p-1.5 rounded-lg"
                          style={{ background: '#FEF3C7', color: '#92400E' }}
                        >
                          <Pause size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setStatus(c._id, 'active')}
                          title="Activate"
                          className="p-1.5 rounded-lg"
                          style={{ background: '#DCFCE7', color: '#166534' }}
                        >
                          <Play size={14} />
                        </button>
                      )}

                      {c.placements?.includes('email') && (
                        <button
                          onClick={() => sendBlast(c._id)}
                          title="Send email now"
                          className="p-1.5 rounded-lg"
                          style={{ background: '#FCE7F3', color: '#BE185D' }}
                        >
                          <Send size={14} />
                        </button>
                      )}

                      <button
                        onClick={() => remove(c._id, c.name)}
                        title="Delete"
                        className="p-1.5 rounded-lg"
                        style={{ background: '#FEE2E2', color: '#991B1B' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
