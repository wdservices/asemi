
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto max-w-screen-lg px-4 py-12">
        {children}
      </main>
      <Footer />
    </div>
  );
}
