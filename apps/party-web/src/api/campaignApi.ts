// ============================================================
// VoteCapsule™ — Campaign API Client (Party Portal)
// ============================================================
import { apiClient } from './apiClient';

const BASE = '/campaign';

// ── Campaigns ─────────────────────────────────────────────────
export const campaignApi = {
  create:       (data: any)                     => apiClient.post(`${BASE}/campaigns`, data),
  list:         (params?: any)                  => apiClient.get(`${BASE}/campaigns`, { params }),
  get:          (id: string)                    => apiClient.get(`${BASE}/campaigns/${id}`),
  update:       (id: string, data: any)         => apiClient.put(`${BASE}/campaigns/${id}`, data),
  updateStatus: (id: string, status: string)    => apiClient.patch(`${BASE}/campaigns/${id}/status`, { status }),
  dashboard:    (id: string)                    => apiClient.get(`${BASE}/campaigns/${id}/dashboard`),

  // Events
  events: {
    create:         (cid: string, data: any)        => apiClient.post(`${BASE}/campaigns/${cid}/events`, data),
    list:           (cid: string, params?: any)     => apiClient.get(`${BASE}/campaigns/${cid}/events`, { params }),
    calendar:       (cid: string, params: any)      => apiClient.get(`${BASE}/campaigns/${cid}/events/calendar`, { params }),
    conflicts:      (cid: string, params: any)      => apiClient.get(`${BASE}/campaigns/${cid}/events/conflicts`, { params }),
    get:            (cid: string, eid: string)      => apiClient.get(`${BASE}/campaigns/${cid}/events/${eid}`),
    update:         (cid: string, eid: string, d: any) => apiClient.put(`${BASE}/campaigns/${cid}/events/${eid}`, d),
    cancel:         (cid: string, eid: string)      => apiClient.delete(`${BASE}/campaigns/${cid}/events/${eid}`),
    submitCapsule:  (cid: string, eid: string, d: any) => apiClient.post(`${BASE}/campaigns/${cid}/events/${eid}/capsule`, d),
  },

  // Tasks
  tasks: {
    create:       (cid: string, data: any)                      => apiClient.post(`${BASE}/campaigns/${cid}/tasks`, data),
    list:         (cid: string, params?: any)                   => apiClient.get(`${BASE}/campaigns/${cid}/tasks`, { params }),
    get:          (cid: string, tid: string)                    => apiClient.get(`${BASE}/campaigns/${cid}/tasks/${tid}`),
    update:       (cid: string, tid: string, d: any)            => apiClient.put(`${BASE}/campaigns/${cid}/tasks/${tid}`, d),
    updateStatus: (cid: string, tid: string, status: string, notes?: string) =>
                  apiClient.patch(`${BASE}/campaigns/${cid}/tasks/${tid}/status`, { status, notes }),
  },

  // Materials Catalogue
  materials: {
    listCategories: ()                   => apiClient.get(`${BASE}/materials/categories`),
    listTypes:      (params?: any)        => apiClient.get(`${BASE}/materials/types`, { params }),
    getType:        (id: string)          => apiClient.get(`${BASE}/materials/types/${id}`),
    createOrder:    (cid: string, d: any) => apiClient.post(`${BASE}/campaigns/${cid}/materials/orders`, d),
    listOrders:     (cid: string, p?: any)=> apiClient.get(`${BASE}/campaigns/${cid}/materials/orders`, { params: p }),
    getInventory:   (cid: string)         => apiClient.get(`${BASE}/campaigns/${cid}/materials/inventory`),
  },

  // Teams
  teams: {
    create:           (cid: string, data: any)                      => apiClient.post(`${BASE}/campaigns/${cid}/teams`, data),
    list:             (cid: string)                                 => apiClient.get(`${BASE}/campaigns/${cid}/teams`),
    addMember:        (cid: string, tid: string, data: any)         => apiClient.post(`${BASE}/campaigns/${cid}/teams/${tid}/members`, data),
    removeMember:     (cid: string, tid: string, uid: string)       => apiClient.delete(`${BASE}/campaigns/${cid}/teams/${tid}/members/${uid}`),
    updateMemberRole: (cid: string, tid: string, uid: string, d: any) => apiClient.patch(`${BASE}/campaigns/${cid}/teams/${tid}/members/${uid}`, d),
    listRoles:        (cid: string)                                 => apiClient.get(`${BASE}/campaigns/${cid}/roles`),
    assignRole:       (cid: string, data: any)                      => apiClient.post(`${BASE}/campaigns/${cid}/roles`, data),
  },

  // Volunteers
  volunteers: {
    register:  (cid: string, data: any)          => apiClient.post(`${BASE}/campaigns/${cid}/volunteers`, data),
    list:      (cid: string, params?: any)        => apiClient.get(`${BASE}/campaigns/${cid}/volunteers`, { params }),
    update:    (cid: string, vid: string, d: any) => apiClient.patch(`${BASE}/campaigns/${cid}/volunteers/${vid}`, d),
  },

  // Budget
  budget: {
    create:          (cid: string, data: any)       => apiClient.post(`${BASE}/campaigns/${cid}/budget`, data),
    get:             (cid: string)                  => apiClient.get(`${BASE}/campaigns/${cid}/budget`),
    categories:      (cid: string)                  => apiClient.get(`${BASE}/campaigns/${cid}/budget/categories`),
    iebc:            (cid: string)                  => apiClient.get(`${BASE}/campaigns/${cid}/budget/iebc`),
    recordExpense:   (cid: string, data: any)       => apiClient.post(`${BASE}/campaigns/${cid}/expenses`, data),
    listExpenses:    (cid: string, params?: any)    => apiClient.get(`${BASE}/campaigns/${cid}/expenses`, { params }),
    recordContrib:   (cid: string, data: any)       => apiClient.post(`${BASE}/campaigns/${cid}/contributions`, data),
    listContribs:    (cid: string)                  => apiClient.get(`${BASE}/campaigns/${cid}/contributions`),
    importFile:      (cid: string, fd: FormData)    => apiClient.post(`${BASE}/campaigns/${cid}/budget/import`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    allocate:        (cid: string, data: any)       => apiClient.post(`${BASE}/campaigns/${cid}/budget/allocate`, data),
    geography:       (cid: string)                  => apiClient.get(`${BASE}/campaigns/${cid}/geography`),
    allCandidates:   (params?: any)                 => apiClient.get(`${BASE}/budgets/candidates`, { params }),
  },

  // SMS
  sms: {
    createTemplate:  (cid: string, data: any)          => apiClient.post(`${BASE}/campaigns/${cid}/sms/templates`, data),
    listTemplates:   (cid: string)                     => apiClient.get(`${BASE}/campaigns/${cid}/sms/templates`),
    approveTemplate: (cid: string, id: string)         => apiClient.patch(`${BASE}/campaigns/${cid}/sms/templates/${id}/approve`, {}),
    sendBatch:       (cid: string, data: any)          => apiClient.post(`${BASE}/campaigns/${cid}/sms/send`, data),
    listBatches:     (cid: string)                     => apiClient.get(`${BASE}/campaigns/${cid}/sms/batches`),
    getBatch:        (cid: string, bid: string)        => apiClient.get(`${BASE}/campaigns/${cid}/sms/batches/${bid}`),
    stats:           (cid: string)                     => apiClient.get(`${BASE}/campaigns/${cid}/sms/stats`),
  },

  // Suppliers
  suppliers: {
    list:             (params?: any)                     => apiClient.get(`${BASE}/suppliers`, { params }),
    get:              (id: string)                       => apiClient.get(`${BASE}/suppliers/${id}`),
    listProducts:     (supplierId: string, p?: any)      => apiClient.get(`${BASE}/suppliers/${supplierId}/products`, { params: p }),
    getProduct:       (supplierId: string, pid: string)  => apiClient.get(`${BASE}/suppliers/${supplierId}/products/${pid}`),
    searchProducts:   (params: any)                      => apiClient.get(`${BASE}/suppliers/products/search`, { params }),
    comparePrice:     (materialTypeId: string)           => apiClient.get(`${BASE}/suppliers/compare/${materialTypeId}`),
  },

  // Incidents
  incidents: {
    create:    (cid: string, data: any)          => apiClient.post(`${BASE}/campaigns/${cid}/incidents`, data),
    list:      (cid: string, params?: any)        => apiClient.get(`${BASE}/campaigns/${cid}/incidents`, { params }),
    update:    (cid: string, id: string, d: any)  => apiClient.patch(`${BASE}/campaigns/${cid}/incidents/${id}`, d),
    escalate:  (cid: string, id: string, d: any)  => apiClient.patch(`${BASE}/campaigns/${cid}/incidents/${id}/escalate`, d),
    resolve:   (cid: string, id: string, d: any)  => apiClient.patch(`${BASE}/campaigns/${cid}/incidents/${id}/resolve`, d),
  },
};
