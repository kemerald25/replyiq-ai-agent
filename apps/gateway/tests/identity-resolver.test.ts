import { describe, it, expect } from "vitest";
import { resolveIdentity } from "../src/pipeline/identity-resolver.js";
import { FakeMessagingTransport } from "../src/transport/fake-transport.js";

describe("Identity Resolver", () => {
  it("resolves Nigerian phone numbers to normalized E.164 format", async () => {
    const res1 = await resolveIdentity("08031234567@c.us");
    expect(res1.ownerKey).toBe("+2348031234567");
    expect(res1.phoneDefault).toBe("+2348031234567");
    expect(res1.isLid).toBe(false);

    const res2 = await resolveIdentity("+2348012345678");
    expect(res2.ownerKey).toBe("+2348012345678");
    expect(res2.phoneDefault).toBe("+2348012345678");
    expect(res2.isLid).toBe(false);
  });

  it("resolves WhatsApp LID users to lid:<id> without rejecting", async () => {
    const transport = new FakeMessagingTransport();
    // Unresolved LID
    const resUnresolved = await resolveIdentity("123456789012345@lid", transport);
    expect(resUnresolved.ownerKey).toBe("lid:123456789012345");
    expect(resUnresolved.phoneDefault).toBeNull();
    expect(resUnresolved.isLid).toBe(true);

    // Resolved LID via transport contact lookup
    transport.setPhoneMapping("987654321098765@lid", "+2348099887766");
    const resResolved = await resolveIdentity("987654321098765@lid", transport);
    expect(resResolved.ownerKey).toBe("lid:987654321098765");
    expect(resResolved.phoneDefault).toBe("+2348099887766");
    expect(resResolved.isLid).toBe(true);
  });

  it("handles lid: prefix format directly", async () => {
    const res = await resolveIdentity("lid:user_alpha_123");
    expect(res.ownerKey).toBe("lid:user_alpha_123");
    expect(res.isLid).toBe(true);
  });

  it("safely handles transport throwing error during LID phone resolution", async () => {
    const brokenTransport = new FakeMessagingTransport();
    brokenTransport.resolvePhoneNumber = async () => {
      throw new Error("WhatsApp network error");
    };

    const res = await resolveIdentity("123456789012345@lid", brokenTransport);
    expect(res.ownerKey).toBe("lid:123456789012345");
    expect(res.phoneDefault).toBeNull();
    expect(res.isLid).toBe(true);
  });

  it("resolves non-standard strings via parseOwnerKey or safe LID fallback", async () => {
    const res1 = await resolveIdentity("+14155552671");
    expect(res1.ownerKey).toBe("+14155552671");

    const res2 = await resolveIdentity("arbitrary_user_identifier!#");
    expect(res2.ownerKey).toBe("lid:arbitrary_user_identifier");
    expect(res2.isLid).toBe(true);
  });
});
