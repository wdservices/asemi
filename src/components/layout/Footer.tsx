
import Link from 'next/link';
import Logo from './Logo';

const Footer = () => {
  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto max-w-screen-xl px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Logo size="md" />
            <p className="mt-4 text-sm text-muted-foreground max-w-sm">
             Your ultimate AI-powered companion for exam preparation. Access past questions, detailed solutions, and track your progress to ace your tests.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">PrepMate</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/#features" className="text-muted-foreground hover:text-primary">Features</Link></li>
              <li><Link href="/pricing" className="text-muted-foreground hover:text-primary">Pricing</Link></li>
               <li><Link href="/about" className="text-muted-foreground hover:text-primary">About Us</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Support</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/contact" className="text-muted-foreground hover:text-primary">Contact</Link></li>
              <li><Link href="/faq" className="text-muted-foreground hover:text-primary">FAQ</Link></li>
              <li><Link href="/privacy" className="text-muted-foreground hover:text-primary">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-muted-foreground hover:text-primary">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} PrepMate. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
