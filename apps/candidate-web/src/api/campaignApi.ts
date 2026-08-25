// ============================================================
// VoteCapsule™ — Campaign API Client (Candidate Portal)
// Scoped to candidate's own campaign only
// ============================================================
import { apiClient } from './apiClient';

const BASE = '/campaign';

export const campaignApi = {
  // ── Campaigns ────────────────────────────────────────────
  list:      (params?: any)               => apiClient.get(`${BASE}/campaigns`, { params }),
  get:       (id: string)                 => apiClient.get(`${BASE}/campaigns/${id}`),
  dashboard: (id: string)                 => apiClient.get(`${BASE}/campaigns/${id}/dashboard`),

  // ── Events ───────────────────────────────────────────────
  events: {
    list:          (cid: string, params?: any)          => apiClient.get(`${BASE}/campaigns/${cid}/events`, { params }),
    calendar:      (cid: string, params: any)           => apiClient.get(`${BASE}/campaigns/${cid}/events/calendar`, { params }),
    conflicts:     (cid: string, params: any)           => apiClient.get(`${BASE}/campaigns/${cid}/events/conflicts`, { params }),
    get:           (cid: string, eid: string)           => apiClient.get(`${BASE}/campaigns/${cid}/events/${eid}`),
    create:        (cid: string, data: any)             => apiClient.post(`${BASE}/campaigns/${cid}/events`, data),
    update:        (cid: string, eid: string, d: any)   => apiClient.put(`${BASE}/campaigns/${cid}/events/${eid}`, d),
    cancel:        (cid: string, eid: string)           => apiClient.delete(`${BASE}/campaigns/${cid}/events/${eid}`),
    submitCapsule: (cid: string, eid: string, d: any)   => apiClient.post(`${BASE}/campaigns/${cid}/events/${eid}/capsule`, d),
  },

  // ── Tasks ────────────────────────────────────────────────
  tasks: {
    list:         (cid: string, params?: any)                    => apiClient.get(`${BASE}/campaigns/${cid}/tasks`, { params }),
    get:          (cid: string, tid: string)                     => apiClient.get(`${BASE}/campaigns/${cid}/tasks/${tid}`),
    create:       (cid: string, data: any)                       => apiClient.post(`${BASE}/campaigns/${cid}/tasks`, data),
    updateStatus: (cid: string, tid: string, status: string)     => apiClient.patch(`${BASE}/campaigns/${cid}/tasks/${tid}/status`, { status }),
  },

  // ── Teams ────────────────────────────────────────────────
  teams: {
    list:      (cid: string)                             => apiClient.get(`${BASE}/campaigns/${cid}/teams`),
    create:    (cid: string, data: any)                  => apiClient.post(`${BASE}/campaigns/${cid}/teams`, data),
    addMember: (cid: string, tid: string, data: any)     => apiClient.post(`${BASE}/campaigns/${cid}/teams/${tid}/members`, data),
  },

  // ── Volunteers ───────────────────────────────────────────
  volunteers: {
    list:     (cid: string, params?: any)        => apiClient.get(`${BASE}/campaigns/${cid}/volunteers`, { params }),
    register: (cid: string, data: any)           => apiClient.post(`${BASE}/campaigns/${cid}/volunteers`, data),
    update:   (cid: string, vid: string, d: any) => apiClient.patch(`${BASE}/campaigns/${cid}/volunteers/${vid}`, d),
  },

  // ── Budget ───────────────────────────────────────────────
  budget: {
    get:           (cid: string)             => apiClient.get(`${BASE}/campaigns/${cid}/budget`),
    categories:    (cid: string)             => apiClient.get(`${BASE}/campaigns/${cid}/budget/categories`),
    iebc:          (cid: string)             => apiClient.get(`${BASE}/campaigns/${cid}/budget/iebc`),
    listExpenses:  (cid: string, p?: any)    => apiClient.get(`${BASE}/campaigns/${cid}/expenses`, { params: p }),
    recordExpense: (cid: string, data: any)  => apiClient.post(`${BASE}/campaigns/${cid}/expenses`, data),
    importFile:    (cid: string, fd: FormData) => apiClient.post(`${BASE}/campaigns/${cid}/budget/import`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    allocate:      (cid: string, data: any)  => apiClient.post(`${BASE}/campaigns/${cid}/budget/allocate`, data),
    geography:     (cid: string)             => apiClient.get(`${BASE}/campaigns/${cid}/geography`),
  },

  // ── SMS ──────────────────────────────────────────────────
  sms: {
    listTemplates:   (cid: string)           => apiClient.get(`${BASE}/campaigns/${cid}/sms/templates`),
    sendBatch:       (cid: string, d: any)   => apiClient.post(`${BASE}/campaigns/${cid}/sms/send`, d),
    listBatches:     (cid: string)           => apiClient.get(`${BASE}/campaigns/${cid}/sms/batches`),
    stats:           (cid: string)           => apiClient.get(`${BASE}/campaigns/${cid}/sms/stats`),
  },

  // ── Materials Catalogue ───────────────────────────────────
  materials: {
    listCategories: ()                    => apiClient.get(`${BASE}/materials/categories`),
    listTypes:      (params?: any)        => apiClient.get(`${BASE}/materials/types`, { params }),
    getType:        (id: string)          => apiClient.get(`${BASE}/materials/types/${id}`),
    createOrder:    (cid: string, d: any) => apiClient.post(`${BASE}/campaigns/${cid}/materials/orders`, d),
    listOrders:     (cid: string, p?: any)=> apiClient.get(`${BASE}/campaigns/${cid}/materials/orders`, { params: p }),
    getOrder:       (cid: string, oid: string) => apiClient.get(`${BASE}/campaigns/${cid}/materials/orders/${oid}`),
    getInventory:   (cid: string)         => apiClient.get(`${BASE}/campaigns/${cid}/materials/inventory`),
  },

  // ── Suppliers ────────────────────────────────────────────
  suppliers: {
    list:           (params?: any)                     => apiClient.get(`${BASE}/suppliers`, { params }),
    get:            (id: string)                       => apiClient.get(`${BASE}/suppliers/${id}`),
    listProducts:   (supplierId: string, p?: any)      => apiClient.get(`${BASE}/suppliers/${supplierId}/products`, { params: p }),
    searchProducts: (params: any)                      => apiClient.get(`${BASE}/suppliers/products/search`, { params }),
    comparePrice:   (materialTypeId: string)           => apiClient.get(`${BASE}/suppliers/compare/${materialTypeId}`),
  },

  // ── Incidents ────────────────────────────────────────────
  incidents: {
    list:    (cid: string, p?: any)           => apiClient.get(`${BASE}/campaigns/${cid}/incidents`, { params: p }),
    create:  (cid: string, data: any)         => apiClient.post(`${BASE}/campaigns/${cid}/incidents`, data),
    resolve: (cid: string, id: string, d: any) => apiClient.patch(`${BASE}/campaigns/${cid}/incidents/${id}/resolve`, d),
  },
};
