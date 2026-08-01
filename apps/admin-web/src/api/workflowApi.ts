/**
 * Vote Capsule™ Admin Portal — Workflow Engine API Client
 */
import { workflowClient } from './apiClient';

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
