
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Course, Lesson as LessonType, CourseModule } from '@/lib/types';
import { getCourseBySlug, verifyUserPaymentForCourse, getUserProfile } from '@/lib/mockData';
import VideoPlayer from '@/components/courses/VideoPlayer';
import ResourceList from '@/components/courses/ResourceList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Lightbulb, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';

export default function CourseLearnPage() {
  const params = useParams();
  const router = useRouter();
  const { user, userProfile } = useAuth();
  
  const courseSlug = typeof params.courseId === 'string' ? params.courseId : '';
  const lessonParams = params.lessonParams as string[] || [];
  const currentModuleId = lessonParams[0];
  const currentLessonId = lessonParams[1];
  
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  // Check enrollment status and verify payment
  useEffect(() => {
    const checkEnrollment = async () => {
      if (userProfile && course && user) {
        // First check if user is enrolled
        let enrolled = userProfile.enrolledCourses?.includes(course.id) || false;
        
        // If not enrolled locally, check Firestore for payment and enrollment
        if (!enrolled) {
          setIsVerifyingPayment(true);
          try {
            // Fetch latest user profile from Firestore
            const latestProfile = await getUserProfile(user.uid);
            if (latestProfile && latestProfile.enrolledCourses?.includes(course.id)) {
              enrolled = true;
              // Update local state if enrollment found in Firestore
              setIsEnrolled(true);
            } else {
              // Check if payment exists for this course
              const hasPayment = await verifyUserPaymentForCourse(user.uid, course.id);
              if (hasPayment) {
                // Payment exists but not enrolled - this shouldn't happen
                console.warn('Payment found but user not enrolled. Contact support.');
              }
            }
          } catch (error) {
            console.error('Error verifying enrollment:', error);
          } finally {
            setIsVerifyingPayment(false);
          }
        } else {
          setIsEnrolled(enrolled);
        }
      } else {
        setIsEnrolled(false);
      }
    };
    
    checkEnrollment();
  }, [userProfile, course, user]);

  useEffect(() => {
    if (courseSlug) {
      const fetchCourse = async () => {
        setIsLoading(true);
        try {
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
  
  const [currentLesson, setCurrentLesson] = useState<LessonType | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle redirects and lesson finding in useEffect to avoid setState during render
  useEffect(() => {
    // Only process if user is authenticated and enrolled
    if (!user || !course || !isEnrolled) {
      setCurrentLesson(null);
      setError(null);
      return;
    }
    
    if (!currentModuleId || !currentLessonId) {
      setError('Loading lesson...');
      setCurrentLesson(null);
      return;
    }
    
    // If course has no modules, return error
    if (!course.modules || course.modules.length === 0) {
      console.error('No modules found in course');
      setError('No modules found in this course.');
      setCurrentLesson(null);
      return;
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
        setError('Redirecting to first module...');
        setCurrentLesson(null);
        return;
      }
      setError('No valid modules found in this course.');
      setCurrentLesson(null);
      return;
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
      setError('No lessons found in this module.');
      setCurrentLesson(null);
      return;
    }
    
    const lesson = module.lessons.find(l => l.id === currentLessonId);
    
    // If lesson not found, redirect to first lesson in module
    if (!lesson) {
      console.error('Lesson not found, redirecting to first lesson in module');
      const firstLesson = module.lessons[0];
      router.replace(`/learn/${courseSlug}/${module.id}/${firstLesson.id}`);
      setError('Redirecting to first lesson...');
      setCurrentLesson(null);
      return;
    }
    
    console.log('Found lesson:', lesson);
    setCurrentLesson(lesson);
    setError(null);
  }, [user, course, isEnrolled, currentModuleId, currentLessonId, courseSlug, router]);


  if (isLoading || isVerifyingPayment) {
    return <div className="p-6 text-center">
      {isVerifyingPayment ? 'Verifying enrollment...' : 'Loading lesson content...'}
    </div>;
  }

  // Check if user is logged in
  if (!user) {
    return (
      <div className="p-6 text-center">
        <div className="bg-card p-8 rounded-lg shadow max-w-md mx-auto">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Login Required</h2>
          <p className="text-muted-foreground mb-4">
            Please log in to access course content.
          </p>
          <Button asChild>
            <Link href={`/auth/login?redirect=/learn/${courseSlug}/${currentModuleId}/${currentLessonId}`}>
              Login to Continue
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Check if user is enrolled in the course
  if (course && !isEnrolled) {
    return (
      <div className="p-6 text-center">
        <div className="bg-card p-8 rounded-lg shadow max-w-md mx-auto">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Enrollment Required</h2>
          <p className="text-muted-foreground mb-4">
            You need to enroll in <strong>{course.title}</strong> to access this content.
          </p>
          <Button asChild>
            <Link href={`/courses/${courseSlug}`}>
              Enroll in Course
            </Link>
          </Button>
        </div>
      </div>
    );
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
