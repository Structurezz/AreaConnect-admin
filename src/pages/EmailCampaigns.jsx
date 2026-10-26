import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Mail, Plus, Send, Edit3, Trash2, Search, Play, Pause,
  Users, CheckCircle2, Clock, Sparkles, Wand2,
} from 'lucide-react';
import { campaignAPI } from '../api';
import QuickEmailGenerator from '../components/QuickEmailGenerator';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';

const STATUS_STYLES = {
  draft:  { badge: 'gray',   label: 'Draft' },
  active: { badge: 'green',  label: 'Active' },
  paused: { badge: 'yellow', label: 'Paused' },
  ended:  { badge: 'red',    label: 'Ended' },
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

  const iconBtn = 'inline-flex items-center justify-center w-7 h-7 rounded-md border border-[#E4E7EC] bg-white text-[#475467] hover:bg-[#F9FAFB] hover:text-[#101828] transition-colors';

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Email campaigns"
        description="Schedule blasts, auto-welcome new signups, and track what's landed."
        actions={
          <>
            <Link to="/campaigns" className="btn-ghost" style={{ textDecoration: 'none' }}>
              All campaigns
            </Link>
            <Link to="/campaigns/new?type=email" className="btn-outline" style={{ textDecoration: 'none' }}>
              <Plus size={14} /> Manual
            </Link>
            <button onClick={() => setShowGenerator(true)} className="btn-primary">
              <Wand2 size={15} /> Generate campaign email
            </button>
          </>
        }
      />

      {showGenerator && (
        <QuickEmailGenerator
          onClose={() => setShowGenerator(false)}
          onPublished={() => { setShowGenerator(false); load(); }}
        />
      )}

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-5">
        <StatCard icon={CheckCircle2} label="Active"         value={totals.active}    color="green" />
        <StatCard icon={Send}         label="Emails sent"    value={totals.sent}      color="blue" />
        <StatCard icon={Sparkles}     label="On-signup auto" value={totals.signup}    color="amber" />
        <StatCard icon={Clock}        label="Scheduled"      value={totals.scheduled} color="purple" />
      </div>

      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-[#E4E7EC]">
          <div className="relative w-full sm:max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search name or subject…"
              className="input-field !pl-9"
            />
          </div>
          <div className="overflow-x-auto -mx-1 px-1">
            <div className="tabs">
              {['', 'active', 'draft', 'paused', 'ended'].map(s => (
                <button
                  key={s || 'all'}
                  onClick={() => setStatusFilter(s)}
                  className={`tab ${statusFilter === s ? 'active' : ''}`}
                >
                  {s ? STATUS_STYLES[s]?.label : 'All'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-10" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <div className="w-10 h-10 rounded-full bg-[#F2F4F7] flex items-center justify-center mx-auto mb-3">
              <Mail size={18} className="text-[#98A2B3]" />
            </div>
            <h3 className="text-[14px] font-semibold text-[#101828]">No email campaigns yet</h3>
            <p className="text-[13px] text-[#475467] mt-1 mb-4">
              Send a welcome, a monthly digest, or a one-time announcement.
            </p>
            <Link to="/campaigns/new?type=email" className="btn-outline" style={{ textDecoration: 'none' }}>
              <Plus size={14} /> Create email campaign
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Subject</th>
                  <th>Audience</th>
                  <th className="text-right">Sent</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const st = STATUS_STYLES[c.status] || STATUS_STYLES.draft;
                  return (
                    <tr key={c._id}>
                      <td className="min-w-[200px]">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-md bg-[#F2F4F7] text-[#475467] flex items-center justify-center flex-shrink-0">
                            <Mail size={14} />
                          </span>
                          <div className="min-w-0">
                            <div className="cell-strong truncate">{c.name}</div>
                            {c.email?.sendOnUserSignup && (
                              <div className="inline-flex items-center gap-1 text-[11px] text-[#067647] mt-0.5">
                                <Sparkles size={10} /> Auto on signup
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="max-w-[280px] text-[#101828]">
                          {c.email?.subject || <span className="text-[#98A2B3] italic">No subject</span>}
                        </div>
                        {c.email?.preheader && (
                          <div className="text-[12px] mt-0.5 max-w-[280px] truncate text-[#98A2B3]">{c.email.preheader}</div>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-gray inline-flex items-center gap-1">
                          <Users size={11} /> {SEGMENT_LABEL[c.audience?.segment] || 'All'}
                        </span>
                      </td>
                      <td className="text-right tabular-nums cell-strong">{(c.metrics?.emailsSent || 0).toLocaleString()}</td>
                      <td><span className={`badge badge-${st.badge}`}>{st.label}</span></td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button title="Send blast now" onClick={() => blast(c._id)} className={`${iconBtn} hover:!text-[#175CD3]`}>
                            <Send size={13} />
                          </button>
                          {c.status === 'active' ? (
                            <button title="Pause" onClick={() => setStatus(c._id, 'paused')} className={`${iconBtn} hover:!text-[#B54708]`}>
                              <Pause size={13} />
                            </button>
                          ) : (
                            <button title="Activate" onClick={() => setStatus(c._id, 'active')} className={`${iconBtn} hover:!text-[#067647]`}>
                              <Play size={13} />
                            </button>
                          )}
                          <button title="Edit" onClick={() => navigate(`/campaigns/${c._id}`)} className={iconBtn}>
                            <Edit3 size={13} />
                          </button>
                          <button title="Delete" onClick={() => remove(c._id, c.name)} className={`${iconBtn} hover:!text-[#B42318]`}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
