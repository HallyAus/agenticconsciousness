import type { Metadata } from 'next';
import Nav from '@/components/Nav';
import Hero from '@/components/Hero';
import LaunchOffer from '@/components/LaunchOffer';
import Services from '@/components/Services';
import Process from '@/components/Process';
import CaseStudies from '@/components/CaseStudies';
import Portfolio from '@/components/Portfolio';
import About from '@/components/About';
import AiAudit from '@/components/AiAudit';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';
import Divider from '@/components/Divider';
import ChatbotWrapper from '@/components/ChatbotWrapper';

export const metadata: Metadata = {
  alternates: { canonical: 'https://agenticconsciousness.com.au' },
};

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main-content">
        <Hero />
        <LaunchOffer />
        <Divider />
        <Services />
        <Divider />
        <Process />
        <Divider />
        <Portfolio />
        <Divider />
        <CaseStudies />
        <Divider />
        <About />
        <Divider />
        <AiAudit />
        <Divider />
        <CTA />
      </main>
      <Footer />
      <ChatbotWrapper />
    </>
  );
}
