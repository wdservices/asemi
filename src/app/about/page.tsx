
import Image from 'next/image';
import { Users, Target, Lightbulb } from 'lucide-react';

export const metadata = {
  title: 'About Asemi | Online Courses & AI Tools',
  description: 'Learn about Asemi, our mission, and our dedication to providing high-quality online education and powerful AI tools.',
};

export default function AboutPage() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">About Asemi</h1>
        <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
          We are dedicated to empowering individuals and businesses by providing accessible, high-quality education and innovative AI tools to help them thrive in a digital world.
        </p>
      </section>

      {/* Image Section */}
      <section>
        <Image
          src="/about.webp"
          alt="Team working together"
          width={1200}
          height={500}
          className="rounded-lg shadow-xl mx-auto aspect-[1200/500]"
          data-ai-hint="team collaboration"
          priority
        />
      </section>

      {/* Mission & Vision Section */}
      <section className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Our Mission</h2>
          <p className="mt-4 text-muted-foreground">
            Our mission is to democratize education and technology. We believe that everyone deserves the opportunity to learn new skills and leverage cutting-edge tools to achieve their goals, regardless of their background or location. We strive to create a learning environment that is engaging, practical, and supportive.
          </p>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Our Vision</h2>
          <p className="mt-4 text-muted-foreground">
            We envision a future where learning is continuous, personalized, and seamlessly integrated with the tools people use every day. Asemi aims to be at the forefront of this evolution, building a comprehensive platform that not only teaches but also empowers creation and innovation through AI.
          </p>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-12">Our Core Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center p-6 bg-card rounded-lg shadow-md">
            <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Community-Focused</h3>
            <p className="text-muted-foreground text-sm">We foster a collaborative and inclusive community where learners and creators can connect and grow together.</p>
          </div>
          <div className="flex flex-col items-center p-6 bg-card rounded-lg shadow-md">
            <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
              <Lightbulb className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Innovation-Driven</h3>
            <p className="text-muted-foreground text-sm">We are constantly exploring new technologies and teaching methods to provide the most effective learning experience.</p>
          </div>
          <div className="flex flex-col items-center p-6 bg-card rounded-lg shadow-md">
            <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
              <Target className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Commitment to Quality</h3>
            <p className="text-muted-foreground text-sm">We are committed to excellence in all our courses and tools, ensuring they are accurate, relevant, and impactful.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
