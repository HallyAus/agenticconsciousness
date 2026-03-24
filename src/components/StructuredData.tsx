export default function StructuredData() {
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Agentic Consciousness',
    url: 'https://agenticconsciousness.com.au',
    logo: 'https://agenticconsciousness.com.au/og-image.png',
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'ai@agenticconsciousness.com.au',
      contactType: 'sales',
      availableLanguage: 'English',
    },
    founder: {
      '@type': 'Person',
      name: 'Daniel Hall',
    },
    areaServed: {
      '@type': 'Country',
      name: 'Australia',
    },
  };

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Agentic Consciousness',
    url: 'https://agenticconsciousness.com.au',
  };

  const services = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'AI Strategy & Workshops',
      description: 'Custom AI introduction sessions, opportunity mapping, and practical roadmaps for businesses.',
      provider: { '@type': 'Organization', name: 'Agentic Consciousness' },
      areaServed: { '@type': 'Country', name: 'Australia' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'AI Tool Implementation',
      description: 'Deploy ChatGPT, Claude, Copilot, and custom AI models into your existing workflows.',
      provider: { '@type': 'Organization', name: 'Agentic Consciousness' },
      areaServed: { '@type': 'Country', name: 'Australia' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'AI Automation & Agents',
      description: 'End-to-end autonomous pipelines for document processing, customer service, scheduling, and reporting.',
      provider: { '@type': 'Organization', name: 'Agentic Consciousness' },
      areaServed: { '@type': 'Country', name: 'Australia' },
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
