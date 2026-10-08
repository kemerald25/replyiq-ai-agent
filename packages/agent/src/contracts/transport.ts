export interface MediaReference {
  url: string;
  mimeType: string;
  caption?: string;
}

export interface IncomingMessage {
  ownerKey?: string;
  ownerPhone?: string;
  messageId: string;
  text: string;
  mediaReferences?: MediaReference[];
  channel?: string;
  timestamp?: number;
}

export interface MenuItem {
  number: number;
  label: string;
  action?: string;
  payload?: Record<string, unknown>;
}

export interface StructuredReply {
  text: string;
  menu?: MenuItem[];
  link?: {
    url: string;
    label: string;
  };
  previewUrl?: string;
}

export interface AgentResponse {
  messageId: string;
  replies: StructuredReply[];
  activeProjectId?: string | null;
  commandExecuted?: string;
  tokensUsed?: number;
  neuronsUsed?: number;
  modelUsed?: string;
  timestamp: number;
}
