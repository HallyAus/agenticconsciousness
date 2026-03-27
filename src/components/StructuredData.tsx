export default function StructuredData() {
  const organization = {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'ProfessionalService'],
    '@id': 'https://agenticconsciousness.com.au/#organization',
    name: 'Agentic Consciousness',
    url: 'https://agenticconsciousness.com.au',
    logo: 'https://agenticconsciousness.com.au/og-image.png',
    image: 'https://agenticconsciousness.com.au/og-image.png',
    description:
      'AI consulting firm helping Australian businesses implement AI strategy, deploy tools like ChatGPT and Claude, and build autonomous automation pipelines.',
    foundingDate: '2026',
    founder: {
      '@type': 'Person',
      '@id': 'https://agenticconsciousness.com.au/#founder',
      name: 'Daniel',
      url: 'https://agenticconsciousness.com.au',
      jobTitle: 'Founder & AI Consultant',
      description:
        'AI consultant with 21+ years of industry experience specialising in practical AI implementation for Australian businesses.',
      worksFor: {
        '@type': 'Organization',
        name: 'Agentic Consciousness',
      },
      knowsAbout: [
        'Artificial Intelligence',
        'AI Strategy',
        'Business Automation',
        'ChatGPT',
        'Claude AI',
        'Microsoft Copilot',
        'Machine Learning',
        'AI Implementation',
      ],
      sameAs: [
        // Add Daniel's personal profiles here as they become available
        // 'https://www.linkedin.com/in/danielhall',
        // 'https://twitter.com/danielhall',
      ],
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        email: 'ai@agenticconsciousness.com.au',
        contactType: 'sales',
        availableLanguage: 'English',
        areaServed: 'AU',
      },
      {
        '@type': 'ContactPoint',
        email: 'ai@agenticconsciousness.com.au',
        contactType: 'customer support',
        availableLanguage: 'English',
        areaServed: 'AU',
      },
    ],
    areaServed: {
      '@type': 'Country',
      name: 'Australia',
    },
    knowsAbout: [
      'Artificial Intelligence Consulting',
      'AI Strategy',
      'Business Process Automation',
      'ChatGPT Implementation',
      'Claude AI Deployment',
      'Microsoft Copilot',
      'AI Readiness Assessment',
      'Machine Learning',
    ],
    sameAs: [
      // CRITICAL: Add all official profiles here for cross-platform entity linking
      // 'https://www.linkedin.com/company/agentic-consciousness',
      // 'https://www.youtube.com/@agenticconsciousness',
      // 'https://twitter.com/agenticAI',
      // 'https://github.com/agentic-consciousness',
      // 'https://www.facebook.com/agenticconsciousness',
      // 'https://www.crunchbase.com/organization/agentic-consciousness',
    ],
  };

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://agenticconsciousness.com.au/#website',
    name: 'Agentic Consciousness',
    url: 'https://agenticconsciousness.com.au',
    description:
      'AI strategy, tool implementation, and automation consulting for Australian businesses.',
    publisher: {
      '@id': 'https://agenticconsciousness.com.au/#organization',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate:
          'https://agenticconsciousness.com.au/blog?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const services = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'AI Strategy & Workshops',
      description:
        'Custom AI introduction sessions, opportunity mapping, and practical roadmaps for businesses.',
      url: 'https://agenticconsciousness.com.au/pricing',
      provider: {
        '@id': 'https://agenticconsciousness.com.au/#organization',
      },
      areaServed: { '@type': 'Country', name: 'Australia' },
      offers: {
        '@type': 'Offer',
        price: '3000',
        priceCurrency: 'AUD',
        priceSpecification: {
          '@type': 'PriceSpecification',
          price: '3000',
          priceCurrency: 'AUD',
          valueAddedTaxIncluded: false,
        },
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'AI Tool Implementation',
      description:
        'Deploy ChatGPT, Claude, Copilot, and custom AI models into your existing workflows.',
      url: 'https://agenticconsciousness.com.au/pricing',
      provider: {
        '@id': 'https://agenticconsciousness.com.au/#organization',
      },
      areaServed: { '@type': 'Country', name: 'Australia' },
      offers: {
        '@type': 'Offer',
        price: '5000',
        priceCurrency: 'AUD',
        priceSpecification: {
          '@type': 'PriceSpecification',
          price: '5000',
          priceCurrency: 'AUD',
          valueAddedTaxIncluded: false,
        },
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'AI Automation & Agents',
      description:
        'End-to-end autonomous pipelines for document processing, customer service, scheduling, and reporting.',
      url: 'https://agenticconsciousness.com.au/pricing',
      provider: {
        '@id': 'https://agenticconsciousness.com.au/#organization',
      },
      areaServed: { '@type': 'Country', name: 'Australia' },
      offers: {
        '@type': 'Offer',
        price: '10000',
        priceCurrency: 'AUD',
        priceSpecification: {
          '@type': 'PriceSpecification',
          price: '10000',
          priceCurrency: 'AUD',
          valueAddedTaxIncluded: false,
        },
      },
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      {services.map((service, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(service) }}
        />
      ))}
    </>
  );
}
