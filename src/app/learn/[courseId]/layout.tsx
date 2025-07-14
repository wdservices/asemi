
"use client";
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { getCourseBySlug } from '@/lib/mockData';
import type { Course, CourseModule, Lesson } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button';
import { ChevronLeft, CheckCircle, PlayCircle, FileText, RadioButtonChecked } from 'lucide-react';
import Logo from '@/components/layout/Logo';

export default function CourseLearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const courseSlug = typeof params.courseId === 'string' ? params.courseId : '';
  
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoadingCourse, setIsLoadingCourse] = useState(true);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null); // Placeholder

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/auth/login?redirect=/learn/${courseSlug}`);
    }
  }, [user, loading, router, courseSlug]);

  useEffect(() => {
    if (courseSlug) {
      const fetchedCourse = getCourseBySlug(courseSlug);
      setCourse(fetchedCourse || null);
      setIsLoadingCourse(false);
      // Set initial lesson (e.g., first lesson of first module)
      if (fetchedCourse && fetchedCourse.modules[0]?.lessons[0]) {
        // Construct lesson slug based on module and lesson IDs or orders
        // For simplicity, let's assume the children page handles lesson selection or defaults.
        // setCurrentLessonId(fetchedCourse.modules[0].lessons[0].id);
      }
    }
  }, [courseSlug]);

  // Mock progress: assume all lessons in first module are completed
  const completedLessonsMock = new Set<string>(course?.modules[0]?.lessons.map(l => l.id) || []);

  if (loading || isLoadingCourse || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        Loading learning environment...
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        Course not found or you are not enrolled. 
        <Button variant="link" asChild><Link href="/dashboard">Go to Dashboard</Link></Button>
      </div>
    );
  }
  
  // Determine current lesson based on URL or state. For this layout, we'll focus on structure.
  // The actual `page.tsx` inside `learn/[courseId]/[...lessonSlug]/page.tsx` would handle this.

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar for Course Navigation */}
      <aside className="w-80 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center text-sm text-primary hover:underline mb-2">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </Link>
          <h2 className="text-lg font-semibold truncate" title={course.title}>{course.title}</h2>
          {/* Placeholder for overall course progress */}
          <div className="mt-2">
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>Overall Progress</span>
                <span>30%</span> {/* Placeholder */}
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                <div className="bg-primary h-1.5 rounded-full" style={{ width: "30%" }}></div> {/* Placeholder */}
            </div>
          </div>
        </div>
        <ScrollArea className="flex-grow">
          <Accordion type="multiple" defaultValue={course.modules.map(m => `module-${m.id}`)} className="w-full p-2">
            {course.modules.map((moduleItem) => (
              <AccordionItem value={`module-${moduleItem.id}`} key={moduleItem.id} className="border-b-0 mb-1">
                <AccordionTrigger className="px-3 py-2 hover:bg-secondary/70 rounded-md text-sm font-medium hover:no-underline">
                  {moduleItem.title}
                </AccordionTrigger>
                <AccordionContent className="pt-1 pb-0">
                  <ul className="space-y-0.5 pl-3 border-l-2 border-primary/20 ml-3">
                    {moduleItem.lessons.map((lesson) => {
                      const isCompleted = completedLessonsMock.has(lesson.id); // Mock completion
                      const isActive = lesson.id === currentLessonId; // Mock active state
                      let Icon = PlayCircle;
                      if(lesson.contentType === 'pdf') Icon = FileText;
                      if(lesson.contentType === 'quiz') Icon = RadioButtonChecked; // Assuming Quiz icon

                      return (
                        <li key={lesson.id}>
                          <Link 
                            href={`/learn/${course.slug}/${moduleItem.id}/${lesson.id}`} // Example lesson path
                            className={`flex items-center justify-between p-2.5 rounded-md text-xs hover:bg-secondary ${isActive ? 'bg-secondary text-primary font-semibold' : 'text-foreground/80'}`}
                          >
                            <div className="flex items-center truncate">
                              {isCompleted ? <CheckCircle className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" /> : <Icon className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />}
                              <span className="truncate">{lesson.title}</span>
                            </div>
                            {lesson.duration && <span className="text-muted-foreground text-xs ml-2 flex-shrink-0">{lesson.duration}</span>}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </aside>

      {/* Main Content Area for Lesson */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border bg-card flex items-center justify-between">
            {/* Current Lesson Title placeholder */}
            <h1 className="text-xl font-semibold">Current Lesson Title Placeholder</h1>
            <div className="flex gap-2">
                <Button variant="outline" size="sm">Previous</Button>
                <Button variant="default" size="sm">Next Lesson</Button>
            </div>
        </div>
        <ScrollArea className="flex-grow bg-background p-4 md:p-6">
          {children}
        </ScrollArea>
      </main>
    </div>
  );
}
