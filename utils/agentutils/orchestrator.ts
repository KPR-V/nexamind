import { Document } from "llamaindex";
import { createAgent, executeAgentTask } from "./agentFactory";

export interface AgentWorkflowStep {
  id: string;
  purpose: string;
  agentType: string;
  provider: string;
  model: string;
  tools: string[];
  input: string | Function;
  requiresPreviousResult: boolean;
}

export interface AgentWorkflow {
  id: string;
  name: string;
  description: string;
  steps: AgentWorkflowStep[];
}

export async function executeWorkflow(
  workflow: AgentWorkflow,
  initialInput: any,
  documents?: Document[]
) {
  let currentResult = initialInput;
  const results = [];

  for (const step of workflow.steps) {
    if (step.requiresPreviousResult && !currentResult) {
      continue;
    }

    let stepInput: string;
    if (typeof step.input === "function") {
      stepInput = String(step.input(currentResult));
    } else if (step.requiresPreviousResult) {
      stepInput = `${step.input}\n\nPrevious result: ${currentResult}`;
    } else {
      stepInput = String(step.input);
    }

    const agentConfig = {
      type: step.agentType,
      provider: step.provider,
      modelName: step.model,
      tools: step.tools,
      documents,
    };

    try {
      if (step.agentType === "direct-task") {
        currentResult = await executeAgentTask(
          step.purpose,
          stepInput,
          documents
        );
      } else {
        const stepAgent = await createAgent(agentConfig);
        const response = await stepAgent.run(stepInput);
        currentResult = response.data;
      }

      results.push({
        stepId: step.id,
        result: currentResult,
        success: true,
      });
    } catch (error) {
      results.push({
        stepId: step.id,
        error: error instanceof Error ? error.message : String(error),
        success: false,
      });

      break;
    }
  }

  return {
    workflowId: workflow.id,
    results,
    finalResult: currentResult,
  };
}

export function createSequentialWorkflow(
  name: string,
  description: string,
  steps: AgentWorkflowStep[]
) {
  return {
    id: `workflow-${Date.now()}`,
    name,
    description,
    steps,
  };
}
