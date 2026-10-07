import { ModelTool } from "../contracts/provider.js";
import { generateOperationsJsonSchema } from "./schema-generator.js";

export const EDIT_SITE_TOOL: ModelTool = {
  name: "edit_site",
  description:
    "Applies a batch of typed content and theme edits to the website. Max 20 operations per call. All operations are atomic (either all succeed or none apply). Always provide a clear, plain-language summary of what you modified (e.g. 'Updated haircut price to ₦15,000').",
  parameters: {
    type: "object",
    properties: {
      operations: {
        type: "array",
        description: "List of schema operations to apply to the site (max 20).",
        maxItems: 20,
        items: generateOperationsJsonSchema(),
      },
      summary: {
        type: "string",
        description: "Brief, human-friendly summary of the changes made.",
      },
    },
    required: ["operations", "summary"],
  },
};

export const ASK_CLARIFICATION_TOOL: ModelTool = {
  name: "ask_clarification",
  description:
    "Asks the user a clarifying question when their request is ambiguous, lacks critical details, or when multiple interpretations exist. You can provide optional multiple-choice options.",
  parameters: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "The question to present to the user.",
      },
      options: {
        type: "array",
        description: "Optional list of recommended choices or examples for the user to select.",
        items: { type: "string" },
      },
    },
    required: ["question"],
  },
};

export const PROPOSE_PUBLISH_TOOL: ModelTool = {
  name: "propose_publish",
  description:
    "Proposes that the user's latest website version be published live. Note: You cannot publish directly. Calling this tool presents a numbered confirmation choice to the user so they can review their changes and explicitly confirm publishing.",
  parameters: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "A summary of why the site is ready to go live or what will be published.",
      },
    },
    required: ["summary"],
  },
};

export const AGENT_TOOLS: ModelTool[] = [
  EDIT_SITE_TOOL,
  ASK_CLARIFICATION_TOOL,
  PROPOSE_PUBLISH_TOOL,
];
