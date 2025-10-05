
"use client";
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { getCourseBySlug } from '@/lib/mockData';
import type { Course, Lesson } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button';
import { ChevronLeft, CheckCircle, PlayCircle, FileText, CircleDot } from 'lucide-react';

export default function CourseLearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();

  const courseSlug = typeof params.courseId === 'string' ? params.courseId : '';
  const lessonParams = params.lessonParams as string[] || [];
  const currentModuleId = lessonParams[0];
  const currentLessonId = lessonParams[1];
  
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoadingCourse, setIsLoadingCourse] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/auth/login?redirect=/learn/${courseSlug}`);
    }
  }, [user, loading, router, courseSlug]);

  useEffect(() => {
    if (courseSlug) {
      const fetchCourse = async () => {
        setIsLoadingCourse(true);
        const fetchedCourse = await getCourseBySlug(courseSlug);
        setCourse(fetchedCourse || null);
        setIsLoadingCourse(false);
      };
      fetchCourse();
    }
  }, [courseSlug]);

  const { allLessons, currentLessonIndex, currentLesson, defaultOpenModules } = useMemo(() => {
    if (!course) {
      return { allLessons: [], currentLessonIndex: -1, currentLesson: null, defaultOpenModules: [] };
    }
    
    const allLessons: { lesson: Lesson; moduleId: string }[] = [];
    const defaultOpenModules: string[] = [];
    
    course.modules.forEach(module => {
      module.lessons.forEach(lesson => {
        allLessons.push({ lesson, moduleId: module.id });
      });
      if (module.id === currentModuleId) {
        defaultOpenModules.push(`module-${module.id}`);
      }
    });

    let currentLessonIndex = -1;
    if (currentLessonId) {
        currentLessonIndex = allLessons.findIndex(l => l.lesson.id === currentLessonId);
    } else if (allLessons.length > 0) {
        currentLessonIndex = 0;
    }
    
    const currentLesson = currentLessonIndex !== -1 ? allLessons[currentLessonIndex] : null;
    
    // If there's a current lesson but its module isn't in defaultOpen, add it.
    if(currentLesson && !defaultOpenModules.includes(`module-${currentLesson.moduleId}`)) {
        defaultOpenModules.push(`module-${currentLesson.moduleId}`);
    }


    return { allLessons, currentLessonIndex, currentLesson, defaultOpenModules };
  }, [course, currentModuleId, currentLessonId]);

  const handleNext = () => {
    if (currentLessonIndex < allLessons.length - 1) {
      const next = allLessons[currentLessonIndex + 1];
      router.push(`/learn/${courseSlug}/${next.moduleId}/${next.lesson.id}`);
    }
  };

  const handlePrevious = () => {
    if (currentLessonIndex > 0) {
      const prev = allLessons[currentLessonIndex - 1];
      router.push(`/learn/${courseSlug}/${prev.moduleId}/${prev.lesson.id}`);
    }
  };

  // Mock progress: assume all lessons in first module are completed
  const completedLessonsMock = new Set<string>(course?.modules[0]?.lessons.map(l => l.id) || []);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading || isLoadingCourse || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading learning environment...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="text-center bg-card p-8 rounded-xl shadow-xl border-2 border-primary/20">
          <p className="text-xl text-foreground mb-4">Course not found or you are not enrolled.</p>
          <Button asChild className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 relative">
      {/* Mobile sidebar toggle button */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-gradient-to-r from-primary to-accent text-white shadow-lg hover:shadow-xl transition-all"
        aria-label="Toggle sidebar"
      >
        {isSidebarOpen ? '✕' : '☰'}
      </button>
      
      {/* Sidebar for Course Navigation */}
      <aside 
        className={`fixed md:sticky top-0 left-0 h-screen w-[320px] border-r-2 border-primary/20 bg-card/95 backdrop-blur-sm flex flex-col transition-transform duration-300 ease-in-out z-40 shadow-xl ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}>
        <div className="p-5 border-b-2 border-primary/10 bg-gradient-to-r from-primary/5 to-accent/5">
          <Link href="/dashboard" className="flex items-center text-sm font-medium text-primary hover:text-accent transition-colors mb-3 group">
            <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
          </Link>
          <h2 className="text-xl font-bold truncate bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent" title={course.title}>{course.title}</h2>
          {/* Placeholder for overall course progress */}
          <div className="mt-4 p-3 bg-card rounded-lg border border-primary/20">
            <div className="flex justify-between text-sm font-semibold mb-2">
                <span className="text-foreground">Overall Progress</span>
                <span className="text-primary">{Math.round(((currentLessonIndex + 1) / allLessons.length) * 100)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div className="bg-gradient-to-r from-primary to-accent h-2.5 rounded-full transition-all duration-500" style={{ width: `${((currentLessonIndex + 1) / allLessons.length) * 100}%` }}></div>
            </div>
          </div>
        </div>
        <ScrollArea className="flex-grow">
          <Accordion type="multiple" defaultValue={defaultOpenModules} className="w-full p-3">
            {course.modules.map((moduleItem, moduleIndex) => {
              const moduleKey = `module-${moduleItem.id || moduleIndex}`;
              return (
                <AccordionItem 
                  key={moduleKey}
                  value={moduleKey}
                  className="border-b-0 mb-1"
                >
                <AccordionTrigger className="px-4 py-3 hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 rounded-lg text-sm font-semibold hover:no-underline w-full text-left transition-all">
                  <span className="truncate pr-2 text-left w-full">{moduleItem.title}</span>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-0">
                  <ul className="space-y-1 pl-4 border-l-2 border-gradient-to-b from-primary to-accent ml-3">
                    {moduleItem.lessons.map((lesson, lessonIndex) => {
                      const isCompleted = completedLessonsMock.has(lesson.id);
                      const isActive = lesson.id === currentLessonId;
                      let Icon = PlayCircle;
                      if(lesson.contentType === 'pdf') Icon = FileText;
                      if(lesson.contentType === 'quiz') Icon = CircleDot;
                      const lessonKey = `${moduleItem.id || 'module'}-${lesson.id || lessonIndex}`;

                      return (
                        <li key={lessonKey}>
                          <Link 
                            href={`/learn/${course.slug}/${moduleItem.id}/${lesson.id}`}
                            className={`flex items-center justify-between p-2.5 rounded-lg text-sm transition-all ${
                              isActive 
                                ? 'bg-gradient-to-r from-primary/20 to-accent/20 text-primary font-semibold shadow-md border-l-4 border-primary' 
                                : 'text-foreground/80 hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 hover:text-foreground'
                            }`}
                          >
                            <div className="flex items-center min-w-0 flex-1">
                              {isCompleted ? (
                                <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0 text-green-500" />
                              ) : (
                                <Icon className="h-4 w-4 mr-2 flex-shrink-0 text-muted-foreground" />
                              )}
                              <span className="truncate pr-2">{lesson.title}</span>
                            </div>
                            {lesson.duration && <span className="text-muted-foreground text-xs ml-2 whitespace-nowrap flex-shrink-0">{lesson.duration}</span>}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}
          </Accordion>
        </ScrollArea>
      </aside>

      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Main Content Area for Lesson */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="p-5 border-b-2 border-primary/10 bg-card/95 backdrop-blur-sm flex items-center justify-between shadow-sm">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden mr-2 p-1 rounded-md hover:bg-secondary"
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
            <h1 className="text-2xl font-bold truncate">{currentLesson?.lesson.title || "Course Content"}</h1>
            <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePrevious} 
                  disabled={currentLessonIndex <= 0}
                  className="border-2 border-primary/30 hover:bg-primary/10 hover:border-primary transition-all"
                >
                  Previous
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleNext} 
                  disabled={currentLessonIndex >= allLessons.length - 1}
                  className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-md hover:shadow-lg transition-all"
                >
                  Next Lesson
                </Button>
            </div>
        </div>
        <ScrollArea className="flex-grow bg-gradient-to-br from-background to-primary/5 p-6 md:p-8">
          {children}
        </ScrollArea>
      </main>
    </div>
  );
}
