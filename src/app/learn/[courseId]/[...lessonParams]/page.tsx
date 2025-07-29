
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
        console.log('Fetching course with slug:', courseSlug);
        setIsLoading(true);
        try {
          const fetchedCourse = await getCourseBySlug(courseSlug);
          console.log('Fetched course:', fetchedCourse);
          
          if (fetchedCourse) {
            setCourse(fetchedCourse);
            // If no lesson params are in the URL, redirect to the first lesson.
            if ((!currentModuleId || !currentLessonId) && fetchedCourse.modules?.[0]?.lessons?.[0]) {
                const firstModule = fetchedCourse.modules[0];
                const firstLesson = firstModule.lessons[0];
                console.log('No lesson params, redirecting to first lesson:', {
                  courseSlug,
                  moduleId: firstModule.id,
                  lessonId: firstLesson.id
                });
                router.replace(`/learn/${courseSlug}/${firstModule.id}/${firstLesson.id}`);
            } else {
              console.log('Using provided lesson params:', { currentModuleId, currentLessonId });
            }
          } else {
            console.error('Course not found, redirecting to dashboard');
            // If course is not found, redirect to dashboard.
            router.push('/dashboard');
          }
        } catch (error) {
          console.error('Error fetching course:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchCourse();
    }
  }, [courseSlug, currentModuleId, currentLessonId, router]);
  
  const { currentLesson, error } = useMemo(() => {
    console.log('Finding current lesson with params:', { currentModuleId, currentLessonId });
    
    // If we don't have the required data yet, return early
    if (!course) {
      console.log('Course data not loaded yet');
      return { currentLesson: null, error: 'Loading course data...' };
    }
    
    if (!currentModuleId || !currentLessonId) {
      console.log('Missing module or lesson ID in URL');
      return { currentLesson: null, error: 'Loading lesson...' };
    }
    
    // Log detailed course structure for debugging
    console.log('Course structure:', {
      courseId: course.id,
      courseSlug: course.slug,
      moduleCount: course.modules?.length || 0,
      moduleIds: course.modules?.map(m => m.id) || [],
      requestedModuleId: currentModuleId
    });
    
    // If course has no modules, return error
    if (!course.modules || course.modules.length === 0) {
      console.error('No modules found in course');
      return { currentLesson: null, error: 'No modules found in this course.' };
    }
    
    // Find the requested module
    const module = course.modules.find(m => m.id === currentModuleId);
    
    // If module not found, try to redirect to first module
    if (!module) {
      console.error('Module not found, available module IDs:', course.modules.map(m => m.id));
      const firstModule = course.modules[0];
      const firstLesson = firstModule.lessons?.[0];
      
      if (firstLesson) {
        console.log(`Redirecting to first module: ${firstModule.id}, first lesson: ${firstLesson.id}`);
        router.replace(`/learn/${courseSlug}/${firstModule.id}/${firstLesson.id}`);
        return { currentLesson: null, error: 'Redirecting to first module...' };
      }
      return { currentLesson: null, error: 'No valid modules found in this course.' };
    }
    
    console.log('Found module:', module);
    
    // Log detailed module structure for debugging
    console.log('Module structure:', {
      moduleId: module.id,
      lessonCount: module.lessons?.length || 0,
      lessonIds: module.lessons?.map(l => l.id) || [],
      requestedLessonId: currentLessonId
    });
    
    // If module has no lessons, return error
    if (!module.lessons || module.lessons.length === 0) {
      console.error('No lessons found in module');
      return { currentLesson: null, error: 'No lessons found in this module.' };
    }
    
    const lesson = module.lessons.find(l => l.id === currentLessonId);
    
    // If lesson not found, redirect to first lesson in module
    if (!lesson) {
      console.error('Lesson not found, redirecting to first lesson in module');
      const firstLesson = module.lessons[0];
      router.replace(`/learn/${courseSlug}/${module.id}/${firstLesson.id}`);
      return { currentLesson: null, error: 'Redirecting to first lesson...' };
    }
    
    console.log('Found lesson:', lesson);
    return { currentLesson: lesson, error: null };
  }, [course, currentModuleId, currentLessonId, courseSlug, router]);


  if (isLoading) {
    return <div className="p-6 text-center">Loading lesson content...</div>;
  }
  
  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg inline-block">
          {error}
        </div>
      </div>
    );
  }
  
  if (!currentLesson) {
    return (
      <div className="p-6 text-center">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg inline-block">
          Unable to load the requested lesson. Please try again or contact support.
        </div>
      </div>
    );
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
