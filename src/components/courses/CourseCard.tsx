
"use client";

import Image from 'next/image';
import Link from 'next/link';
import type { Course } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '../ui/button';

import { BookOpen, BarChart, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { updateUserProfile, getUserProfile } from '@/lib/mockData';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  course: Course;
  onEnrollSuccess?: () => void;
}

export function CourseCard({ course, onEnrollSuccess }: CourseCardProps) {
  const isPublished = course.isPublished ?? true; // Default to published if undefined

  const firstModule = course.modules?.[0];
  const firstLesson = firstModule?.lessons?.[0];
  
  // Debug logging
  if (course.title.includes('AI') || course.title.includes('CV')) {
    console.log('Course data for', course.title, ':', {
      id: course.id,
      slug: course.slug,
      isPublished,
      hasModules: !!course.modules?.length,
      firstModuleId: firstModule?.id,
      firstModuleTitle: firstModule?.title,
      firstLessonId: firstLesson?.id,
      firstLessonTitle: firstLesson?.title,
      modules: course.modules?.map(m => ({
        id: m.id,
        title: m.title,
        lessonCount: m.lessons?.length || 0,
        firstLessonId: m.lessons?.[0]?.id
      }))
    });
  }
  
  const courseLink = (isPublished && firstModule && firstLesson) 
    ? `/learn/${course.slug}/${firstModule.id}/${firstLesson.id}` 
    : '#';
  const { user } = useAuth();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const isClickable = isEnrolled && courseLink !== '#';

  useEffect(() => {
    let isMounted = true;
    
    const checkEnrollment = async () => {
      if (user) {
        const userProfile = await getUserProfile(user.uid);
        if (isMounted) {
          const enrolled = userProfile?.enrolledCourses?.includes(course.id);
          setIsEnrolled(!!enrolled);
        }
      } else if (isMounted) {
        setIsEnrolled(false);
      }
    };
    
    checkEnrollment();
    
    return () => {
      isMounted = false;
    };
  }, [user, course.id]);

  const handleEnroll = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      setIsEnrolling(true);
      // Get current user profile
      const userProfile = await getUserProfile(user.uid);
      
      // Get current enrolled courses, defaulting to empty array if none exist
      const currentEnrolled = userProfile?.enrolledCourses || [];
      
      // Only update if user is not already enrolled
      if (!currentEnrolled.includes(course.id)) {
        const updatedCourses = [...currentEnrolled, course.id];
        await updateUserProfile(user.uid, {
          ...userProfile,
          enrolledCourses: updatedCourses
        });
      }
      
      setIsEnrolled(true);
      if (onEnrollSuccess) {
        onEnrollSuccess();
      }
    } catch (error) {
      console.error('Error enrolling in course:', error);
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <Card className={cn(
      "flex flex-col h-full overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300",
      !isPublished && "opacity-60 bg-muted/30"
    )}>
      <Link href={courseLink} aria-disabled={!isClickable} className={cn("block", !isClickable && "pointer-events-none")}>
        <div className="relative w-full h-40 bg-muted">
          <Image
            src={course.imageUrl || 'https://placehold.co/400x200.png'}
            alt={course.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            data-ai-hint="course topic"
          />
           {!isPublished && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="flex items-center gap-2 text-white font-semibold">
                <EyeOff className="h-5 w-5" />
                <span>Unpublished</span>
              </div>
            </div>
          )}
        </div>
      </Link>
      <CardHeader className="p-4">
        <Badge variant="secondary" className="mb-2 w-fit">{course.category}</Badge>
        <Link href={courseLink} aria-disabled={!isClickable} className={cn("block", !isClickable && "pointer-events-none")}>
          <CardTitle className="text-md font-semibold hover:text-primary transition-colors line-clamp-2">
            {course.title}
          </CardTitle>
        </Link>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow">
          <div className="flex items-center text-xs text-muted-foreground space-x-4">
            <div className="flex items-center gap-1.5">
                <BookOpen className="h-3 w-3" />
                <span>{course.modules.reduce((acc, m) => acc + m.lessons.length, 0)} Lessons</span>
            </div>
            <div className="flex items-center gap-1.5">
                <BarChart className="h-3 w-3" />
                <span>{course.level}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">By {course.author}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        {isEnrolled ? (
          <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href={courseLink} className="flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Start Learning</span>
            </Link>
          </Button>
        ) : (
          <Button 
            onClick={handleEnroll} 
            disabled={isEnrolling}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isEnrolling ? 'Enrolling...' : 'Enroll Now'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
