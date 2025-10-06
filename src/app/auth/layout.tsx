'use client';

import { useEffect, useState } from 'react';

const techStack = [
  { name: 'Next.js', desc: 'React Framework', color: 'from-blue-500 to-cyan-500' },
  { name: 'TypeScript', desc: 'Type Safety', color: 'from-blue-600 to-blue-400' },
  { name: 'Tailwind CSS', desc: 'Styling', color: 'from-cyan-500 to-teal-500' },
  { name: 'Firebase', desc: 'Backend', color: 'from-orange-500 to-yellow-500' },
  { name: 'Firestore', desc: 'Database', color: 'from-yellow-500 to-orange-400' },
  { name: 'React', desc: 'UI Library', color: 'from-cyan-400 to-blue-500' },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Left Side - Tech Stack */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative z-10">
        <div className="max-w-lg space-y-8">
          <div className={`space-y-4 ${mounted ? 'animate-in fade-in slide-in-from-left-8 duration-1000' : 'opacity-0'}`}>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Welcome to Asemi
            </h1>
            <p className="text-xl text-muted-foreground">
              Your gateway to learning and growth
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground mb-6">Built with Modern Tech</h2>
            <div className="grid grid-cols-2 gap-4">
              {techStack.map((tech, index) => (
                <div
                  key={tech.name}
                  className={`group p-4 bg-card/50 backdrop-blur-sm rounded-xl border-2 border-primary/10 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    mounted ? 'animate-in fade-in slide-in-from-left-8 duration-700' : 'opacity-0'
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${tech.color} mb-3 group-hover:scale-110 transition-transform duration-300`}></div>
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{tech.name}</h3>
                  <p className="text-sm text-muted-foreground">{tech.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={`p-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl border-2 border-primary/20 ${mounted ? 'animate-in fade-in slide-in-from-left-8 duration-1000 delay-700' : 'opacity-0'}`}>
            <p className="text-sm text-muted-foreground italic">
              "Empowering learners with cutting-edge technology and expert-led courses. Join thousands of students on their journey to success."
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-12 relative z-10">
        <main className={`w-full max-w-md ${mounted ? 'animate-in fade-in slide-in-from-right-8 duration-1000' : 'opacity-0'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}