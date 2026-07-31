/**
 * Vote Capsule™ Admin Portal — Workflow Engine API Client
 *
 * Wraps Workflow Service endpoints for the Admin Portal.
 * Workflow stats shown on Dashboard, escalations in Security page.
 */

import axios from 'axios';

const workflowClient = axios.create({
  baseURL: import.meta.env['VITE_WORKFLOW_API_URL'] ?? '/api/workflow',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

workflowClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('vc_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface WorkflowStats {
  breakdown: Array<{
    workflowType: string;
    status: string;
    count: string;
  }>;
  overdue: number;
}

export interface WorkflowExecution {
  id: string;
  workflowType: string;
  status: string;
  currentStep: string | null;
  capsuleId: string | null;
  tenantId: string | null;
  startedAt: string;
  deadlineAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
}

export interface WorkflowEscalation {
  id: string;
  executionId: string;
  escalationType: string;
  severity: string;
  message: string;
  detectedAt: string;
  resolvedAt: string | null;
}

export const workflowApi = {
  getStats: async (): Promise<WorkflowStats> => {
    const { data } = await workflowClient.get<WorkflowStats>('/stats');
    return data;
  },

  listRunning: async (workflowType?: string): Promise<WorkflowExecution[]> => {
    const { data } = await workflowClient.get<WorkflowExecution[]>('/executions/running', {
      params: workflowType ? { workflowType } : {},
    });
    return data;
  },

  getExecution: async (id: string): Promise<WorkflowExecution> => {
    const { data } = await workflowClient.get<WorkflowExecution>(`/executions/${id}`);
    return data;
  },

  getExecutionByCapsule: async (capsuleId: string): Promise<WorkflowExecution> => {
    const { data } = await workflowClient.get<WorkflowExecution>(
      `/executions/capsule/${capsuleId}`,
    );
    return data;
  },
};
