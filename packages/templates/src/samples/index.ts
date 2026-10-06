import { SiteDocument } from "@replyiq/schema";

/**
 * 1. Salon Business Sample
 */
export const salonSample: SiteDocument = {
  schemaVersion: 1,
  subdomain: "amaka-luxe",
  template: "portfolio",
  metadata: {
    title: "Amaka Luxe Hair & Beauty Salon",
    description: "Premium hair styling, braiding, and beauty treatments in Ikeja, Lagos.",
    language: "en",
    locale: "en-NG",
  },
  theme: {
    palette: "sunset-amber",
    font: "plus-jakarta-sans",
    mode: "light",
  },
  contact: {
    whatsappNumber: "+2348021234567",
    defaultMessage: "Hello Amaka Luxe! I would like to book a salon appointment.",
  },
  sections: [
    {
      id: "hero-1",
      type: "hero",
      heading: "Elegance in Every Braid & Style",
      subheading:
        "Lagos' premier beauty studio dedicated to celebrating natural hair and luxury glam.",
      cta: {
        label: "Book on WhatsApp",
        url: "https://wa.me/2348021234567?text=Appointment%20booking",
      },
      image: { assetId: "asset_salon_hero", alt: "Client hair styling showcase" },
    },
    {
      id: "about-1",
      type: "about",
      title: "About Amaka Luxe",
      content:
        "Founded in 2021 in Ikeja, Amaka Luxe brings top-tier hair care, protective styling, and nail artistry to modern Nigerian women. Our licensed stylists prioritize your hair health and comfort in a relaxed, air-conditioned sanctuary.",
    },
    {
      id: "services-1",
      type: "services",
      title: "Signature Salon Services",
      subtitle: "Affordable luxury packages crafted for your everyday style and special events.",
      items: [
        {
          id: "serv-knotless",
          name: "Knotless Box Braids",
          description: "Pain-free, lightweight braids with clean scalp parts and curled tips.",
          price: 25000,
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
    {
      id: "testimonials-1",
      type: "testimonials",
      title: "What Our Clients Say",
      items: [
        {
          id: "test-1",
          quote:
            "Amaka Luxe is the only salon in Lagos that has never made my scalp ache after braids! 10/10 service.",
          author: "Zainab Bello",
          roleOrLocation: "GRA Ikeja, Lagos",
        },
        {
          id: "test-2",
          quote: "Booking via WhatsApp was seamless and the salon ambiance is peaceful and lovely.",
          author: "Chioma Okonkwo",
          roleOrLocation: "Maryland, Lagos",
        },
      ],
    },
    {
      id: "contact-1",
      type: "contact",
      title: "Visit Our Studio",
      description: "Walk-ins welcome on weekdays. Weekend appointments recommended via WhatsApp.",
      whatsappNumber: "+2348021234567",
      email: "hello@amakaluxe.com",
      address: "Plot 12 Isaac John Street, GRA Ikeja, Lagos",
      socialLinks: [
        { platform: "instagram", url: "https://instagram.com/amakaluxe" },
        { platform: "tiktok", url: "https://tiktok.com/@amakaluxe" },
      ],
    },
    {
      id: "footer-1",
      type: "footer",
      copyrightText: "© 2026 Amaka Luxe Beauty Studio. All rights reserved.",
    },
  ],
};

/**
 * 2. Student Portfolio Sample
 */
export const studentSample: SiteDocument = {
  schemaVersion: 1,
  subdomain: "tunde-design",
  template: "portfolio",
  metadata: {
    title: "Tunde Adeyemi — Product Designer & CS Student",
    description:
      "Portfolio of Tunde Adeyemi, a UI/UX designer and software engineering student at UNILAG.",
    language: "en",
    locale: "en-NG",
  },
  theme: {
    palette: "ocean-indigo",
    font: "inter",
    mode: "light",
  },
  contact: {
    whatsappNumber: "+2348109876543",
    defaultMessage: "Hi Tunde, I saw your design portfolio and would like to connect!",
  },
  sections: [
    {
      id: "hero-1",
      type: "hero",
      heading: "Designing Simple Solutions for African Fintech & Edtech",
      subheading:
        "Final-year Computer Science student at UNILAG crafting user-centered mobile interfaces and accessible web apps.",
      cta: {
        label: "Say Hello on WhatsApp",
        url: "https://wa.me/2348109876543",
      },
    },
    {
      id: "about-1",
      type: "about",
      title: "About Me",
      content:
        "I'm a designer-developer passionate about low-bandwidth UX. Over the past 3 years, I've worked on hackathon projects, micro-internships, and freelance landing pages for campus startups in Akoka.",
    },
    {
      id: "gallery-1",
      type: "gallery",
      title: "Featured Case Studies",
      description: "Selected UI design and frontend prototypes created between 2024 and 2026.",
      images: [
        { assetId: "asset_project_kudi", alt: "KudiFlow — Mobile money budget tracker" },
        { assetId: "asset_project_campus", alt: "CampusCart — Peer-to-peer student marketplace" },
        {
          assetId: "asset_project_health",
          alt: "HealthPulse — WhatsApp-integrated clinic queue checker",
        },
      ],
    },
    {
      id: "contact-1",
      type: "contact",
      title: "Get in Touch",
      description: "Open for freelance projects, design reviews, and junior graduate roles.",
      whatsappNumber: "+2348109876543",
      email: "tunde.design@gmail.com",
      address: "University of Lagos, Akoka, Yaba",
      socialLinks: [
        { platform: "twitter", url: "https://twitter.com/tunde_ux" },
        { platform: "linkedin", url: "https://linkedin.com/in/tunde-adeyemi" },
      ],
    },
    {
      id: "footer-1",
      type: "footer",
      copyrightText: "Designed & coded by Tunde Adeyemi • 2026",
    },
  ],
};

/**
 * 3. Gallery-Heavy Tailor Sample
 */
export const tailorSample: SiteDocument = {
  schemaVersion: 1,
  subdomain: "kola-bespoke",
  template: "portfolio",
  metadata: {
    title: "Kolawole Bespoke — Master Tailors Lagos",
    description:
      "Traditional Agbada, Kaftan, Senator wear, and modern bespoke tailoring in Surulere.",
    language: "en",
    locale: "en-NG",
  },
  theme: {
    palette: "terracotta",
    font: "dm-sans",
    mode: "dark",
  },
  contact: {
    whatsappNumber: "+2348035551234",
    defaultMessage: "Hello Kolawole Bespoke, I want to discuss a custom tailoring order.",
  },
  sections: [
    {
      id: "hero-1",
      type: "hero",
      heading: "Impeccable African Craftsmanship for the Modern Gentleman",
      subheading:
        "Sharp tailoring, premium wool and jacquard fabrics, delivered to your doorstep in Lagos and worldwide.",
      cta: {
        label: "Order on WhatsApp",
        url: "https://wa.me/2348035551234",
      },
      image: { assetId: "asset_tailor_hero", alt: "Handcrafted Senator Suit" },
    },
    {
      id: "services-1",
      type: "services",
      title: "Custom Tailoring Collections",
      subtitle:
        "Each garment is individually patterned, cut, and stitched to your exact measurements.",
      items: [
        {
          id: "serv-agbada",
          name: "Grand 3-Piece Agbada",
          description: "Heavy Aso-Oke or Swiss Voile with intricate geometric embroidery.",
          price: 85000,
          currency: "NGN",
          priceLabel: "starting at",
        },
        {
          id: "serv-senator",
          name: "Executive Senator Suit",
          description:
            "Crisp Italian wool-blend Senator style with hidden buttons and pocket square.",
          price: 45000,
          currency: "NGN",
          priceLabel: "from",
        },
        {
          id: "serv-kaftan",
          name: "Minimalist Linen Kaftan",
          description:
            "Breathable European linen tunic and trousers for effortless smart-casual wear.",
          price: 35000,
          currency: "NGN",
          priceLabel: "from",
        },
      ],
    },
    {
      id: "gallery-1",
      type: "gallery",
      title: "Our Lookbook",
      description: "Recent custom commissions for weddings, celebrations, and executives.",
      images: [
        { assetId: "asset_lookbook_1", alt: "Royal Blue Embroidered Agbada" },
        { assetId: "asset_lookbook_2", alt: "Charcoal Grey Executive Kaftan" },
        { assetId: "asset_lookbook_3", alt: "Emerald Green Groom Attire" },
        { assetId: "asset_lookbook_4", alt: "Wine Red Velvet Senator Style" },
      ],
    },
    {
      id: "faq-1",
      type: "faq",
      title: "Orders & Measurements FAQ",
      items: [
        {
          id: "faq-measure",
          question: "How do I send my measurements if I live outside Lagos?",
          answer:
            "We send you a 2-minute video guide on WhatsApp. You can take measurements at home or with any local tailor and send them over.",
        },
        {
          id: "faq-time",
          question: "What is your standard turnaround time?",
          answer:
            "Standard orders take 7 to 10 working days. Rush orders (3 to 5 days) are available on request.",
        },
        {
          id: "faq-delivery",
          question: "Do you ship nationwide and internationally?",
          answer:
            "Yes, we ship across Nigeria via GIG Logistics and internationally via DHL Express.",
        },
      ],
    },
    {
      id: "contact-1",
      type: "contact",
      title: "Contact Kolawole Bespoke",
      description: "Send us a direct message on WhatsApp with your desired design or fabric ideas.",
      whatsappNumber: "+2348035551234",
      address: "24 Adeniran Ogunsanya Street, Surulere, Lagos",
    },
    {
      id: "footer-1",
      type: "footer",
      copyrightText: "© 2026 Kolawole Bespoke Tailors. All rights reserved.",
    },
  ],
};

/**
 * 4. Minimal Document Sample (Hero and Contact only)
 */
export const minimalSample: SiteDocument = {
  schemaVersion: 1,
  subdomain: "chidi-bakery",
  template: "portfolio",
  metadata: {
    title: "Chidi Bakery Lagos",
    description: "Artisanal sourdough and pastries freshly baked daily in Yaba, Lagos.",
    language: "en",
    locale: "en-NG",
  },
  theme: {
    palette: "lagos-emerald",
    font: "system-sans",
    mode: "light",
  },
  contact: {
    whatsappNumber: "+2348031234567",
    defaultMessage: "Hello Chidi Bakery! I would like to place an order.",
  },
  sections: [
    {
      id: "hero-1",
      type: "hero",
      heading: "Fresh Sourdough & Pastries Daily",
      subheading: "Baked at sunrise in Yaba, delivered hot across Lagos Island and Mainland.",
      cta: {
        label: "Order via WhatsApp",
        url: "https://wa.me/2348031234567?text=Bread%20order",
      },
    },
  ],
};

/**
 * 5. Maximum-Content Stress Test Document
 * Populated with 20 sections, max list items, and full boundary copy.
 */
export const stressSample: SiteDocument = {
  schemaVersion: 1,
  subdomain: "stress-max-business",
  template: "portfolio",
  metadata: {
    title: "Apex Nigerian Enterprises Unlimited Maximum Title Characters Showcase",
    description:
      "A comprehensive stress-test document exercising all boundary lengths, maximum 20 sections, full list items, and all template components under load.",
    language: "en",
    locale: "en-NG",
  },
  theme: {
    palette: "royal-gold",
    font: "roboto",
    mode: "dark",
  },
  contact: {
    whatsappNumber: "+2349012345678",
    defaultMessage:
      "This is a prefilled message that approaches the full permitted character limit to test how the encoding, link generation, and text formatting hold up under heavy load.",
  },
  sections: [
    // 1. Hero
    {
      id: "hero-main",
      type: "hero",
      heading:
        "Leading Innovation in Industrial Supply & Agro-Allied Commodities Across West Africa",
      subheading:
        "Connecting thousands of Nigerian farmers and regional manufacturers with reliable logistics, transparent pricing, and world-class trade execution.",
      cta: {
        label: "Contact Trade Desk",
        url: "https://wa.me/2349012345678",
      },
      image: { assetId: "asset_stress_hero", alt: "Industrial agro warehouse logistics" },
    },
    // 2. About
    {
      id: "about-main",
      type: "about",
      title: "About Apex Enterprises",
      content:
        "Apex Enterprises was established in 2018 to bridge the structural gap between sub-Saharan agricultural output and industrial manufacturing demands. Headquartered in Marina, Lagos, with operational hubs in Kano and Port Harcourt, we manage end-to-end supply chains encompassing grain aggregation, cold storage transport, and export compliance. Our commitment is founded on timely dispatch, zero adulteration, and fair remuneration for smallholder farming cooperatives.",
      image: { assetId: "asset_stress_about", alt: "Corporate team meeting in Lagos" },
    },
    // 3. Services with 12 items (maximum allowed!)
    {
      id: "services-main",
      type: "services",
      title: "Industrial & Commodity Services",
      subtitle:
        "Full-spectrum logistics and aggregation services tailored for commercial enterprises.",
      items: Array.from({ length: 12 }, (_, i) => ({
        id: `serv-item-${i + 1}`,
        name: `Commodity Service Package Grade ${i + 1}`,
        description: `Industrial specification processing and guaranteed temperature-controlled transit across all Nigerian maritime corridors.`,
        price: 500000 + i * 25000,
        currency: "NGN",
        priceLabel: "starting from",
        image: { assetId: `asset_serv_${i + 1}`, alt: `Service illustration ${i + 1}` },
      })),
    },
    // 4. Gallery with 12 images (maximum allowed!)
    {
      id: "gallery-main",
      type: "gallery",
      title: "Warehouse & Fleet Showcase",
      description:
        "Visual tour of our aggregation centers, fleets, and certified processing stations.",
      images: Array.from({ length: 12 }, (_, i) => ({
        assetId: `asset_gal_${i + 1}`,
        alt: `Processing facility photograph ${i + 1}`,
        caption: `Facility unit ${i + 1} located in industrial district`,
      })),
    },
    // 5. Testimonials with 8 items (maximum allowed!)
    {
      id: "testimonials-main",
      type: "testimonials",
      title: "Enterprise Client Testimonials",
      items: Array.from({ length: 8 }, (_, i) => ({
        id: `test-item-${i + 1}`,
        quote: `Apex has delivered over four thousand metric tonnes of sorted raw materials to our plant without a single shipment delay or quality dispute.`,
        author: `Chief Executive Officer ${i + 1}`,
        roleOrLocation: `Industrial Mills PLC, Ogun State`,
        avatar: { assetId: `asset_avatar_${i + 1}`, alt: `Executive portrait ${i + 1}` },
      })),
    },
    // 6. FAQ with 10 items (maximum allowed!)
    {
      id: "faq-main",
      type: "faq",
      title: "Frequently Asked Questions",
      items: Array.from({ length: 10 }, (_, i) => ({
        id: `faq-item-${i + 1}`,
        question: `What are your minimum order volumes for industrial delivery category ${i + 1}?`,
        answer: `For commercial accounts, our baseline consignment is ten metric tonnes, backed by third-party laboratory assay certificates and verified moisture readings.`,
      })),
    },
    // 7. Contact
    {
      id: "contact-main",
      type: "contact",
      title: "Contact Headquarters",
      description:
        "Connect directly with our commercial desk or visit our Marina executive offices.",
      whatsappNumber: "+2349012345678",
      email: "procurement@apexenterprises.ng",
      address: "Floor 14, Marina Towers, 22 Broad Street, Lagos Island, Lagos",
      socialLinks: [
        { platform: "linkedin", url: "https://linkedin.com/company/apex-enterprises" },
        { platform: "twitter", url: "https://twitter.com/apex_ng" },
        { platform: "facebook", url: "https://facebook.com/apexnigeria" },
      ],
    },
    // Sections 8 through 19: Additional content blocks bringing total to exactly 20 sections
    ...Array.from({ length: 12 }, (_, i) => ({
      id: `extra-about-${i + 1}`,
      type: "about" as const,
      title: `Corporate Division & Subsidiary ${i + 1}`,
      content: `Detailed documentation of regional subsidiary operations, regulatory compliance certifications, and localized community impact initiatives operating under division ${i + 1}.`,
    })),
    // 20. Footer (20th section)
    {
      id: "footer-main",
      type: "footer",
      copyrightText:
        "© 2026 Apex Enterprises West Africa Limited. Registered in the Federal Republic of Nigeria.",
      links: [
        { label: "Privacy Policy", url: "https://replyiq.cv/privacy" },
        { label: "Terms of Service", url: "https://replyiq.cv/terms" },
      ],
    },
  ],
};

export const allSampleDocuments = {
  salon: salonSample,
  student: studentSample,
  tailor: tailorSample,
  minimal: minimalSample,
  stress: stressSample,
};
