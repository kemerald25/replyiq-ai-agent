export type { SafeTextOptions } from "./common/text-safety.js";
export type { ImageAsset } from "./common/asset.js";
export type { AllowedFont, PalettePreset, PaletteTokens, Theme } from "./theme/index.js";
export type {
  Section,
  SectionType,
  HeroSection,
  AboutSection,
  ServicesSection,
  ServiceItem,
  GallerySection,
  TestimonialsSection,
  TestimonialItem,
  FaqSection,
  FaqItem,
  ContactSection,
  SocialLink,
  SocialPlatform,
  FooterSection,
  FooterLink,
} from "./sections/registry.js";
export type { SiteMetadata, SiteContact, SiteDocument } from "./document.js";
export type {
  Operation,
  SetMetadataOperation,
  UpdateThemeOperation,
  UpdateContactOperation,
  AddSectionOperation,
  RemoveSectionOperation,
  UpdateSectionOperation,
  ReorderSectionsOperation,
  OperationError,
  ApplyOperationsResult,
} from "./operations/types.js";
export type { Migration, MigrationResult } from "./migrations/index.js";
