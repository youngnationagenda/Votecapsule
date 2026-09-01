// ============================================================
// VoteCapsule™ — Campaign API Client (Party Portal)
// ============================================================
import { apiClient } from './apiClient';

const BASE = '/campaign';
const ELECTION_BASE = '/election';

// ── Campaigns ─────────────────────────────────────────────────
export const campaignApi = {
  create:          (data: any)                  => apiClient.post(`${BASE}/campaigns`, data),
  list:            (params?: any)               => apiClient.get(`${BASE}/campaigns`, { params }),
  get:             (id: string)                 => apiClient.get(`${BASE}/campaigns/${id}`),
  update:          (id: string, data: any)      => apiClient.put(`${BASE}/campaigns/${id}`, data),
  updateStatus:    (id: string, status: string) => apiClient.patch(`${BASE}/campaigns/${id}/status`, { status }),
  dashboard:       (id: string)                 => apiClient.get(`${BASE}/campaigns/${id}/dashboard`),
  // ── Elections (for campaign creation) ─────────────────────
  activeElection:  ()                           => apiClient.get(`${ELECTION_BASE}/elections/active`),
  listElections:   (params?: any)               => apiClient.get(`${ELECTION_BASE}/elections`, { params }),

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
    /**
     * Fetch all supplier products across all suppliers for the catalogue pages.
     * Gets the first supplier, then all its products (since Me Advertising is the
     * single global supplier with 275 products).
     * Returns enriched products with materialTypeCode/categoryCode joined via
     * the material types list.
     */
    listAllProducts: async (categoryFilter?: string): Promise<any[]> => {
      // 1. Get suppliers (global + tenant)
      // /suppliers returns a raw array (no .data wrapper from NestJS)
      const suppliersResp = await apiClient.get(`${BASE}/suppliers`);
      const suppliers: any[] = suppliersResp.data?.data ?? suppliersResp.data ?? [];
      if (suppliers.length === 0) return [];

      // 2. Get material types (with thumbnailUrl + category info) for enrichment
      // /materials/types also returns a raw array
      const typesParams: any = {};
      if (categoryFilter && categoryFilter !== 'all') typesParams.category = categoryFilter;
      const typesResp = await apiClient.get(`${BASE}/materials/types`, { params: typesParams });
      const types: any[] = typesResp.data?.data ?? typesResp.data ?? [];
      const typeMap = new Map(types.map((t: any) => [t.id, t]));

      // 3. Fetch products from all suppliers (parallel)
      // /suppliers/{id}/products returns { data: [...], total: N }
      const allProducts: any[] = [];
      const results = await Promise.allSettled(
        suppliers.map(async (supplier: any) => {
          const resp = await apiClient.get(`${BASE}/suppliers/${supplier.id}/products`, {
            params: { limit: 300 },
          });
          // Backend returns paginated: { data: [...], total: N }
          const products: any[] = resp.data?.data ?? (Array.isArray(resp.data) ? resp.data : []);
          return products.map((p: any) => {
            const type = typeMap.get(p.materialTypeId);
            // CampaignSupplierProduct entity has imageUrl (not thumbnailUrl)
            // CampaignMaterialType entity has thumbnailUrl
            const resolvedImageUrl = p.imageUrl ?? type?.thumbnailUrl ?? null;
            return {
              ...p,
              supplierName:          supplier.companyName,
              // CampaignSupplier entity has contactEmail, not website
              supplierContactEmail:  supplier.contactEmail ?? null,
              materialTypeName:      type?.name           ?? p.supplierProductName,
              materialTypeCode:      type?.code           ?? '',
              categoryCode:          type?.category?.code ?? '',
              categoryName:          type?.category?.name ?? '',
              imageUrl:              resolvedImageUrl,
              thumbnailUrl:          resolvedImageUrl,
            };
          });
        })
      );

      // Collect fulfilled results; throw only if ALL suppliers failed
      let anySucceeded = false;
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          allProducts.push(...result.value);
          anySucceeded = true;
        }
      });

      // If every supplier request failed, propagate the error so React Query
      // can show the error state (instead of silently returning [])
      if (!anySucceeded && results.length > 0) {
        const firstError = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
        throw firstError?.reason ?? new Error('Failed to load supplier products');
      }

      return allProducts;
    },
  },

  // AI Image Generation (Stability AI via Amazon Bedrock)
  aiImages: {
    /**
     * List all available Stability AI models and their capabilities.
     * Returns: { data: [{ id, name, capability }] }
     */
    listModels: () =>
      apiClient.get(`${BASE}/ai-images/models`),

    /**
     * Generate a campaign image from a text prompt.
     * Returns: { data: { imageUrl, s3Key, model, seed, finishReason } }
     */
    generate: (campaignId: string, dto: {
      prompt:          string;
      negativePrompt?: string;
      aspectRatio?:    '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9' | '2:3' | '3:2';
      outputFormat?:   'jpeg' | 'png' | 'webp';
      seed?:           number;
      stylePreset?:    string;
      model?:          string;
    }) => apiClient.post(`${BASE}/campaigns/${campaignId}/ai-images/generate`, dto),

    /**
     * Remove the background from an image (e.g. candidate photo).
     * Body: { imageBase64: string, outputFormat?: 'png' | 'webp' }
     * Returns: { data: { imageUrl, s3Key, ... } }
     */
    removeBackground: (campaignId: string, imageBase64: string, outputFormat?: string) =>
      apiClient.post(`${BASE}/campaigns/${campaignId}/ai-images/remove-background`, {
        imageBase64,
        outputFormat,
      }),

    /**
     * Upscale an image to higher resolution.
     * Body: { imageBase64, prompt?, outputFormat?, model?: 'creative'|'conservative'|'fast' }
     */
    upscale: (campaignId: string, dto: {
      imageBase64:  string;
      prompt?:      string;
      outputFormat?: string;
      model?:       'creative' | 'conservative' | 'fast';
    }) => apiClient.post(`${BASE}/campaigns/${campaignId}/ai-images/upscale`, dto),
  },

  // ── Campaign Media Library ───────────────────────────────────
  media: {
    uploadUrl:   (cid: string, data: any)   => apiClient.post(`${BASE}/campaigns/${cid}/media/upload-url`, data),
    listMedia:   (cid: string, p?: any)     => apiClient.get(`${BASE}/campaigns/${cid}/media`, { params: p }),
    getUrl:      (cid: string, mid: string) => apiClient.get(`${BASE}/campaigns/${cid}/media/${mid}/url`),
    delete:      (cid: string, mid: string) => apiClient.delete(`${BASE}/campaigns/${cid}/media/${mid}`),
    update:      (cid: string, mid: string, d: any) => apiClient.patch(`${BASE}/campaigns/${cid}/media/${mid}`, d),
  },

  // Incidents
  incidents: {
    create:    (cid: string, data: any)          => apiClient.post(`${BASE}/campaigns/${cid}/incidents`, data),
    list:      (cid: string, params?: any)        => apiClient.get(`${BASE}/campaigns/${cid}/incidents`, { params }),
    update:    (cid: string, id: string, d: any)  => apiClient.patch(`${BASE}/campaigns/${cid}/incidents/${id}`, d),
    escalate:  (cid: string, id: string, d: any)  => apiClient.patch(`${BASE}/campaigns/${cid}/incidents/${id}/escalate`, d),
    resolve:   (cid: string, id: string, d: any)  => apiClient.patch(`${BASE}/campaigns/${cid}/incidents/${id}/resolve`, d),
  },

  // IEBC Compliance (Election Campaign Financing Act)
  compliance: {
    getStatus:              (cid: string) => apiClient.get(`${BASE}/campaigns/${cid}/compliance`),
    getAuthorizedPersons:   (cid: string) => apiClient.get(`${BASE}/campaigns/${cid}/compliance/authorized-persons`),
    registerPerson:         (cid: string, data: any) => apiClient.post(`${BASE}/campaigns/${cid}/compliance/authorized-persons`, data),
    removePerson:           (cid: string, personId: string) => apiClient.delete(`${BASE}/campaigns/${cid}/compliance/authorized-persons/${personId}`),
    getSupportingOrgs:      (cid: string) => apiClient.get(`${BASE}/campaigns/${cid}/compliance/supporting-orgs`),
    registerSupportingOrg:  (cid: string, data: any) => apiClient.post(`${BASE}/campaigns/${cid}/compliance/supporting-orgs`, data),
    getBankAccount:         (cid: string) => apiClient.get(`${BASE}/campaigns/${cid}/compliance/bank-account`),
    registerBank:           (cid: string, data: any) => apiClient.post(`${BASE}/campaigns/${cid}/compliance/bank-account`, data),
    getReports:             (cid: string) => apiClient.get(`${BASE}/campaigns/${cid}/compliance/reports`),
    submitReport:           (cid: string, data: any) => apiClient.post(`${BASE}/campaigns/${cid}/compliance/reports`, data),
    getCandidateCompliance: (cid: string) => apiClient.get(`${BASE}/campaigns/${cid}/compliance/candidates`),
    getCertificate:         (cid: string) => apiClient.get(`${BASE}/campaigns/${cid}/compliance/certificate`),
  },
};
