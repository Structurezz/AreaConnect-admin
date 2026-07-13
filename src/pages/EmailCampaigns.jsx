import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Mail, Plus, Send, Edit3, Trash2, Search, Play, Pause,
  Users, CheckCircle2, Clock, Sparkles, Wand2,
} from 'lucide-react';
import { campaignAPI } from '../api';
import QuickEmailGenerator from '../components/QuickEmailGenerator';

const STATUS_STYLES = {
  draft:  { bg: '#F1F5F9', color: '#475569', label: 'Draft' },
  active: { bg: '#DCFCE7', color: '#166534', label: 'Active' },
  paused: { bg: '#FEF3C7', color: '#92400E', label: 'Paused' },
  ended:  { bg: '#FEE2E2', color: '#991B1B', label: 'Ended' },
};

const SEGMENT_LABEL = {
  all:             'All users',
  new_users:       'New users',
  existing_users:  'Existing users',
  by_role:         'By role',
  by_estate:       'By estate',
};

export default function EmailCampaigns() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showGenerator, setShowGenerator] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const res = await campaignAPI.list();
      setAll(res.data?.data || []);
    } catch {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const emailCampaigns = useMemo(
    () => all.filter(c => (c.placements || []).includes('email')),
    [all]
  );

  const filtered = emailCampaigns.filter(c => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (q && !c.name.toLowerCase().includes(q.toLowerCase()) && !c.email?.subject?.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const totals = useMemo(() => ({
    active:    emailCampaigns.filter(c => c.status === 'active').length,
    sent:      emailCampaigns.reduce((s, c) => s + (c.metrics?.emailsSent || 0), 0),
    signup:    emailCampaigns.filter(c => c.email?.sendOnUserSignup && c.status === 'active').length,
    scheduled: emailCampaigns.filter(c => c.schedule?.startAt && new Date(c.schedule.startAt) > new Date()).length,
  }), [emailCampaigns]);

  const setStatus = async (id, status) => {
    try {
      await campaignAPI.setStatus(id, status);
      toast.success(`Campaign ${status}`);
      load();
    } catch { toast.error('Failed to update'); }
  };

  const remove = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try { await campaignAPI.remove(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const blast = async (id) => {
    if (!window.confirm('Send this email to all matching users right now?')) return;
    try {
      const res = await campaignAPI.sendEmail(id);
      const { targeted, sent } = res.data?.data || {};
      toast.success(`Sent ${sent}/${targeted} emails`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    }
  };

  return (
    <>
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#EC4899,#F472B6)' }}>
                <Mail size={20} color="#fff" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
                  Email Campaigns
                </h1>
                <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
                  Schedule blasts, auto-welcome new signups, and track what's landed.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/campaigns"
              className="px-3 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#F1F5F9', color: '#475569', textDecoration: 'none' }}
            >
              All Campaigns
            </Link>
            <Link
              to="/campaigns/new?type=email"
              className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#fff', color: '#0F172A', border: '1px solid #E2E8F0', textDecoration: 'none' }}
            >
              <Plus size={14} /> Manual
            </Link>
            <button
              onClick={() => setShowGenerator(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-transform hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg,#EC4899 0%,#F472B6 100%)' }}
            >
              <Wand2 size={16} /> Generate Campaign Email
            </button>
          </div>
        </div>

        {showGenerator && (
          <QuickEmailGenerator
            onClose={() => setShowGenerator(false)}
            onPublished={() => { setShowGenerator(false); load(); }}
          />
        )}

        {/* Stat tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatTile icon={CheckCircle2} label="Active" value={totals.active} tint="#DCFCE7" tintFg="#166534" />
          <StatTile icon={Send}         label="Emails sent" value={totals.sent.toLocaleString()} tint="#FDF2F8" tintFg="#BE185D" />
          <StatTile icon={Sparkles}     label="On-signup auto" value={totals.signup} tint="#FEF3C7" tintFg="#92400E" />
          <StatTile icon={Clock}        label="Scheduled" value={totals.scheduled} tint="#E0F2FE" tintFg="#075985" />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search name or subject…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#fff', border: '1px solid #E2E8F0' }}
            />
          </div>
          <div className="flex gap-1.5">
            {['', 'active', 'draft', 'paused', 'ended'].map(s => (
              <button
                key={s || 'all'}
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

        {/* Table */}
        {loading ? (
          <div className="py-16 text-center text-sm" style={{ color: '#94A3B8' }}>Loading email campaigns…</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center rounded-2xl" style={{ background: '#fff', border: '1px dashed #E2E8F0' }}>
            <Mail size={40} className="mx-auto mb-3" style={{ color: '#CBD5E1' }} />
            <h3 className="text-lg font-semibold" style={{ color: '#0F172A' }}>No email campaigns yet</h3>
            <p className="text-sm mt-1 mb-4" style={{ color: '#64748B' }}>
              Send a welcome, a monthly digest, or a one-time announcement.
            </p>
            <Link
              to="/campaigns/new?type=email"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white"
              style={{ background: '#EC4899', textDecoration: 'none' }}
            >
              <Plus size={14} /> Create Email Campaign
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ background: '#F8FAFC' }}>
                  <tr>
                    <Th>Campaign</Th>
                    <Th>Subject</Th>
                    <Th>Audience</Th>
                    <Th>Sent</Th>
                    <Th>Status</Th>
                    <Th align="right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const st = STATUS_STYLES[c.status] || STATUS_STYLES.draft;
                    const primary = c.content?.theme?.primaryColor || '#EC4899';
                    return (
                      <tr key={c._id} style={{ borderTop: '1px solid #F1F5F9' }}>
                        <Td>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${primary}22`, color: primary }}>
                              <Mail size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold truncate" style={{ color: '#0F172A' }}>{c.name}</div>
                              {c.email?.sendOnUserSignup && (
                                <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: '#BE185D' }}>
                                  <Sparkles size={9} /> Auto on signup
                                </div>
                              )}
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <div className="text-sm max-w-[280px]" style={{ color: '#0F172A' }}>
                            {c.email?.subject || <span style={{ color: '#CBD5E1', fontStyle: 'italic' }}>No subject</span>}
                          </div>
                          {c.email?.preheader && (
                            <div className="text-xs mt-0.5 max-w-[280px] truncate" style={{ color: '#94A3B8' }}>{c.email.preheader}</div>
                          )}
                        </Td>
                        <Td>
                          <div className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: '#F1F5F9', color: '#475569' }}>
                            <Users size={11} /> {SEGMENT_LABEL[c.audience?.segment] || 'All'}
                          </div>
                        </Td>
                        <Td>
                          <div className="text-sm font-bold" style={{ color: '#0F172A' }}>{(c.metrics?.emailsSent || 0).toLocaleString()}</div>
                        </Td>
                        <Td>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                        </Td>
                        <Td align="right">
                          <div className="flex items-center justify-end gap-1">
                            <button title="Send blast now" onClick={() => blast(c._id)} className="p-1.5 rounded-lg" style={{ background: '#FCE7F3', color: '#BE185D' }}>
                              <Send size={14} />
                            </button>
                            {c.status === 'active' ? (
                              <button title="Pause" onClick={() => setStatus(c._id, 'paused')} className="p-1.5 rounded-lg" style={{ background: '#FEF3C7', color: '#92400E' }}>
                                <Pause size={14} />
                              </button>
                            ) : (
                              <button title="Activate" onClick={() => setStatus(c._id, 'active')} className="p-1.5 rounded-lg" style={{ background: '#DCFCE7', color: '#166534' }}>
                                <Play size={14} />
                              </button>
                            )}
                            <button title="Edit" onClick={() => navigate(`/campaigns/${c._id}`)} className="p-1.5 rounded-lg" style={{ background: '#F1F5F9', color: '#0F172A' }}>
                              <Edit3 size={14} />
                            </button>
                            <button title="Delete" onClick={() => remove(c._id, c.name)} className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Th({ children, align = 'left' }) {
  return (
    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: '#94A3B8', textAlign: align }}>
      {children}
    </th>
  );
}

function Td({ children, align = 'left' }) {
  return (
    <td className="px-4 py-3 align-middle" style={{ textAlign: align }}>
      {children}
    </td>
  );
}

function StatTile({ icon: Icon, label, value, tint, tintFg }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: tint, color: tintFg }}>
          <Icon size={15} />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>{label}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  );
}
