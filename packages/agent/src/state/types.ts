import { OwnerUsage } from "../budget/tracker.js";

export type ConversationState =
  | "IDLE"
  | "AWAITING_PUBLISH_CONFIRMATION"
  | "AWAITING_PROJECT_SELECTION";

export interface PublishConfirmation {
  type: "publish";
  projectId: string;
  versionNumber: number;
  previewUrl: string;
  expiresAt: number; // Unix epoch ms
}

export interface ProjectSelectionConfirmation {
  type: "project_selection";
  projects: Array<{ id: string; slug: string; name: string }>;
  expiresAt: number; // Unix epoch ms
}

export type PendingConfirmation =
  | PublishConfirmation
  | ProjectSelectionConfirmation;

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface OwnerState {
  ownerId: string;
  activeProjectId: string | null;
  conversationState: ConversationState;
  pendingConfirmation: PendingConfirmation | null;
  conversationHistory: ConversationTurn[];
  usage: OwnerUsage;
}
