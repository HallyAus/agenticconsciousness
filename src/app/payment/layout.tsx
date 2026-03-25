import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
      <Footer />
    </>
  );
}
