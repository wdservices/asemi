
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { CourseCard } from '@/components/courses/CourseCard';
import { AIToolCard } from '@/components/marketplace/AIToolCard'; // Import AI Tool Card
import { mockCourses, getAllAITools } from '@/lib/mockData'; // Import getAllAITools
import { ArrowRight, CheckCircle, Users, Video, Wand2 } from 'lucide-react'; // Added Wand2

export default function HomePage() {
  const featuredCourses = mockCourses.slice(0, 3);
  const featuredTools = getAllAITools().slice(0, 3); // Get featured AI tools

  return (
    <>
      <Header />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="container mx-auto max-w-screen-xl px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
              Unlock Your Potential with <span className="text-primary">Skill Stream</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Explore thousands of expert-led courses and powerful AI tools to boost your skills and workflow.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/courses">Explore Courses <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
               <Button size="lg" variant="outline" asChild>
                 <Link href="/marketplace">Discover AI Tools <Wand2 className="ml-2 h-5 w-5" /></Link>
               </Button>
            </div>
            <div className="mt-16">
              <Image
                src="https://picsum.photos/seed/learnhero/1200/600"
                alt="Online learning platform with AI tools"
                width={1200}
                height={600}
                className="rounded-lg shadow-xl mx-auto"
                data-ai-hint="online learning platform"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto max-w-screen-xl px-4">
            <h2 className="text-3xl font-bold text-center text-foreground mb-4">Why Choose Skill Stream?</h2>
            <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
              We provide the resources and AI-powered tools you need to succeed.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
               <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-md">
                 <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
                   <Users className="h-8 w-8" />
                 </div>
                 <h3 className="text-xl font-semibold text-foreground mb-2">Expert Instructors</h3>
                 <p className="text-muted-foreground text-sm">Learn from industry professionals with real-world experience.</p>
               </div>
               <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-md">
                 <div className="p-3 rounded-full bg-accent/10 text-accent mb-4">
                    <Video className="h-8 w-8" />
                 </div>
                 <h3 className="text-xl font-semibold text-foreground mb-2">Flexible Learning</h3>
                 <p className="text-muted-foreground text-sm">Access courses anytime, anywhere, and learn at your own pace.</p>
               </div>
               <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-md">
                  <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
                     <CheckCircle className="h-8 w-8" />
                  </div>
                 <h3 className="text-xl font-semibold text-foreground mb-2">Wide Range of Courses</h3>
                 <p className="text-muted-foreground text-sm">From tech to business, find courses that match your interests.</p>
               </div>
                <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-md">
                  <div className="p-3 rounded-full bg-accent/10 text-accent mb-4">
                     <Wand2 className="h-8 w-8" />
                  </div>
                 <h3 className="text-xl font-semibold text-foreground mb-2">AI Tools Marketplace</h3>
                 <p className="text-muted-foreground text-sm">Enhance your workflow with powerful, customizable AI tools.</p>
               </div>
             </div>
          </div>
        </section>

        {/* Featured Courses Section */}
        <section className="py-16 md:py-24 bg-secondary/30">
          <div className="container mx-auto max-w-screen-xl px-4">
            <h2 className="text-3xl font-bold text-center text-foreground mb-12">Featured Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
            <div className="mt-12 text-center">
              <Button variant="outline" size="lg" asChild>
                <Link href="/courses">View All Courses <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Featured AI Tools Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto max-w-screen-xl px-4">
            <h2 className="text-3xl font-bold text-center text-foreground mb-12">Featured AI Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredTools.map((tool) => (
                <AIToolCard key={tool.id} tool={tool} />
              ))}
            </div>
            <div className="mt-12 text-center">
              <Button variant="outline" size="lg" asChild>
                <Link href="/marketplace">Explore AI Marketplace <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto max-w-screen-md px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Start Learning & Building?</h2>
            <p className="text-lg mb-8">
              Join thousands of learners and innovators. Take your skills and projects to the next level.
            </p>
            <Button size="lg" variant="secondary" asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/auth/register">Sign Up Now</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
