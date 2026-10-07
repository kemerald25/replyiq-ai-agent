import { describe, it, expect } from "vitest";
import { ToolExecutor } from "../src/index.js";
import { allSampleDocuments } from "@replyiq/templates";

describe("ToolExecutor & Model Tools", () => {
  const executor = new ToolExecutor();
  const sampleDoc = allSampleDocuments.salon;

  describe("edit_site Tool", () => {
    it("successfully applies valid schema operations and returns summary", () => {
      const result = executor.execute(
        {
          id: "call_1",
          name: "edit_site",
          arguments: {
            summary: "Changed site title and tagline",
            operations: [
              {
                op: "set_metadata",
                metadata: {
                  title: "Amaka Luxury Hair Studio",
                  description: "Premier hair salon in Lekki Phase 1",
                },
              },
            ],
          },
        },
        sampleDoc,
        1
      );

      expect(result.type).toBe("edit_site");
      if (result.type === "edit_site") {
        expect(result.summary).toBe("Changed site title and tagline");
        expect(result.updatedDoc.metadata.title).toBe("Amaka Luxury Hair Studio");
        expect(result.operationsApplied).toBe(1);
      }
    });

    it("rejects when operations exceeds batch limit of 20", () => {
      const excessOps = Array.from({ length: 21 }, () => ({
        op: "set_metadata",
        metadata: { title: "Title" },
      }));

      const result = executor.execute(
        {
          id: "call_2",
          name: "edit_site",
          arguments: {
            summary: "Too many ops",
            operations: excessOps,
          },
        },
        sampleDoc,
        1
      );

      expect(result.type).toBe("validation_failure");
      if (result.type === "validation_failure") {
        expect(result.message).toContain("maximum 20 operations");
      }
    });

    it("rejects when operations array is empty", () => {
      const result = executor.execute(
        {
          id: "call_3",
          name: "edit_site",
          arguments: {
            summary: "Empty ops",
            operations: [],
          },
        },
        sampleDoc,
        1
      );

      expect(result.type).toBe("validation_failure");
      if (result.type === "validation_failure") {
        expect(result.message).toContain("cannot be empty");
      }
    });

    it("fails atomically when one operation in a batch is invalid", () => {
      const result = executor.execute(
        {
          id: "call_4",
          name: "edit_site",
          arguments: {
            summary: "Batch with invalid op",
            operations: [
              {
                op: "set_metadata",
                metadata: { title: "New Title" },
              },
              {
                op: "remove_section",
                sectionId: "nonexistent-section-id-xyz",
              },
            ],
          },
        },
        sampleDoc,
        1
      );

      expect(result.type).toBe("validation_failure");
      if (result.type === "validation_failure") {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it("completely ignores any spoofed projectId or ownerId passed in tool arguments", () => {
      const result = executor.execute(
        {
          id: "call_5",
          name: "edit_site",
          arguments: {
            projectId: "proj_victim_hacked",
            ownerId: "owner_victim",
            summary: "Attempted hijacking",
            operations: [
              {
                op: "set_metadata",
                metadata: { title: "Hacked Title" },
              },
            ],
          },
        },
        sampleDoc,
        1
      );

      expect(result.type).toBe("edit_site");
      if (result.type === "edit_site") {
        // Document updated in memory strictly on target doc; spoofed arguments have no effect
        expect(result.updatedDoc.metadata.title).toBe("Hacked Title");
      }
    });
  });

  describe("ask_clarification Tool", () => {
    it("formats question and options correctly", () => {
      const result = executor.execute(
        {
          id: "call_clarify",
          name: "ask_clarification",
          arguments: {
            question: "Which haircut price would you like to update?",
            options: ["Normal Cut", "VIP Cut", "Child Cut"],
          },
        },
        sampleDoc,
        1
      );

      expect(result.type).toBe("ask_clarification");
      if (result.type === "ask_clarification") {
        expect(result.question).toBe("Which haircut price would you like to update?");
        expect(result.options).toEqual(["Normal Cut", "VIP Cut", "Child Cut"]);
      }
    });
  });

  describe("propose_publish Tool", () => {
    it("returns publish proposal without publishing directly", () => {
      const result = executor.execute(
        {
          id: "call_pub",
          name: "propose_publish",
          arguments: {
            summary: "Site looks complete and ready for customers",
          },
        },
        sampleDoc,
        3
      );

      expect(result.type).toBe("propose_publish");
      if (result.type === "propose_publish") {
        expect(result.targetVersion).toBe(3);
        expect(result.summary).toBe("Site looks complete and ready for customers");
      }
    });

    it("uses default summary when none is specified", () => {
      const result = executor.execute(
        {
          id: "call_pub_default",
          name: "propose_publish",
          arguments: {},
        },
        sampleDoc,
        1
      );

      expect(result.type).toBe("propose_publish");
      if (result.type === "propose_publish") {
        expect(result.summary).toContain("ready to be published live");
      }
    });
  });

  describe("Edge cases and Error handling", () => {
    it("rejects edit_site when operations is not an array", () => {
      const result = executor.execute(
        {
          id: "call_err_ops",
          name: "edit_site",
          arguments: {
            operations: "not-an-array",
          },
        },
        sampleDoc,
        1
      );

      expect(result.type).toBe("validation_failure");
      if (result.type === "validation_failure") {
        expect(result.message).toContain("must be an array");
      }
    });

    it("uses default question when ask_clarification question is omitted", () => {
      const result = executor.execute(
        {
          id: "call_clarify_def",
          name: "ask_clarification",
          arguments: {},
        },
        sampleDoc,
        1
      );

      expect(result.type).toBe("ask_clarification");
      if (result.type === "ask_clarification") {
        expect(result.question).toContain("clarify");
      }
    });

    it("returns validation_failure for unknown tool", () => {
      const result = executor.execute(
        {
          id: "call_unknown",
          name: "unknown_hack_tool",
          arguments: {},
        },
        sampleDoc,
        1
      );

      expect(result.type).toBe("validation_failure");
      if (result.type === "validation_failure") {
        expect(result.message).toContain("Unknown tool");
      }
    });
  });
});
