import { AgentResponse } from "../contracts/transport.js";
import { OwnerState } from "./types.js";
import { getUtcDateKey } from "../budget/tracker.js";

export interface IOwnerStateStore {
  getState(ownerId: string): Promise<OwnerState>;
  saveState(ownerId: string, state: OwnerState): Promise<void>;
  isMessageProcessed(ownerId: string, messageId: string): Promise<boolean>;
  getProcessedResponse(ownerId: string, messageId: string): Promise<AgentResponse | null>;
  recordProcessedMessage(ownerId: string, messageId: string, response: AgentResponse): Promise<void>;
  acquireLock(ownerId: string): Promise<() => Promise<void>>;
}

export class InMemoryOwnerStateStore implements IOwnerStateStore {
  private states = new Map<string, OwnerState>();
  private processed = new Map<string, AgentResponse>();
  private locks = new Map<string, Promise<void>>();

  async getState(ownerId: string): Promise<OwnerState> {
    const existing = this.states.get(ownerId);
    if (existing) {
      // Check if date changed to reset daily usage
      const today = getUtcDateKey();
      if (existing.usage.dateKey !== today) {
        existing.usage = {
          dateKey: today,
          messageCount: 0,
          modelCallCount: 0,
          fallbackCallCount: 0,
          totalNeurons: 0,
        };
      }
      return existing;
    }

    const newState: OwnerState = {
      ownerId,
      activeProjectId: null,
      conversationState: "IDLE",
      pendingConfirmation: null,
      conversationHistory: [],
      usage: {
        dateKey: getUtcDateKey(),
        messageCount: 0,
        modelCallCount: 0,
        fallbackCallCount: 0,
        totalNeurons: 0,
      },
    };
    this.states.set(ownerId, newState);
    return newState;
  }

  async saveState(ownerId: string, state: OwnerState): Promise<void> {
    this.states.set(ownerId, state);
  }

  async isMessageProcessed(ownerId: string, messageId: string): Promise<boolean> {
    return this.processed.has(`${ownerId}:${messageId}`);
  }

  async getProcessedResponse(ownerId: string, messageId: string): Promise<AgentResponse | null> {
    return this.processed.get(`${ownerId}:${messageId}`) || null;
  }

  async recordProcessedMessage(
    ownerId: string,
    messageId: string,
    response: AgentResponse
  ): Promise<void> {
    this.processed.set(`${ownerId}:${messageId}`, response);
  }

  async acquireLock(ownerId: string): Promise<() => Promise<void>> {
    let releaseLock: () => void = () => {};
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    const previousLock = this.locks.get(ownerId) || Promise.resolve();
    this.locks.set(ownerId, previousLock.then(() => lockPromise));

    await previousLock;

    return async () => {
      releaseLock();
    };
  }
}
