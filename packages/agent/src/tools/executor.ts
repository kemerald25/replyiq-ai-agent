import {
  applyOperations,
  Operation,
  SiteDocument,
  OperationError,
} from "@replyiq/schema";
import { ModelToolCall } from "../contracts/provider.js";

export interface EditSiteExecutionSuccess {
  type: "edit_site";
  updatedDoc: SiteDocument;
  summary: string;
  operationsApplied: number;
}

export interface AskClarificationExecution {
  type: "ask_clarification";
  question: string;
  options?: string[];
}

export interface ProposePublishExecution {
  type: "propose_publish";
  summary: string;
  targetVersion: number;
}

export interface ExecutionValidationFailure {
  type: "validation_failure";
  errors: OperationError[];
  message: string;
}

export type ToolExecutionResult =
  | EditSiteExecutionSuccess
  | AskClarificationExecution
  | ProposePublishExecution
  | ExecutionValidationFailure;

export class ToolExecutor {
  /**
   * Executes a model tool call strictly within the context of the acting owner's active project.
   * Any project ID or owner ID specified by the model in the arguments is completely ignored.
   */
  execute(
    toolCall: ModelToolCall,
    currentDoc: SiteDocument,
    currentVersion: number
  ): ToolExecutionResult {
    switch (toolCall.name) {
      case "edit_site": {
        const rawOps = toolCall.arguments["operations"];
        const summary = typeof toolCall.arguments["summary"] === "string"
          ? toolCall.arguments["summary"]
          : "Updated website content";

        if (!Array.isArray(rawOps)) {
          return {
            type: "validation_failure",
            errors: [
              {
                operationIndex: -1,
                operationType: "batch",
                message: "Expected 'operations' to be an array of edit operations.",
              },
            ],
            message: "The operations argument must be an array.",
          };
        }

        if (rawOps.length === 0) {
          return {
            type: "validation_failure",
            errors: [
              {
                operationIndex: -1,
                operationType: "batch",
                message: "Operations array cannot be empty.",
              },
            ],
            message: "No operations were provided to apply. Operations array cannot be empty.",
          };
        }

        if (rawOps.length > 20) {
          return {
            type: "validation_failure",
            errors: [
              {
                operationIndex: -1,
                operationType: "batch",
                message: `Cannot apply ${rawOps.length} operations in a single edit (maximum is 20).`,
              },
            ],
            message: "Batch limit exceeded (maximum 20 operations allowed per edit).",
          };
        }

        // Apply operations through the schema engine
        const result = applyOperations(currentDoc, rawOps as Operation[]);

        if (!result.success) {
          const err = result.error;
          return {
            type: "validation_failure",
            errors: [err],
            message: `[Op ${err.operationIndex ?? "?"} (${err.operationType})] ${err.message}`,
          };
        }

        return {
          type: "edit_site",
          updatedDoc: result.document,
          summary,
          operationsApplied: rawOps.length,
        };
      }

      case "ask_clarification": {
        const question = typeof toolCall.arguments["question"] === "string"
          ? toolCall.arguments["question"]
          : "Could you please clarify what you would like to change?";
        const rawOptions = toolCall.arguments["options"];
        const options = Array.isArray(rawOptions)
          ? rawOptions.filter((o): o is string => typeof o === "string")
          : undefined;

        return {
          type: "ask_clarification",
          question,
          options,
        };
      }

      case "propose_publish": {
        const summary = typeof toolCall.arguments["summary"] === "string"
          ? toolCall.arguments["summary"]
          : "Your website is ready to be published live!";

        return {
          type: "propose_publish",
          summary,
          targetVersion: currentVersion,
        };
      }

      default: {
        return {
          type: "validation_failure",
          errors: [
            {
              operationIndex: -1,
              operationType: "tool",
              message: `Tool '${toolCall.name}' is not recognized. Use 'edit_site', 'ask_clarification', or 'propose_publish'.`,
            },
          ],
          message: `Unknown tool: ${toolCall.name}`,
        };
      }
    }
  }
}
