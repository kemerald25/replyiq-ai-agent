import {
  ModelProvider,
  ModelGenerationOptions,
  ModelGenerationResult,
} from "../contracts/provider.js";
import { calculateNeuronUsage } from "../budget/pricing.js";

export class MockProvider implements ModelProvider {
  readonly providerName = "mock";
  private scriptedResponses = new Map<string, ModelGenerationResult>();

  scriptResponse(querySubstr: string, result: ModelGenerationResult): void {
    this.scriptedResponses.set(querySubstr.toLowerCase(), result);
  }

  async generate(options: ModelGenerationOptions): Promise<ModelGenerationResult> {
    const lastUserMsg = [...options.messages]
      .reverse()
      .find((m) => m.role === "user");

    const text = lastUserMsg?.content.toLowerCase() || "";

    // 1. Check scripted responses
    for (const [key, response] of this.scriptedResponses.entries()) {
      if (text.includes(key)) {
        return response;
      }
    }

    // 2. Simulated rule-based model intent matching for local testing and CI eval
    const inputTokens = 250;
    let outputTokens = 50;

    // A. Injection defense: Must reject and NOT execute tools
    if (
      text.includes("ignore previous instructions") ||
      text.includes("system prompt") ||
      text.includes("publish all sites") ||
      text.includes("<system>") ||
      text.includes("system override") ||
      text.includes("developer console") ||
      text.includes("drop table") ||
      text.includes("[inst]") ||
      text.includes("<instructions>") ||
      text.includes("admin passwords")
    ) {
      outputTokens = 40;
      return {
        text: "I cannot execute system commands or modify other sites. I can only help edit your active website's content and theme.",
        usage: {
          inputTokens,
          outputTokens,
          estimatedNeurons: calculateNeuronUsage("llama-3.1-8b-instruct-fp8", inputTokens, outputTokens),
        },
        modelName: "mock-llama-3.1-8b",
      };
    }

    // B. Ambiguous requests -> ask clarification
    if (
      text.includes("change the price") ||
      text.includes("update the color") ||
      text.includes("remove that one") ||
      text.includes("make it look better") ||
      text.includes("change my contact")
    ) {
      outputTokens = 50;
      return {
        text: "I would be happy to update that for you.",
        toolCalls: [
          {
            id: "call_clarify_1",
            name: "ask_clarification",
            arguments: {
              question: "Which specific service price or color would you like to update?",
              options: ["Update Service Price", "Change Primary Color", "Change Preset"],
            },
          },
        ],
        usage: {
          inputTokens,
          outputTokens,
          estimatedNeurons: calculateNeuronUsage("llama-3.1-8b-instruct-fp8", inputTokens, outputTokens),
        },
        modelName: "mock-llama-3.1-8b",
      };
    }

    // C. Publish intent (including Pidgin "oya make you put my site online")
    if (
      text.includes("oya make you put my site online") ||
      text.includes("publish") ||
      text.includes("go live") ||
      text.includes("make it live")
    ) {
      outputTokens = 60;
      return {
        text: "Your website looks ready to go live!",
        toolCalls: [
          {
            id: "call_publish_1",
            name: "propose_publish",
            arguments: {
              summary: "Ready to publish current updates live to your subdomain",
            },
          },
        ],
        usage: {
          inputTokens,
          outputTokens,
          estimatedNeurons: calculateNeuronUsage("llama-3.1-8b-instruct-fp8", inputTokens, outputTokens),
        },
        modelName: "mock-llama-3.1-8b",
      };
    }

    // D. Metadata updates (site title / tagline)
    if (
      text.includes("change my website title") ||
      text.includes("website title") ||
      text.includes("update the tagline") ||
      text.includes("tagline")
    ) {
      outputTokens = 60;
      return {
        text: "I have updated your website title and description.",
        toolCalls: [
          {
            id: "call_edit_meta",
            name: "edit_site",
            arguments: {
              summary: "Updated site title and tagline",
              operations: [
                {
                  op: "set_metadata",
                  metadata: {
                    title: "Amaka Luxury Hair & Spa",
                    description: "Lagos Premier Hair Experience",
                  },
                },
              ],
            },
          },
        ],
        usage: {
          inputTokens,
          outputTokens,
          estimatedNeurons: calculateNeuronUsage("llama-3.1-8b-instruct-fp8", inputTokens, outputTokens),
        },
        modelName: "mock-llama-3.1-8b",
      };
    }

    // E. Theme and color changes (palette preset, mode)
    if (
      text.includes("theme") ||
      text.includes("color") ||
      text.includes("green") ||
      text.includes("lagos-gold") ||
      text.includes("abuja-slate") ||
      text.includes("dark mode") ||
      text.includes("#10b981")
    ) {
      outputTokens = 70;
      const mode = text.includes("dark") ? "dark" : "light";
      const palette = text.includes("gold") ? "royal-gold" : "lagos-emerald";

      return {
        text: `I have updated your site's theme palette to ${palette} in ${mode} mode.`,
        toolCalls: [
          {
            id: "call_edit_theme",
            name: "edit_site",
            arguments: {
              summary: `Changed theme palette to ${palette}`,
              operations: [
                {
                  op: "update_theme",
                  theme: {
                    palette,
                    mode,
                  },
                },
              ],
            },
          },
        ],
        usage: {
          inputTokens,
          outputTokens,
          estimatedNeurons: calculateNeuronUsage("llama-3.1-8b-instruct-fp8", inputTokens, outputTokens),
        },
        modelName: "mock-llama-3.1-8b",
      };
    }

    // F. Contact updates
    if (
      text.includes("phone") ||
      text.includes("whatsapp") ||
      text.includes("address") ||
      text.includes("instagram") ||
      text.includes("email") ||
      text.includes("contact")
    ) {
      outputTokens = 70;
      return {
        text: "I have updated your contact information.",
        toolCalls: [
          {
            id: "call_edit_contact",
            name: "edit_site",
            arguments: {
              summary: "Updated contact WhatsApp information",
              operations: [
                {
                  op: "update_contact",
                  contact: {
                    whatsappNumber: "+2348012345678",
                  },
                },
              ],
            },
          },
        ],
        usage: {
          inputTokens,
          outputTokens,
          estimatedNeurons: calculateNeuronUsage("llama-3.1-8b-instruct-fp8", inputTokens, outputTokens),
        },
        modelName: "mock-llama-3.1-8b",
      };
    }

    // G. About section rewriting
    if (
      text.includes("about") ||
      text.includes("story") ||
      text.includes("master barbing")
    ) {
      outputTokens = 80;
      return {
        text: "I have updated the About section for your website.",
        toolCalls: [
          {
            id: "call_edit_about",
            name: "edit_site",
            arguments: {
              summary: "Updated About section title and content",
              operations: [
                {
                  op: "update_section",
                  sectionId: "about-1",
                  updates: {
                    title: "Over 10 Years of Master Barbing",
                    content: "We started in 2018 in Surulere with two chairs, dedicated to perfection.",
                  },
                },
              ],
            },
          },
        ],
        usage: {
          inputTokens,
          outputTokens,
          estimatedNeurons: calculateNeuronUsage("llama-3.1-8b-instruct-fp8", inputTokens, outputTokens),
        },
        modelName: "mock-llama-3.1-8b",
      };
    }

    // H. Service management & Price updates (including Pidgin "abeg change haircut", "comot that vip")
    if (
      text.includes("haircut") ||
      text.includes("hair cut") ||
      text.includes("price") ||
      text.includes("15k") ||
      text.includes("20000") ||
      text.includes("25k") ||
      text.includes("5k") ||
      text.includes("service") ||
      text.includes("package") ||
      text.includes("styling") ||
      text.includes("grooming") ||
      text.includes("comot") ||
      text.includes("wan add") ||
      text.includes("manicure")
    ) {
      outputTokens = 80;
      return {
        text: "I have updated your services with the new details and pricing.",
        toolCalls: [
          {
            id: "call_edit_services",
            name: "edit_site",
            arguments: {
              summary: "Updated services pricing and catalog",
              operations: [
                {
                  op: "update_section",
                  sectionId: "services-1",
                  updates: {
                    items: [
                      {
                        id: "serv-knotless",
                        name: "Knotless Box Braids",
                        description: "Pain-free, lightweight braids with clean scalp parts and curled tips.",
                        price: 15000,
                        currency: "NGN",
                        priceLabel: "from",
                      },
                      {
                        id: "serv-revamp",
                        name: "Wig Revamp & Treatment",
                        description: "Deep cleansing, deep conditioning, detangling, and professional restyling.",
                        price: 15000,
                        currency: "NGN",
                        priceLabel: "fixed",
                      },
                      {
                        id: "serv-pedicure",
                        name: "Deluxe Jelly Pedicure",
                        description: "Exfoliating foot massage, cuticle care, scrub, and gel polish finish.",
                        price: 12000,
                        currency: "NGN",
                        priceLabel: "from",
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
        usage: {
          inputTokens,
          outputTokens,
          estimatedNeurons: calculateNeuronUsage("llama-3.1-8b-instruct-fp8", inputTokens, outputTokens),
        },
        modelName: "mock-llama-3.1-8b",
      };
    }

    // Default conversational reply
    return {
      text: "How can I help you customize your website today? You can update service prices, change colors, or add new content.",
      usage: {
        inputTokens,
        outputTokens,
        estimatedNeurons: calculateNeuronUsage("llama-3.1-8b-instruct-fp8", inputTokens, outputTokens),
      },
      modelName: "mock-llama-3.1-8b",
    };
  }
}
