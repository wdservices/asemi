
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ArrowRight, CheckCircle, Users, Video, Wand2 } from 'lucide-react';

export default function HomePage() {
 
  return (
    <>
      <Header />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="container mx-auto max-w-screen-xl px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
              Unlock Your Potential with <span className="text-primary">Asemi</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Explore expert-led courses and powerful AI tools. Asemi is your partner in learning, creating, and achieving your goals.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/auth/register">Get Started for Free <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
               <Button size="lg" variant="outline" asChild>
                 <Link href="/#features">Learn More</Link>
               </Button>
            </div>
<<<<<<< HEAD
          </div>
        </section>
        
        {/* Platform Image Section */}
        <section className="py-16 -mt-16">
           <div className="container mx-auto max-w-screen-xl px-4">
             <Image
                src="https://placehold.co/1200x600.png"
                alt="Asemi Platform Interface"
                width={1200}
                height={600}
                className="rounded-lg shadow-2xl mx-auto ring-1 ring-border/10"
=======
            <div className="mt-16">
              <Image
                src="/learn.webp"
                alt="Online learning platform with AI tools"
                width={1200}
                height={350}
                className="rounded-lg shadow-xl mx-auto w-full object-cover h-[350px] aspect-[1200/350]"
>>>>>>> 6eac0ccc0308dd5cc8e1982a3a6b9ae0241f424c
                data-ai-hint="online learning platform"
                priority
              />
           </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 bg-background">
          <div className="container mx-auto max-w-screen-xl px-4">
            <h2 className="text-3xl font-bold text-center text-foreground mb-4">Why Asemi is Your Best Choice</h2>
            <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
              We provide the best tools and resources you need to succeed in your professional and personal journey.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-md border">
                 <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
                   <Video className="h-8 w-8" />
                 </div>
                 <h3 className="text-xl font-semibold text-foreground mb-2">Expert-Led Video Courses</h3>
                 <p className="text-muted-foreground text-sm">Learn from industry professionals with our high-quality, comprehensive video courses designed for all skill levels.</p>
               </div>
               <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-md border">
                 <div className="p-3 rounded-full bg-accent/10 text-accent mb-4">
                    <Wand2 className="h-8 w-8" />
                 </div>
                 <h3 className="text-xl font-semibold text-foreground mb-2">AI Tools Marketplace</h3>
                 <p className="text-muted-foreground text-sm">Enhance your workflow with powerful AI tools. Purchase, customize, and integrate them into your projects with ease.</p>
               </div>
               <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-md border">
                  <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
                     <Users className="h-8 w-8" />
                  </div>
                 <h3 className="text-xl font-semibold text-foreground mb-2">Community & Analytics</h3>
                 <p className="text-muted-foreground text-sm">Track your learning progress with intuitive dashboards and connect with a vibrant community of learners and creators.</p>
               </div>
             </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto max-w-screen-md px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Start Learning?</h2>
            <p className="text-lg mb-8">
              Join thousands of users who trust Asemi to achieve their goals. Sign up today and start your journey to success.
            </p>
            <Button size="lg" variant="secondary" asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/auth/register">Sign Up for Free</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
