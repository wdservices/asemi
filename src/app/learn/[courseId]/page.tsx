
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Course, Lesson as LessonType, ResourceFile } from '@/lib/types';
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
  // For a real app with nested lesson routes, you'd get module/lesson slugs from params too.
  // const lessonSlugParts = params.lessonSlug || []; 
  // const currentModuleSlug = lessonSlugParts[0];
  // const currentLessonSlug = lessonSlugParts[1];
  
  const [course, setCourse] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<LessonType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (courseSlug) {
      const fetchedCourse = getCourseBySlug(courseSlug);
      if (fetchedCourse) {
        setCourse(fetchedCourse);
        // Default to the first lesson of the first module
        if (fetchedCourse.modules && fetchedCourse.modules.length > 0 && fetchedCourse.modules[0].lessons.length > 0) {
          setCurrentLesson(fetchedCourse.modules[0].lessons[0]);
        } else {
          // Handle case with no lessons or modules
        }
      } else {
        router.push('/dashboard'); // Course not found
      }
      setIsLoading(false);
    }
  }, [courseSlug, router]);

  // This page would typically be part of a nested route like /learn/[courseId]/[moduleId]/[lessonId]
  // And the layout would pass down or this page would fetch the specific lesson content.
  // For now, this page will display the content of `currentLesson`.

  if (isLoading) {
    return <div className="p-6">Loading lesson...</div>;
  }

  if (!course || !currentLesson) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-semibold mb-4">Welcome to {course?.title || 'the course'}!</h2>
        <p className="text-muted-foreground">Please select a lesson from the sidebar to begin.</p>
      </div>
    );
  }
  
  // Function to simulate changing lesson - in a real app, this would involve router.push
  const selectLesson = (lesson: LessonType) => {
      setCurrentLesson(lesson);
      // router.push(`/learn/${courseSlug}/${moduleId}/${lesson.id}`); // Example
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
