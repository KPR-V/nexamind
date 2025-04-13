import { Document } from "@llamaindex/core";

export interface BaseAgent {
  id: string;
  name: string;
  description: string;
  type: string;
  role?: string;
  specialization?: string;
  capabilities?: string[];
}

export interface LlamaAgent extends BaseAgent {
  modelName: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
}

export interface AgentWorkflowStep {
  purpose: string;
  modelType: "orchestrator" | "specialized";
  requiredTools: string[];
  outputHandling: "direct" | "aggregated";
}

export interface AgentTask {
  id: string;
  type: string;
  input: any;
  status: "pending" | "processing" | "completed" | "failed";
  created: string;
  completed?: string;
  result?: any;
  error?: string;
  agentIds?: string[];
  subtasks?: AgentSubtask[];
}

export interface AgentSubtask {
  id: string;
  parentTaskId: string;
  agentId: string;
  input: string;
  output?: string;
  status: "pending" | "processing" | "completed" | "failed";
}

export interface AgentDocument {
  id: string;
  text: string;
  metadata?: Record<string, any>;
}

export interface AgentWorkflowStep {
  id: string;
  name: string;
  description?: string;
  agentId: string;
  input: string | ((prevResult: any) => string);
  requiresPreviousStep?: boolean;
}

export interface AgentWorkflow {
  id: string;
  name: string;
  description: string;
  steps: AgentWorkflowStep[];
}
