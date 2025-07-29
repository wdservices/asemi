
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Course, Lesson as LessonType, CourseModule } from '@/lib/types';
import { getCourseBySlug } from '@/lib/mockData';
import VideoPlayer from '@/components/courses/VideoPlayer';
import ResourceList from '@/components/courses/ResourceList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb } from 'lucide-react';

export default function CourseLearnPage() {
  const params = useParams();
  const router = useRouter();
  
  const courseSlug = typeof params.courseId === 'string' ? params.courseId : '';
  const lessonParams = params.lessonParams as string[] || [];
  const currentModuleId = lessonParams[0];
  const currentLessonId = lessonParams[1];
  
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (courseSlug) {
      const fetchCourse = async () => {
        setIsLoading(true);
        const fetchedCourse = await getCourseBySlug(courseSlug);
        
        if (fetchedCourse) {
          setCourse(fetchedCourse);
          // If no lesson params are in the URL, redirect to the first lesson.
          if ((!currentModuleId || !currentLessonId) && fetchedCourse.modules?.[0]?.lessons?.[0]) {
              const firstModule = fetchedCourse.modules[0];
              const firstLesson = firstModule.lessons[0];
              router.replace(`/learn/${courseSlug}/${firstModule.id}/${firstLesson.id}`);
          }
        } else {
          // If course is not found, redirect to dashboard.
          router.push('/dashboard');
        }
        setIsLoading(false);
      }
      fetchCourse();
    }
  }, [courseSlug, currentModuleId, currentLessonId, router]);
  
  const currentLesson = useMemo(() => {
    if (!course || !currentModuleId || !currentLessonId) {
      return null;
    }
    const module = course.modules.find(m => m.id === currentModuleId);
    return module?.lessons.find(l => l.id === currentLessonId) || null;
  }, [course, currentModuleId, currentLessonId]);


  if (isLoading || !currentLesson) {
    // Let the loading.tsx handle the loading state, or show a simple message if a lesson isn't found post-load.
    return <div className="p-6 text-center">Loading lesson content...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {currentLesson.contentType === 'video' && currentLesson.content && (
        <VideoPlayer videoUrl={currentLesson.content} title={currentLesson.title} />
      )}

      <div className="mt-6 bg-card p-6 rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-2 text-foreground">{currentLesson.title}</h2>
        
        <Tabs defaultValue="overview" className="mt-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="qna">Q&A</TabsTrigger> {/* Placeholder */}
          </TabsList>
          <TabsContent value="overview" className="mt-4 prose prose-sm max-w-none text-foreground">
            {currentLesson.contentType === 'text' && (
              <div dangerouslySetInnerHTML={{ __html: currentLesson.content.replace(/\n/g, '<br />') }} />
            )}
            {currentLesson.contentType === 'pdf' && (
              <div>
                <p className="mb-4">This lesson contains a PDF document. You can download it from the resources tab or view it below.</p>
                <iframe src={currentLesson.content} width="100%" height="500px" className="rounded border"></iframe>
              </div>
            )}
             {currentLesson.contentType === 'video' && (
              <p>Watch the video above. Key takeaways and notes will be displayed here. (Placeholder for video description/notes)</p>
            )}
            <Alert className="mt-6">
              <Lightbulb className="h-4 w-4" />
              <AlertTitle>Tip!</AlertTitle>
              <AlertDescription>
                Take notes while you learn. It helps with retention! (Placeholder for lesson-specific tips)
              </AlertDescription>
            </Alert>
          </TabsContent>
          <TabsContent value="resources" className="mt-4">
            {currentLesson.downloadableResources && currentLesson.downloadableResources.length > 0 ? (
              <ResourceList resources={currentLesson.downloadableResources} />
            ) : (
              <p className="text-muted-foreground">No downloadable resources for this lesson.</p>
            )}
          </TabsContent>
          <TabsContent value="qna" className="mt-4">
             <p className="text-muted-foreground">Q&A section for this lesson. (Placeholder)</p>
             {/* Add Q&A component here */}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
