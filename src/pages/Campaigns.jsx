import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Megaphone, Plus, Play, Pause, Trash2, Mail, Eye, MousePointer2,
  Search, Send, Pencil,
} from 'lucide-react';
import { campaignAPI } from '../api';
import PageHeader from '../components/ui/PageHeader';

const STATUS_STYLES = {
  draft:  { badge: 'gray',   label: 'Draft' },
  active: { badge: 'green',  label: 'Active' },
  paused: { badge: 'yellow', label: 'Paused' },
  ended:  { badge: 'red',    label: 'Ended' },
};

const PLACEMENT_LABEL = {
  modal:            'In-App Modal',
  email:            'Email',
  login_sidebar:    'Login Sidebar',
  lounge_feed:      'Lounge Feed',
  dashboard_banner: 'Dashboard Banner',
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

  useEffect(() => { load(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const iconBtn = 'inline-flex items-center justify-center w-7 h-7 rounded-md border border-[#E4E7EC] bg-white text-[#475467] hover:bg-[#F9FAFB] hover:text-[#101828] transition-colors';

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Campaigns"
        description="Design ad content, target segments, and ship it across the apps."
        actions={
          <Link to="/campaigns/new" className="btn-primary" style={{ textDecoration: 'none' }}>
            <Plus size={15} /> New campaign
          </Link>
        }
      />

      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-[#E4E7EC]">
          <div className="relative w-full sm:max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search campaigns…"
              className="input-field !pl-9"
            />
          </div>
          <div className="overflow-x-auto -mx-1 px-1">
            <div className="tabs">
              {['', 'draft', 'active', 'paused', 'ended'].map(s => (
                <button
                  key={s}
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
              <Megaphone size={18} className="text-[#98A2B3]" />
            </div>
            <h3 className="text-[14px] font-semibold text-[#101828]">No campaigns yet</h3>
            <p className="text-[13px] text-[#475467] mt-1 mb-4">
              Launch your first ad to greet new members or promote a feature.
            </p>
            <Link to="/campaigns/new" className="btn-outline" style={{ textDecoration: 'none' }}>
              <Plus size={14} /> Create campaign
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th>Placements</th>
                  <th className="text-right">Impressions</th>
                  <th className="text-right">Clicks</th>
                  <th className="text-right">Emails sent</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const st = STATUS_STYLES[c.status] || STATUS_STYLES.draft;
                  const primary = c.content?.theme?.primaryColor || '#059669';

                  return (
                    <tr key={c._id}>
                      <td className="min-w-[240px]">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-1 w-2.5 h-2.5 rounded-sm flex-shrink-0 border border-black/5" style={{ background: primary }} />
                          <div className="min-w-0">
                            <button
                              onClick={() => navigate(`/campaigns/${c._id}`)}
                              className="cell-strong text-left hover:underline"
                            >
                              {c.name}
                            </button>
                            {c.content?.headline && (
                              <div className="text-[12px] text-[#98A2B3] truncate max-w-[320px]">
                                {c.content?.badge ? `${c.content.badge} · ` : ''}{c.content.headline}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td><span className={`badge badge-${st.badge}`}>{st.label}</span></td>
                      <td>
                        <div className="flex flex-wrap gap-1 max-w-[260px]">
                          {(c.placements || []).map(p => (
                            <span key={p} className="badge badge-gray">{PLACEMENT_LABEL[p] || p}</span>
                          ))}
                          {(!c.placements || c.placements.length === 0) && <span className="text-[#98A2B3]">—</span>}
                        </div>
                      </td>
                      <td className="text-right tabular-nums">
                        <span className="inline-flex items-center gap-1"><Eye size={12} className="text-[#98A2B3]" />{c.metrics?.impressions || 0}</span>
                      </td>
                      <td className="text-right tabular-nums">
                        <span className="inline-flex items-center gap-1"><MousePointer2 size={12} className="text-[#98A2B3]" />{c.metrics?.clicks || 0}</span>
                      </td>
                      <td className="text-right tabular-nums">
                        <span className="inline-flex items-center gap-1"><Mail size={12} className="text-[#98A2B3]" />{c.metrics?.emailsSent || 0}</span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => navigate(`/campaigns/${c._id}`)} title="Edit" className={iconBtn}>
                            <Pencil size={13} />
                          </button>
                          {c.status === 'active' ? (
                            <button onClick={() => setStatus(c._id, 'paused')} title="Pause" className={`${iconBtn} hover:!text-[#B54708]`}>
                              <Pause size={13} />
                            </button>
                          ) : (
                            <button onClick={() => setStatus(c._id, 'active')} title="Activate" className={`${iconBtn} hover:!text-[#067647]`}>
                              <Play size={13} />
                            </button>
                          )}
                          {c.placements?.includes('email') && (
                            <button onClick={() => sendBlast(c._id)} title="Send email now" className={`${iconBtn} hover:!text-[#175CD3]`}>
                              <Send size={13} />
                            </button>
                          )}
                          <button onClick={() => remove(c._id, c.name)} title="Delete" className={`${iconBtn} hover:!text-[#B42318]`}>
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
