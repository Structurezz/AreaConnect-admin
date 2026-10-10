import api from './axios';

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
};

// Estates
export const estateAPI = {
  create: (data) => api.post('/estates', data),
  getAll: () => api.get('/estates'),
  getOne: (id) => api.get(`/estates/${id}`),
  update: (id, data) => api.patch(`/estates/${id}`, data),
  getDetail: (id) => api.get(`/estates/${id}/detail`),
  getStats: () => api.get('/estates/stats'),
};

// Visitors
export const visitorAPI = {
  getAll: (params) => api.get('/visitors', { params }),
  getOne: (id) => api.get(`/visitors/${id}`),
  preRegister: (data) => api.post('/visitors', data),
  verify: (code) => api.get(`/visitors/verify/${code}`),
  checkIn: (id) => api.patch(`/visitors/${id}/checkin`),
  checkOut: (id) => api.patch(`/visitors/${id}/checkout`),
  blacklist: (id) => api.patch(`/visitors/${id}/blacklist`),
};

// Residents
export const residentAPI = {
  getAll: (params) => api.get('/residents', { params }),
  invite: (data) => api.post('/residents/invite', data),
  add: (data) => api.post('/residents', data),
  suspend: (id) => api.patch(`/residents/${id}/suspend`),
  activate: (id) => api.patch(`/residents/${id}/activate`),
  assignUnit: (id, unitId) => api.patch(`/residents/${id}/assign-unit`, { unitId }),
};

// Units
export const unitAPI = {
  getAll: (params) => api.get('/units', { params }),
  create: (data) => api.post('/units', data),
  update: (id, data) => api.patch(`/units/${id}`, data),
  delete: (id) => api.delete(`/units/${id}`),
};

// Announcements
export const announcementAPI = {
  getAll: (params) => api.get('/announcements', { params }),
  create: (formData) => api.post('/announcements', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => api.patch(`/announcements/${id}`, data),
  delete: (id) => api.delete(`/announcements/${id}`),
  markRead: (id) => api.post(`/announcements/${id}/read`),
};

// Marketplace
export const marketplaceAPI = {
  getAll: (params) => api.get('/marketplace', { params }),
  getOne: (id) => api.get(`/marketplace/${id}`),
  create: (formData) => api.post('/marketplace', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => api.patch(`/marketplace/${id}`, data),
  delete: (id) => api.delete(`/marketplace/${id}`),
};

// Messages
export const messageAPI = {
  getGroup: (params) => api.get('/messages/group', { params }),
  getDM: (userId) => api.get(`/messages/dm/${userId}`),
  getConversations: () => api.get('/messages/conversations'),
  getUnread: () => api.get('/messages/unread'),
  send: (data) => api.post('/messages', data),
};

// Users (admin)
export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
};

// Admin platform analytics
export const adminAPI = {
  getPlatformStats: () => api.get('/estates/platform-stats'),
};

// Resident Lounge default tracks (super admin). PodcastStudio reads getAll
// to pick a background track for the show mixer.
export const defaultTrackAPI = {
  getAll:  ()           => api.get('/lounge/defaults'),
  create:  (data)       => api.post('/lounge/defaults', data),
  update:  (id, data)   => api.patch(`/lounge/defaults/${id}`, data),
  delete:  (id)         => api.delete(`/lounge/defaults/${id}`),
  reseed:  ()           => api.post('/lounge/defaults/reseed'),
};

// Plans & Subscriptions (admin)
export const planAPI = {
  getAll: () => api.get('/plans'),
  create: (data) => api.post('/plans', data),
  update: (id, data) => api.put(`/plans/${id}`, data),
  delete: (id) => api.delete(`/plans/${id}`),
  getSubscriptions: () => api.get('/plans/subscriptions'),
  getSubscriptionStats: () => api.get('/plans/subscriptions/stats'),
  assign: (data) => api.post('/plans/subscriptions', data),
  updateSubscription: (id, data) => api.patch(`/plans/subscriptions/${id}`, data),
  // Comp / promo override — give an estate free access to any plan
  grantComp:  (data)     => api.post('/plans/subscriptions/comp', data),
  revokeComp: (estateId) => api.delete(`/plans/subscriptions/comp/${estateId}`),
  getUpcomingRenewals: (params) => api.get('/plans/renewals/upcoming', { params }),
  getFailedRenewals:   ()        => api.get('/plans/renewals/failed'),
};

// Landing-site visitor analytics
export const analyticsAPI = {
  getStats:  ()           => api.get('/analytics/visitors/stats'),
  getRecent: (params = {}) => api.get('/analytics/visitors/recent', { params }),
};

// Pitch deck & prospects
export const pitchAPI = {
  getProspects: (params) => api.get('/pitch/prospects', { params }),
  getStats:     ()       => api.get('/pitch/prospects/stats'),
  updateProspect: (id, data) => api.patch(`/pitch/prospects/${id}`, data),
  deleteProspect: (id)       => api.delete(`/pitch/prospects/${id}`),
  seed:         ()       => api.post('/pitch/prospects/seed'),
  sendEmails:   (data)   => api.post('/pitch/prospects/email', data),
  generate:     (data)   => api.post('/pitch/prospects/generate', data),
};

// Alerts
export const alertAPI = {
  getAll: (params) => api.get('/alerts', { params }),
  create: (data) => api.post('/alerts', data),
  acknowledge: (id) => api.patch(`/alerts/${id}/acknowledge`),
  resolve: (id) => api.patch(`/alerts/${id}/resolve`),
  broadcast: (data) => api.post('/alerts/broadcast', data),
};

// Podcast — full admin control
export const podcastAPI = {
  listShows:    (params) => api.get('/podcast/shows', { params }),
  getShow:      (id) => api.get(`/podcast/shows/${id}`),
  createShow:   (data) => api.post('/podcast/shows', data),
  updateShow:   (id, data) => api.patch(`/podcast/shows/${id}`, data),
  goLive:       (id) => api.post(`/podcast/shows/${id}/go-live`),
  endLive:      (id, data) => api.post(`/podcast/shows/${id}/end`, data),
  invite:       (id, data) => api.post(`/podcast/shows/${id}/invite`, data),
  revokeInvite: (id, inviteId) => api.post(`/podcast/shows/${id}/invites/${inviteId}/revoke`),
  getLive:      () => api.get('/podcast/live'),
  getUpcoming:  () => api.get('/podcast/upcoming'),
  listEpisodes: () => api.get('/podcast/episodes'),
};

// Admin — manager withdrawal requests
export const withdrawalAPI = {
  list:            (params) => api.get('/admin/withdrawals', { params }),
  markPaid:        (id, data) => api.post(`/admin/withdrawals/${id}/mark-paid`, data || {}),
  processPaystack: (id)       => api.post(`/admin/withdrawals/${id}/process`),
  reject:          (id, data) => api.post(`/admin/withdrawals/${id}/reject`, data || {}),
};

// Campaigns
export const campaignAPI = {
  list:      (params) => api.get('/campaigns', { params }),
  get:       (id)     => api.get(`/campaigns/${id}`),
  create:    (data)   => api.post('/campaigns', data),
  update:    (id, d)  => api.patch(`/campaigns/${id}`, d),
  setStatus: (id, s)  => api.patch(`/campaigns/${id}/status`, { status: s }),
  remove:    (id)     => api.delete(`/campaigns/${id}`),
  sendEmail: (id)     => api.post(`/campaigns/${id}/send-email`),
  generateEmail: (payload) => api.post('/campaigns/generate-email', payload),
};
