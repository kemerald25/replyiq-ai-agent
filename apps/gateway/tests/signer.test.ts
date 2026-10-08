import { describe, it, expect } from "vitest";
import { signBridgeRequest } from "../src/bridge/signer.js";

describe("Gateway HMAC-SHA256 Signer", () => {
  const secret = "secret-test-key-32-bytes-minimum";

  it("produces deterministic 64-character hex signature", async () => {
    const sig1 = await signBridgeRequest({
      secret,
      method: "POST",
      path: "/v1/message",
      timestamp: 1700000000000,
      body: JSON.stringify({ hello: "world" }),
    });

    const sig2 = await signBridgeRequest({
      secret,
      method: "POST",
      path: "/v1/message",
      timestamp: 1700000000000,
      body: JSON.stringify({ hello: "world" }),
    });

    expect(sig1).toHaveLength(64);
    expect(sig1).toBe(sig2);
  });

  it("signature changes when any component differs", async () => {
    const base = {
      secret,
      method: "POST",
      path: "/v1/message",
      timestamp: 1700000000000,
      body: "body1",
    };

    const sigBase = await signBridgeRequest(base);
    const sigDiffMethod = await signBridgeRequest({ ...base, method: "GET" });
    const sigDiffPath = await signBridgeRequest({ ...base, path: "/v1/assets" });
    const sigDiffTimestamp = await signBridgeRequest({ ...base, timestamp: 1700000001000 });
    const sigDiffBody = await signBridgeRequest({ ...base, body: "body2" });
    const sigDiffSecret = await signBridgeRequest({ ...base, secret: "different-secret" });

    expect(sigDiffMethod).not.toBe(sigBase);
    expect(sigDiffPath).not.toBe(sigBase);
    expect(sigDiffTimestamp).not.toBe(sigBase);
    expect(sigDiffBody).not.toBe(sigBase);
    expect(sigDiffSecret).not.toBe(sigBase);
  });
});
