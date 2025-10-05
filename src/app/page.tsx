
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
        <section className="py-20 md:py-32 bg-gradient-to-br from-primary/10 via-accent/5 to-background relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          <div className="container mx-auto max-w-screen-xl px-4 text-center relative z-10">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground animate-in fade-in slide-in-from-bottom-4 duration-1000">
              Unlock Your Potential with <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Asemi</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-150">
              Explore expert-led courses and powerful AI tools. Asemi is your partner in learning, creating, and achieving your goals.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
              <Button size="lg" asChild className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                <Link href="/auth/register">Get Started for Free <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
               <Button size="lg" variant="outline" asChild className="border-2 border-primary/50 hover:bg-primary/10 hover:border-primary transition-all duration-300">
                 <Link href="/#features">Learn More</Link>
               </Button>
            </div>
            <div className="mt-16 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <Image
                  src="/learn.webp"
                  alt="Online learning platform with AI tools"
                  width={1200}
                  height={500}
                  className="relative rounded-lg shadow-2xl mx-auto w-full object-cover h-[500px] aspect-[1200/500] border-2 border-primary/20"
                  style={{ height: "auto" }}
                  data-ai-hint="online learning platform"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 bg-gradient-to-b from-background to-primary/5">
          <div className="container mx-auto max-w-screen-xl px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">Why Asemi is Your Best Choice</h2>
            <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto text-lg">
              We provide the best tools and resources you need to succeed in your professional and personal journey.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               <div className="group flex flex-col items-center text-center p-8 bg-card rounded-xl shadow-lg border-2 border-transparent hover:border-primary/50 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                 <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform duration-300">
                   <Video className="h-10 w-10" />
                 </div>
                 <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">Expert-Led Video Courses</h3>
                 <p className="text-muted-foreground">Learn from industry professionals with our high-quality, comprehensive video courses designed for all skill levels.</p>
               </div>
               <div className="group flex flex-col items-center text-center p-8 bg-card rounded-xl shadow-lg border-2 border-transparent hover:border-accent/50 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                 <div className="p-4 rounded-full bg-gradient-to-br from-accent/20 to-accent/10 text-accent mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Wand2 className="h-10 w-10" />
                 </div>
                 <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-accent transition-colors">Powerful Learning Tools</h3>
                 <p className="text-muted-foreground">Enhance your learning experience with interactive tools and resources designed to accelerate your progress.</p>
               </div>
               <div className="group flex flex-col items-center text-center p-8 bg-card rounded-xl shadow-lg border-2 border-transparent hover:border-primary/50 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                  <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform duration-300">
                     <Users className="h-10 w-10" />
                  </div>
                 <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">Community & Analytics</h3>
                 <p className="text-muted-foreground">Track your learning progress with intuitive dashboards and connect with a vibrant community of learners and creators.</p>
               </div>
             </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-16 md:py-24 bg-gradient-to-r from-primary via-accent to-primary animate-gradient text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
          <div className="container mx-auto max-w-screen-md px-4 text-center relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Start Learning?</h2>
            <p className="text-lg md:text-xl mb-8 opacity-90">
              Join thousands of users who trust Asemi to achieve their goals. Sign up today and start your journey to success.
            </p>
            <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90 shadow-2xl hover:shadow-3xl transition-all duration-300 font-semibold px-8 h-12">
              <Link href="/auth/register">Sign Up for Free</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
