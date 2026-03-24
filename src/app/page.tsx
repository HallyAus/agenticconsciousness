import Nav from '@/components/Nav';
import Hero from '@/components/Hero';
import Services from '@/components/Services';
import Process from '@/components/Process';
import CaseStudies from '@/components/CaseStudies';
import About from '@/components/About';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';
import Divider from '@/components/Divider';
import ChatbotWrapper from '@/components/ChatbotWrapper';

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main-content">
        <Hero />
        <Divider />
        <Services />
        <Divider />
        <Process />
        <Divider />
        <CaseStudies />
        <Divider />
        <About />
        <Divider />
        <CTA />
      </main>
      <Footer />
      <ChatbotWrapper />
    </>
  );
}
