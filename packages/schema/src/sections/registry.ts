import { z } from "zod";
import { safeTextSchema } from "../common/text-safety.js";
import { ImageAssetSchema } from "../common/asset.js";
import { SafeUrlSchema } from "../common/urls.js";
import { PhoneNumberSchema } from "../common/phone.js";

/**
 * Standard identifier for sections and section child items.
 */
export const SectionIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "ID must contain only alphanumeric characters, dashes, or underscores",
  );

// ==========================================
// 1. HERO SECTION
// ==========================================
export const HeroSectionSchema = z.object({
  id: SectionIdSchema,
  type: z.literal("hero"),
  heading: safeTextSchema({ minLength: 1, maxLength: 100, allowMultiline: false }),
  subheading: safeTextSchema({ minLength: 1, maxLength: 250, allowMultiline: true }).optional(),
  cta: z
    .object({
      label: safeTextSchema({ minLength: 1, maxLength: 40, allowMultiline: false }),
      url: SafeUrlSchema,
    })
    .optional(),
  image: ImageAssetSchema.optional(),
});
export type HeroSection = z.infer<typeof HeroSectionSchema>;

// ==========================================
// 2. ABOUT SECTION
// ==========================================
export const AboutSectionSchema = z.object({
  id: SectionIdSchema,
  type: z.literal("about"),
  title: safeTextSchema({ minLength: 1, maxLength: 100, allowMultiline: false }),
  content: safeTextSchema({ minLength: 1, maxLength: 1200, allowMultiline: true }),
  image: ImageAssetSchema.optional(),
});
export type AboutSection = z.infer<typeof AboutSectionSchema>;

// ==========================================
// 3. SERVICES SECTION
// ==========================================
export const ServiceItemSchema = z.object({
  id: SectionIdSchema,
  name: safeTextSchema({ minLength: 1, maxLength: 80, allowMultiline: false }),
  description: safeTextSchema({ minLength: 1, maxLength: 300, allowMultiline: true }).optional(),
  price: z
    .number()
    .int("Price must be an integer in naira")
    .nonnegative("Price cannot be negative")
    .optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO code")
    .default("NGN"),
  priceLabel: safeTextSchema({ minLength: 1, maxLength: 30, allowMultiline: false }).optional(),
  image: ImageAssetSchema.optional(),
});
export type ServiceItem = z.infer<typeof ServiceItemSchema>;

export const ServicesSectionSchema = z.object({
  id: SectionIdSchema,
  type: z.literal("services"),
  title: safeTextSchema({ minLength: 1, maxLength: 100, allowMultiline: false }),
  subtitle: safeTextSchema({ minLength: 1, maxLength: 250, allowMultiline: true }).optional(),
  items: z
    .array(ServiceItemSchema)
    .min(1, "Services section must have at least 1 item")
    .max(12, "Services section cannot exceed 12 items"),
});
export type ServicesSection = z.infer<typeof ServicesSectionSchema>;

// ==========================================
// 4. GALLERY SECTION
// ==========================================
export const GallerySectionSchema = z.object({
  id: SectionIdSchema,
  type: z.literal("gallery"),
  title: safeTextSchema({ minLength: 1, maxLength: 100, allowMultiline: false }),
  description: safeTextSchema({ minLength: 1, maxLength: 250, allowMultiline: true }).optional(),
  images: z
    .array(ImageAssetSchema)
    .min(1, "Gallery must contain at least 1 image")
    .max(12, "Gallery cannot exceed 12 images"),
});
export type GallerySection = z.infer<typeof GallerySectionSchema>;

// ==========================================
// 5. TESTIMONIALS SECTION
// ==========================================
export const TestimonialItemSchema = z.object({
  id: SectionIdSchema,
  quote: safeTextSchema({ minLength: 1, maxLength: 400, allowMultiline: true }),
  author: safeTextSchema({ minLength: 1, maxLength: 60, allowMultiline: false }),
  roleOrLocation: safeTextSchema({ minLength: 1, maxLength: 60, allowMultiline: false }).optional(),
  avatar: ImageAssetSchema.optional(),
});
export type TestimonialItem = z.infer<typeof TestimonialItemSchema>;

export const TestimonialsSectionSchema = z.object({
  id: SectionIdSchema,
  type: z.literal("testimonials"),
  title: safeTextSchema({ minLength: 1, maxLength: 100, allowMultiline: false }),
  items: z
    .array(TestimonialItemSchema)
    .min(1, "Testimonials must contain at least 1 item")
    .max(8, "Testimonials cannot exceed 8 items"),
});
export type TestimonialsSection = z.infer<typeof TestimonialsSectionSchema>;

// ==========================================
// 6. FAQ SECTION
// ==========================================
export const FaqItemSchema = z.object({
  id: SectionIdSchema,
  question: safeTextSchema({ minLength: 1, maxLength: 150, allowMultiline: false }),
  answer: safeTextSchema({ minLength: 1, maxLength: 600, allowMultiline: true }),
});
export type FaqItem = z.infer<typeof FaqItemSchema>;

export const FaqSectionSchema = z.object({
  id: SectionIdSchema,
  type: z.literal("faq"),
  title: safeTextSchema({ minLength: 1, maxLength: 100, allowMultiline: false }),
  items: z
    .array(FaqItemSchema)
    .min(1, "FAQ section must contain at least 1 item")
    .max(10, "FAQ section cannot exceed 10 items"),
});
export type FaqSection = z.infer<typeof FaqSectionSchema>;

// ==========================================
// 7. CONTACT SECTION
// ==========================================
export const SocialPlatformSchema = z.enum([
  "instagram",
  "twitter",
  "facebook",
  "tiktok",
  "linkedin",
  "youtube",
]);
export type SocialPlatform = z.infer<typeof SocialPlatformSchema>;

export const SocialLinkSchema = z.object({
  platform: SocialPlatformSchema,
  url: SafeUrlSchema,
});
export type SocialLink = z.infer<typeof SocialLinkSchema>;

export const ContactSectionSchema = z.object({
  id: SectionIdSchema,
  type: z.literal("contact"),
  title: safeTextSchema({ minLength: 1, maxLength: 100, allowMultiline: false }),
  description: safeTextSchema({ minLength: 1, maxLength: 250, allowMultiline: true }).optional(),
  whatsappNumber: PhoneNumberSchema.optional(),
  email: z.string().trim().email("Invalid email address").max(100).optional(),
  address: safeTextSchema({ minLength: 1, maxLength: 200, allowMultiline: true }).optional(),
  socialLinks: z.array(SocialLinkSchema).max(6, "Cannot exceed 6 social links").optional(),
});
export type ContactSection = z.infer<typeof ContactSectionSchema>;

// ==========================================
// 8. FOOTER SECTION
// ==========================================
export const FooterLinkSchema = z.object({
  label: safeTextSchema({ minLength: 1, maxLength: 40, allowMultiline: false }),
  url: SafeUrlSchema,
});
export type FooterLink = z.infer<typeof FooterLinkSchema>;

export const FooterSectionSchema = z.object({
  id: SectionIdSchema,
  type: z.literal("footer"),
  copyrightText: safeTextSchema({ minLength: 1, maxLength: 120, allowMultiline: false }).optional(),
  links: z.array(FooterLinkSchema).max(6, "Cannot exceed 6 footer links").optional(),
});
export type FooterSection = z.infer<typeof FooterSectionSchema>;

// ==========================================
// SECTION REGISTRY MAP & DISCRIMINATED UNION
// ==========================================
/**
 * Map of all section schemas by type name.
 * To add a new section type:
 * 1. Define the section schema above.
 * 2. Add it to this sectionSchemas map.
 * 3. Add it to the SectionSchema discriminatedUnion array below.
 * That's it — ONE file change!
 */
export const sectionSchemas = {
  hero: HeroSectionSchema,
  about: AboutSectionSchema,
  services: ServicesSectionSchema,
  gallery: GallerySectionSchema,
  testimonials: TestimonialsSectionSchema,
  faq: FaqSectionSchema,
  contact: ContactSectionSchema,
  footer: FooterSectionSchema,
} as const;

export type SectionType = keyof typeof sectionSchemas;

export const SectionSchema = z.discriminatedUnion("type", [
  HeroSectionSchema,
  AboutSectionSchema,
  ServicesSectionSchema,
  GallerySectionSchema,
  TestimonialsSectionSchema,
  FaqSectionSchema,
  ContactSectionSchema,
  FooterSectionSchema,
]);

export type Section = z.infer<typeof SectionSchema>;

/**
 * Validates a partial update for a specific section.
 * Enforces:
 * 1. Never changes id or type
 * 2. Partial fields conform to that section type's schema
 */
export function validateSectionUpdate(
  existingSection: Section,
  updates: Record<string, unknown>,
): { valid: true; updated: Section } | { valid: false; error: string } {
  if (typeof updates !== "object" || updates === null || Array.isArray(updates)) {
    return { valid: false, error: "Section updates must be a non-null object" };
  }

  if ("id" in updates && updates["id"] !== existingSection.id) {
    return { valid: false, error: "update_section must never change a section's id" };
  }

  if ("type" in updates && updates["type"] !== existingSection.type) {
    return { valid: false, error: "update_section must never change a section's type" };
  }

  // Schema for this section type
  const targetSchema = sectionSchemas[existingSection.type as SectionType];
  if (!targetSchema) {
    return { valid: false, error: `Unknown section type "${existingSection.type}"` };
  }

  // Merge updates onto existing section (guaranteeing id and type are preserved)
  const candidate = {
    ...existingSection,
    ...updates,
    id: existingSection.id,
    type: existingSection.type,
  };

  const parsed = targetSchema.safeParse(candidate);
  if (!parsed.success) {
    const issueMessages = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return {
      valid: false,
      error: `Invalid updates for section "${existingSection.id}": ${issueMessages}`,
    };
  }

  return { valid: true, updated: parsed.data as Section };
}
