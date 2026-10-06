/**
 * High-performance, mobile-first CSS for the "portfolio" template.
 *
 * Rules:
 * 1. Self-contained: pure vanilla CSS, zero external stylesheets or JavaScript.
 * 2. Responsive: designed mobile-first (360px) and smoothly scaling to desktop.
 * 3. Accessible: visible :focus-visible outlines, skip link, prefers-reduced-motion.
 * 4. WCAG AA contrast compliant.
 */

export function getPortfolioStyles(): string {
  return `
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html {
      font-family: var(--font-family);
      line-height: 1.5;
      -webkit-text-size-adjust: 100%;
      scroll-behavior: smooth;
    }

    body {
      background-color: var(--color-background);
      color: var(--color-text);
      font-size: 1rem;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      /* Bottom padding so floating WhatsApp button never obscures footer content */
      padding-bottom: 5.5rem;
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }

    /* Accessibility: Skip Link */
    .skip-link {
      position: absolute;
      top: -100px;
      left: 1rem;
      background: var(--color-primary);
      color: #ffffff;
      padding: 0.75rem 1.25rem;
      z-index: 9999;
      font-weight: 600;
      border-radius: 4px;
      text-decoration: none;
      transition: top 0.2s ease;
    }
    .skip-link:focus {
      top: 1rem;
      outline: 3px solid var(--color-text);
      outline-offset: 2px;
    }

    /* Focus Visible Styles */
    :focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 3px;
    }

    /* Layout Containers */
    .container {
      width: 100%;
      max-width: 1120px;
      margin-left: auto;
      margin-right: auto;
      padding-left: 1rem;
      padding-right: 1rem;
    }
    .container-narrow {
      max-width: 768px;
    }

    /* Preview Ribbon */
    .preview-ribbon {
      background: #f59e0b;
      color: #000000;
      text-align: center;
      padding: 0.35rem 1rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    /* Navigation Header */
    .site-header {
      background: var(--color-surface);
      border-bottom: 1px solid rgba(128, 128, 128, 0.2);
      padding: 1rem 0;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .site-logo {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-text);
      text-decoration: none;
    }
    .site-nav {
      display: flex;
      gap: 0.75rem;
      overflow-x: auto;
      white-space: nowrap;
      padding-bottom: 0.25rem;
      -webkit-overflow-scrolling: touch;
    }
    .nav-link {
      color: var(--color-muted);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      transition: color 0.15s ease;
    }
    .nav-link:hover, .nav-link:focus-visible {
      color: var(--color-primary);
    }

    /* Section Base */
    .section {
      padding: 3rem 0;
    }
    .section-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .section-title {
      font-size: 1.875rem;
      font-weight: 700;
      color: var(--color-text);
      margin-bottom: 0.5rem;
      letter-spacing: -0.02em;
    }
    .section-subtitle {
      color: var(--color-muted);
      font-size: 1rem;
      max-width: 600px;
      margin: 0 auto;
    }

    /* Cards & Grids */
    .card {
      background: var(--color-surface);
      border: 1px solid rgba(128, 128, 128, 0.18);
      border-radius: 12px;
      padding: 1.25rem;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .grid {
      display: grid;
      gap: 1.25rem;
      grid-template-columns: 1fr;
    }
    @media (min-width: 640px) {
      .grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (min-width: 1024px) {
      .services-grid {
        grid-template-columns: repeat(3, 1fr);
      }
      .gallery-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 8px;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: opacity 0.15s ease, transform 0.15s ease;
    }
    .btn:hover {
      opacity: 0.92;
      transform: translateY(-1px);
    }
    .btn-primary {
      background-color: var(--color-primary);
      color: #ffffff;
    }

    /* Hero Section */
    .section-hero {
      padding: 4rem 0 3rem;
      background: linear-gradient(180deg, var(--color-surface) 0%, var(--color-background) 100%);
    }
    .hero-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      align-items: center;
      text-align: center;
    }
    .hero-content {
      max-width: 720px;
    }
    .hero-heading {
      font-size: 2.25rem;
      font-weight: 800;
      line-height: 1.2;
      letter-spacing: -0.03em;
      color: var(--color-text);
      margin-bottom: 1rem;
    }
    .hero-subheading {
      font-size: 1.125rem;
      color: var(--color-muted);
      margin-bottom: 1.5rem;
      line-height: 1.6;
    }
    .hero-actions {
      display: flex;
      justify-content: center;
      gap: 1rem;
    }
    .hero-media {
      width: 100%;
      max-width: 540px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    }
    .hero-img {
      width: 100%;
      height: auto;
      display: block;
      object-fit: cover;
    }
    @media (min-width: 768px) {
      .hero-heading {
        font-size: 3rem;
      }
    }

    /* About Section */
    .about-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    .about-content {
      line-height: 1.7;
    }
    .about-text p {
      margin-bottom: 1rem;
      color: var(--color-text);
      white-space: pre-line;
    }
    .about-media {
      max-width: 500px;
      border-radius: 12px;
      overflow: hidden;
    }
    .about-img {
      width: 100%;
      height: auto;
      display: block;
    }
    @media (min-width: 768px) {
      .about-container {
        flex-direction: row;
        align-items: center;
      }
      .about-content {
        flex: 1;
      }
      .about-media {
        flex: 1;
      }
    }

    /* Services Section */
    .service-card {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .service-media {
      margin: -1.25rem -1.25rem 0.75rem -1.25rem;
      overflow: hidden;
      aspect-ratio: 16/9;
    }
    .service-item-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .service-name {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 0.25rem;
    }
    .service-desc {
      color: var(--color-muted);
      font-size: 0.875rem;
      flex: 1;
      line-height: 1.5;
    }
    .service-price {
      margin-top: 0.75rem;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--color-primary);
    }

    /* Gallery Section */
    .gallery-item {
      position: relative;
      border-radius: 10px;
      overflow: hidden;
      aspect-ratio: 4/3;
      background: var(--color-surface);
      border: 1px solid rgba(128, 128, 128, 0.15);
    }
    .gallery-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.2s ease;
    }
    .gallery-item:hover .gallery-img {
      transform: scale(1.03);
    }
    .gallery-caption {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.75);
      color: #ffffff;
      padding: 0.4rem 0.75rem;
      font-size: 0.75rem;
      text-align: center;
    }

    /* Testimonials Section */
    .testimonial-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1rem;
    }
    .testimonial-quote {
      font-size: 1rem;
      font-style: italic;
      color: var(--color-text);
      line-height: 1.6;
    }
    .testimonial-footer {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: auto;
    }
    .testimonial-media {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
    }
    .testimonial-avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .testimonial-author {
      font-weight: 600;
      font-style: normal;
      color: var(--color-text);
      display: block;
      font-size: 0.875rem;
    }
    .testimonial-role {
      font-size: 0.75rem;
      color: var(--color-muted);
      display: block;
    }

    /* FAQ Section */
    .faq-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .faq-item {
      padding: 0;
      border: 1px solid rgba(128, 128, 128, 0.2);
    }
    .faq-question {
      padding: 1rem 1.25rem;
      font-weight: 600;
      color: var(--color-text);
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      user-select: none;
      list-style: none;
    }
    .faq-question::-webkit-details-marker {
      display: none;
    }
    .faq-chevron {
      font-size: 0.875rem;
      color: var(--color-muted);
      transition: transform 0.2s ease;
    }
    details[open] .faq-chevron {
      transform: rotate(180deg);
    }
    .faq-answer {
      padding: 0 1.25rem 1.25rem;
      color: var(--color-muted);
      line-height: 1.6;
      font-size: 0.9375rem;
    }

    /* Contact Section */
    .contact-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: 1fr;
      margin-bottom: 1.5rem;
    }
    .contact-method-title {
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-muted);
      margin-bottom: 0.35rem;
    }
    .contact-method-value, .contact-address {
      font-style: normal;
      font-size: 1rem;
      color: var(--color-text);
    }
    .contact-link {
      color: var(--color-primary);
      text-decoration: underline;
      font-weight: 500;
    }
    .contact-socials {
      text-align: center;
      margin-top: 1.5rem;
    }
    .contact-socials-title {
      font-size: 0.875rem;
      color: var(--color-muted);
      margin-bottom: 0.75rem;
    }
    .social-links-list {
      list-style: none;
      display: flex;
      justify-content: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .social-link {
      display: inline-block;
      padding: 0.4rem 0.85rem;
      background: var(--color-surface);
      border: 1px solid rgba(128, 128, 128, 0.2);
      border-radius: 20px;
      color: var(--color-text);
      text-decoration: none;
      font-size: 0.8125rem;
      font-weight: 500;
      text-transform: capitalize;
    }
    .social-link:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    /* Footer Section */
    .site-footer {
      background: var(--color-surface);
      border-top: 1px solid rgba(128, 128, 128, 0.2);
      padding: 2rem 0;
      margin-top: auto;
      font-size: 0.875rem;
      color: var(--color-muted);
    }
    .footer-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      align-items: center;
      text-align: center;
    }
    .footer-links {
      list-style: none;
      display: flex;
      gap: 1.25rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    .footer-link {
      color: var(--color-muted);
      text-decoration: none;
    }
    .footer-link:hover {
      color: var(--color-primary);
    }
    .footer-branding {
      margin-top: 0.5rem;
    }
    .branding-link {
      color: var(--color-muted);
      text-decoration: none;
      font-size: 0.8125rem;
    }
    .branding-link strong {
      color: var(--color-primary);
    }

    /* Floating WhatsApp Button */
    .floating-whatsapp {
      position: fixed;
      bottom: 1.25rem;
      right: 1.25rem;
      background-color: #25d366;
      color: #ffffff;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
      z-index: 990;
      text-decoration: none;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .floating-whatsapp:hover, .floating-whatsapp:focus-visible {
      transform: scale(1.08);
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
    }
    .whatsapp-icon {
      width: 32px;
      height: 32px;
      fill: currentColor;
    }

    /* Neutral Asset Placeholder */
    .asset-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--color-surface);
      color: var(--color-muted);
      border: 1px dashed rgba(128, 128, 128, 0.3);
      border-radius: 8px;
      width: 100%;
      height: 100%;
      min-height: 140px;
    }
    .placeholder-icon {
      opacity: 0.5;
    }
  `;
}
