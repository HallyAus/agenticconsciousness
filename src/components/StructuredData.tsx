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

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is AI consulting?',
        acceptedAnswer: { '@type': 'Answer', text: 'We help businesses understand, implement, and scale AI. Strategy. Tools. Automation.' },
      },
      {
        '@type': 'Question',
        name: 'How much does AI consulting cost?',
        acceptedAnswer: { '@type': 'Answer', text: 'The intro session is free. Projects are scoped and priced after we understand your needs.' },
      },
      {
        '@type': 'Question',
        name: 'Do I need technical knowledge to use AI in my business?',
        acceptedAnswer: { '@type': 'Answer', text: "No. That's exactly who this is for. We start from zero and build up." },
      },
      {
        '@type': 'Question',
        name: 'What AI tools do you implement?',
        acceptedAnswer: { '@type': 'Answer', text: 'ChatGPT, Claude, Microsoft Copilot, custom models. Whatever fits your workflow.' },
      },
      {
        '@type': 'Question',
        name: 'How long does an AI implementation take?',
        acceptedAnswer: { '@type': 'Answer', text: 'Typically 1-4 weeks depending on complexity. We move fast.' },
      },
      {
        '@type': 'Question',
        name: 'Do you work with small businesses?',
        acceptedAnswer: { '@type': 'Answer', text: 'Yes. SMBs, enterprise, tradies, startups. If you have operations, we can help.' },
      },
    ],
  };

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />
    </>
  );
}
