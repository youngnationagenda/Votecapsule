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
  create:    (data: { candidateId?: string; electionId: string; name: string; description?: string; countyCode?: string; constituencyCode?: string; wardCode?: string; goals?: Record<string, unknown>; targetWards?: string[]; headquarters?: string; campaignStartDate?: string; campaignEndDate?: string; tenantId?: string }) =>
    apiClient.post(`${BASE}/campaigns`, data),
  dashboard: (id: string)                 => apiClient.get(`${BASE}/campaigns/${id}/dashboard`),

  // ── Elections (for campaign creation) ────────────────────
  activeElection: ()                      => apiClient.get('/election/elections/active'),
  listElections:  (params?: any)          => apiClient.get('/election/elections', { params }),

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
    list:         (cid: string)                             => apiClient.get(`${BASE}/campaigns/${cid}/teams`),
    create:       (cid: string, data: any)                  => apiClient.post(`${BASE}/campaigns/${cid}/teams`, data),
    addMember:    (cid: string, tid: string, data: any)     => apiClient.post(`${BASE}/campaigns/${cid}/teams/${tid}/members`, data),
    removeMember: (cid: string, tid: string, uid: string)   => apiClient.delete(`${BASE}/campaigns/${cid}/teams/${tid}/members/${uid}`),
  },

  // ── Campaign Roles (assign management positions) ─────────
  roles: {
    assign: (cid: string, data: { userId: string; role: string; userName?: string; userEmail?: string; wardCode?: string; constituencyCode?: string; countyCode?: string }) =>
      apiClient.post(`${BASE}/campaigns/${cid}/roles`, data),
    list:   (cid: string) => apiClient.get(`${BASE}/campaigns/${cid}/roles`),
    update: (cid: string, userId: string, data: { role: string }) =>
      apiClient.patch(`${BASE}/campaigns/${cid}/roles/${userId}`, data),
    remove: (cid: string, userId: string) =>
      apiClient.delete(`${BASE}/campaigns/${cid}/roles/${userId}`),
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
    listContribs:  (cid: string)             => apiClient.get(`${BASE}/campaigns/${cid}/contributions`),
    recordContrib: (cid: string, data: any)  => apiClient.post(`${BASE}/campaigns/${cid}/contributions`, data),
    // IEBC gazette limit from migration 164 — auto-populated by position + county
    getIEBCGazetteLimit: (position: string, countyCode: string, constituencyCode?: string) =>
      apiClient.get('/election/iebc-limits', { params: { position, countyCode, constituencyCode } }),
    // IEBC category breakdown (D1 — Priority 11)
    getIebcBreakdown: (cid: string) => apiClient.get(`${BASE}/campaigns/${cid}/budget/iebc-breakdown`),
    // Auto-turbulate: recompute IEBC limit + seed categories from position+geography
    turbulate: (cid: string) => apiClient.post(`${BASE}/campaigns/${cid}/budget/turbulate`, {}),
    // Preview IEBC limit for a position+geography (no DB write)
    previewIebcLimit: (cid: string, params: { position?: string; countyCode?: string; constituencyCode?: string; wardCode?: string; isParty?: boolean }) =>
      apiClient.get(`${BASE}/campaigns/${cid}/budget/iebc-preview`, { params }),
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
    /**
     * Fetch all supplier products with material type + category enrichment.
     * Used by the supplier catalogue page.
     */
    listAllProducts: async (categoryFilter?: string): Promise<any[]> => {
      // Step 1 — GET /suppliers → returns raw array (no .data wrapper)
      const suppliersResp = await apiClient.get(`${BASE}/suppliers`);
      const suppliers: any[] = suppliersResp.data?.data ?? suppliersResp.data ?? [];
      if (suppliers.length === 0) return [];

      // Step 2 — GET /materials/types → returns raw array with category join
      const typesParams: any = {};
      if (categoryFilter && categoryFilter !== 'all') typesParams.category = categoryFilter;
      const typesResp = await apiClient.get(`${BASE}/materials/types`, { params: typesParams });
      const types: any[] = typesResp.data?.data ?? typesResp.data ?? [];
      const typeMap = new Map(types.map((t: any) => [t.id, t]));

      // Step 3 — GET /suppliers/{id}/products → returns { data:[...], total:N }
      const results = await Promise.allSettled(
        suppliers.map(async (supplier: any) => {
          const resp = await apiClient.get(`${BASE}/suppliers/${supplier.id}/products`, {
            params: { limit: 300 },
          });
          // Response is paginated: { data:[...], total:N }
          const products: any[] = resp.data?.data ?? (Array.isArray(resp.data) ? resp.data : []);
          return products.map((p: any) => {
            const type = typeMap.get(p.materialTypeId);
            // CampaignSupplierProduct entity has imageUrl (not thumbnailUrl)
            // CampaignMaterialType entity has thumbnailUrl
            const resolvedImageUrl = p.imageUrl ?? type?.thumbnailUrl ?? null;
            return {
              ...p,
              supplierName:         supplier.companyName,
              supplierContactEmail: supplier.contactEmail ?? null,
              materialTypeName:     type?.name             ?? p.supplierProductName,
              materialTypeCode:     type?.code             ?? '',
              categoryCode:         type?.category?.code   ?? '',
              categoryName:         type?.category?.name   ?? '',
              imageUrl:             resolvedImageUrl,
              thumbnailUrl:         resolvedImageUrl,
              minOrderQuantity:     type?.minOrderQuantity ?? 50,
              unit:                 type?.unit             ?? 'piece',
            };
          });
        })
      );

      const allProducts: any[] = [];
      let anySucceeded = false;
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          allProducts.push(...result.value);
          anySucceeded = true;
        }
      });

      // Propagate error only when ALL suppliers failed
      if (!anySucceeded && results.length > 0) {
        const firstError = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
        throw firstError?.reason ?? new Error('Failed to load supplier products');
      }

      return allProducts;
    },
  },

  // ── Incidents ────────────────────────────────────────────
  incidents: {
    list:    (cid: string, p?: any)           => apiClient.get(`${BASE}/campaigns/${cid}/incidents`, { params: p }),
    create:  (cid: string, data: any)         => apiClient.post(`${BASE}/campaigns/${cid}/incidents`, data),
    resolve: (cid: string, id: string, d: any) => apiClient.patch(`${BASE}/campaigns/${cid}/incidents/${id}/resolve`, d),
  },

  // ── Design Requests (Print & Brand Materials) ────────────
  designs: {
    list:     (cid: string, p?: any)        => apiClient.get(`${BASE}/campaigns/${cid}/designs`, { params: p }),
    create:   (cid: string, data: any)      => apiClient.post(`${BASE}/campaigns/${cid}/designs`, data),
    preview:  (cid: string, did: string)    => apiClient.get(`${BASE}/campaigns/${cid}/designs/${did}/preview`),
    generate: (cid: string, did: string)    => apiClient.post(`${BASE}/campaigns/${cid}/designs/${did}/generate`),
    approve:  (cid: string, did: string)    => apiClient.patch(`${BASE}/campaigns/${cid}/designs/${did}/approve`),
    reject:   (cid: string, did: string, reason: string) => apiClient.patch(`${BASE}/campaigns/${cid}/designs/${did}/reject`, { reason }),
  },

  // ── AI Image Generator (Stability AI via Amazon Bedrock) ─────
  aiImages: {
    listModels: () =>
      apiClient.get(`${BASE}/ai-images/models`),
    generate: (campaignId: string, dto: {
      prompt: string; negativePrompt?: string;
      aspectRatio?: string; outputFormat?: string;
      seed?: number; stylePreset?: string; model?: string;
    }) => apiClient.post(`${BASE}/campaigns/${campaignId}/ai-images/generate`, dto),
    list: (campaignId: string) =>
      apiClient.get(`${BASE}/campaigns/${campaignId}/ai-images`),
    save: (campaignId: string, data: any) =>
      apiClient.post(`${BASE}/campaigns/${campaignId}/ai-images`, data),
  },

  // ── Campaign Media Library ───────────────────────────────────
  media: {
    uploadUrl:   (cid: string, data: any)   => apiClient.post(`${BASE}/campaigns/${cid}/media/upload-url`, data),
    listMedia:   (cid: string, p?: any)     => apiClient.get(`${BASE}/campaigns/${cid}/media`, { params: p }),
    getUrl:      (cid: string, mid: string) => apiClient.get(`${BASE}/campaigns/${cid}/media/${mid}/url`),
    delete:      (cid: string, mid: string) => apiClient.delete(`${BASE}/campaigns/${cid}/media/${mid}`),
    update:      (cid: string, mid: string, d: any) => apiClient.patch(`${BASE}/campaigns/${cid}/media/${mid}`, d),
  },

  // ── IEBC Compliance (Election Campaign Financing Act, 2013) ──
  compliance: {
    getStatus:             (cid: string)                       => apiClient.get(`${BASE}/campaigns/${cid}/compliance`),
    getAuthorizedPersons:  (cid: string)                       => apiClient.get(`${BASE}/campaigns/${cid}/compliance/authorized-persons`),
    registerPerson:        (cid: string, data: any)            => apiClient.post(`${BASE}/campaigns/${cid}/compliance/authorized-persons`, data),
    removePerson:          (cid: string, personId: string)     => apiClient.delete(`${BASE}/campaigns/${cid}/compliance/authorized-persons/${personId}`),
    getBankAccount:        (cid: string)                       => apiClient.get(`${BASE}/campaigns/${cid}/compliance/bank-account`),
    registerBank:          (cid: string, data: any)            => apiClient.post(`${BASE}/campaigns/${cid}/compliance/bank-account`, data),
    getReports:            (cid: string)                       => apiClient.get(`${BASE}/campaigns/${cid}/compliance/reports`),
    submitReport:          (cid: string, data: any)            => apiClient.post(`${BASE}/campaigns/${cid}/compliance/reports`, data),
    getCertificate:        (cid: string)                       => apiClient.get(`${BASE}/campaigns/${cid}/compliance/certificate`),
    // ── Compliance Documents (Priority 11) ──────────────────
    getDocuments:          (cid: string)                       => apiClient.get(`${BASE}/campaigns/${cid}/compliance/documents`),
    uploadDocument:        (cid: string, fd: FormData)         => apiClient.post(`${BASE}/campaigns/${cid}/compliance/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    getDocumentUrl:        (cid: string, docCode: string)      => apiClient.get(`${BASE}/campaigns/${cid}/compliance/documents/${docCode}/url`),
    deleteDocument:        (cid: string, docCode: string)      => apiClient.delete(`${BASE}/campaigns/${cid}/compliance/documents/${docCode}`),
    reviewDocument:        (cid: string, docCode: string, data: { status: string; notes?: string }) => apiClient.patch(`${BASE}/campaigns/${cid}/compliance/documents/${docCode}/review`, data),
    listPendingDocuments:  (cid: string, params?: { status?: string; page?: number; limit?: number }) => apiClient.get(`${BASE}/campaigns/${cid}/compliance/documents/pending`, { params }),
  },
};
