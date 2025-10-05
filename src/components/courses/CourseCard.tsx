
"use client";

import Image from 'next/image';
import Link from 'next/link';
import type { Course } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '../ui/button';

import { BookOpen, BarChart, EyeOff, CheckCircle, DollarSign, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { updateUserProfile, getUserProfile, enrollUserInCourse } from '@/lib/mockData';
import { useState, useEffect } from 'react';
import { cn, getCoursePriceDisplay } from '@/lib/utils';
import PaystackPayment from './PaystackPayment';

interface CourseCardProps {
  course: Course;
  onEnrollSuccess?: () => void;
}

export function CourseCard({ course, onEnrollSuccess }: CourseCardProps) {
  const isPublished = course.isPublished ?? true; // Default to published if undefined

  const firstModule = course.modules?.[0];
  const firstLesson = firstModule?.lessons?.[0];
  

  
  const courseLink = (isPublished && firstModule && firstLesson) 
    ? `/learn/${course.slug}/${firstModule.id}/${firstLesson.id}` 
    : '#';
  const { user } = useAuth();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
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

  const handleEnroll = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) return;
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (reference: string) => {
    try {
      setIsEnrolling(true);
      
      // Use the enrollUserInCourse function to properly enroll the user
      const success = await enrollUserInCourse(user.uid, course.id);
      
      if (success) {
        setIsEnrolled(true);
        setShowPaymentModal(false);
        if (onEnrollSuccess) {
          onEnrollSuccess();
        }
      } else {
        console.error('Failed to enroll user in course');
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
          
          {/* Pricing Display */}
          {(() => {
            const priceInfo = getCoursePriceDisplay(course.pricing, course.price);
            return (
              <div className="flex items-center gap-1.5 mt-3">
                {priceInfo.isDonation ? (
                  <Heart className="h-4 w-4 text-pink-500" />
                ) : priceInfo.isPaid ? (
                  <DollarSign className="h-4 w-4 text-green-600" />
                ) : null}
                <span className={cn(
                  "text-sm font-semibold",
                  priceInfo.isFree && "text-green-600",
                  priceInfo.isDonation && "text-pink-600",
                  priceInfo.isPaid && "text-primary"
                )}>
                  {priceInfo.display}
                </span>
              </div>
            );
          })()}
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

      {/* Payment Modal */}
      {showPaymentModal && user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Enroll in Course</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <PaystackPayment
                courseId={course.id}
                courseTitle={course.title}
                pricing={course.pricing || { type: 'payment', amount: course.price }}
                fallbackPrice={course.price}
                userEmail={user.email || ''}
                userId={user.uid}
                onSuccess={handlePaymentSuccess}
                onClose={() => setShowPaymentModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
