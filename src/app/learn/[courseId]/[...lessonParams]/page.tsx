
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">
            {isVerifyingPayment ? 'Verifying enrollment...' : 'Loading lesson content...'}
          </p>
        </div>
      </div>
    );
  }

  // Check if user is logged in
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-card p-10 rounded-2xl shadow-2xl border-2 border-primary/20 max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Login Required</h2>
          <p className="text-muted-foreground mb-6">
            Please log in to access course content.
          </p>
          <Button asChild className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 w-full">
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-card p-10 rounded-2xl shadow-2xl border-2 border-primary/20 max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Enrollment Required</h2>
          <p className="text-muted-foreground mb-6">
            You need to enroll in <strong>{course.title}</strong> to access this content.
          </p>
          <Button asChild className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 w-full">
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-destructive/10 text-destructive p-6 rounded-xl border-2 border-destructive/30 max-w-md">
          <p className="font-semibold">{error}</p>
        </div>
      </div>
    );
  }
  
  if (!currentLesson) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-destructive/10 text-destructive p-6 rounded-xl border-2 border-destructive/30 max-w-md text-center">
          <p className="font-semibold">Unable to load the requested lesson. Please try again or contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {currentLesson.contentType === 'video' && currentLesson.content && (
        <div className="rounded-2xl overflow-hidden shadow-2xl border-2 border-primary/20 mb-8">
          <VideoPlayer videoUrl={currentLesson.content} title={currentLesson.title} />
        </div>
      )}

      <div className="mt-6 bg-card p-8 rounded-2xl shadow-xl border-2 border-primary/10">
        <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{currentLesson.title}</h2>
        
        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="bg-gradient-to-r from-primary/10 to-accent/10 p-1 h-12">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white font-semibold">Overview</TabsTrigger>
            <TabsTrigger value="resources" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white font-semibold">Resources</TabsTrigger>
            <TabsTrigger value="qna" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white font-semibold">Q&A</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-6 prose prose-sm max-w-none text-foreground">
            {currentLesson.contentType === 'text' && (
              <div className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl" dangerouslySetInnerHTML={{ __html: currentLesson.content.replace(/\n/g, '<br />') }} />
            )}
            {currentLesson.contentType === 'pdf' && (
              <div>
                <p className="mb-4 text-lg">This lesson contains a PDF document. You can download it from the resources tab or view it below.</p>
                <iframe src={currentLesson.content} width="100%" height="500px" className="rounded-xl border-2 border-primary/20 shadow-lg"></iframe>
              </div>
            )}
             {currentLesson.contentType === 'video' && (
              <div className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl">
                <p className="text-lg">Watch the video above. Key takeaways and notes will be displayed here. (Placeholder for video description/notes)</p>
              </div>
            )}
            <Alert className="mt-8 border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5 shadow-md">
              <Lightbulb className="h-5 w-5 text-primary" />
              <AlertTitle className="text-lg font-bold">Pro Tip!</AlertTitle>
              <AlertDescription className="text-base">
                Take notes while you learn. It helps with retention! (Placeholder for lesson-specific tips)
              </AlertDescription>
            </Alert>
          </TabsContent>
          <TabsContent value="resources" className="mt-6">
            {currentLesson.downloadableResources && currentLesson.downloadableResources.length > 0 ? (
              <div className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl">
                <ResourceList resources={currentLesson.downloadableResources} />
              </div>
            ) : (
              <div className="text-center p-12 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl">
                <p className="text-lg text-muted-foreground">No downloadable resources for this lesson.</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="qna" className="mt-6">
            <div className="text-center p-12 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl">
              <p className="text-lg text-muted-foreground">Q&A section for this lesson. (Placeholder)</p>
              {/* Add Q&A component here */}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
