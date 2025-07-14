
import Link from 'next/link';
import Logo from './Logo';

const Footer = () => {
  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto max-w-screen-2xl px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Logo size="sm" />
            <p className="mt-2 text-sm text-muted-foreground">
              Learn new skills with expert-led video courses.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Quick Links</h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li><Link href="/courses" className="text-muted-foreground hover:text-primary">Courses</Link></li>
              <li><Link href="/about" className="text-muted-foreground hover:text-primary">About Us</Link></li>
              <li><Link href="/contact" className="text-muted-foreground hover:text-primary">Contact</Link></li>
              <li><Link href="/faq" className="text-muted-foreground hover:text-primary">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Legal</h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li><Link href="/privacy" className="text-muted-foreground hover:text-primary">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-muted-foreground hover:text-primary">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Asemi. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
