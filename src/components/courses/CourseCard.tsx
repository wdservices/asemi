
"use client";

import Image from 'next/image';
import Link from 'next/link';
import type { Course } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '../ui/button';

import { BookOpen, BarChart, EyeOff, CheckCircle, DollarSign, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { updateUserProfile, getUserProfile, enrollUserInCourse, createPaymentRecord } from '@/lib/mockData';
import { useState, useEffect } from 'react';
import { cn, getCoursePriceDisplay } from '@/lib/utils';
import { convertGoogleDriveUrl, getFallbackImageUrl } from '@/lib/imageUtils';
import PaystackPayment from './PaystackPayment';
import { createPortal } from 'react-dom';

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

  const handlePaymentSuccess = async (reference: string, actualAmount?: number) => {
    try {
      setIsEnrolling(true);
      
      console.log('💰 handlePaymentSuccess called');
      console.log('  - reference:', reference);
      console.log('  - actualAmount received:', actualAmount);
      console.log('  - course.pricing?.amount:', course.pricing?.amount);
      console.log('  - course.price:', course.price);
      
      // Use the actual amount paid, falling back to course pricing
      const amount = actualAmount || course.pricing?.amount || course.price || 0;
      
      console.log('  - Final amount to save:', amount);
      
      // Save payment record to Firestore
      const paymentData = {
        userId: user?.uid || '',
        courseId: course.id,
        amount: amount,
        currency: 'NGN',
        reference: reference,
        status: 'success' as const,
        pricingType: course.pricing?.type || 'payment',
        customerEmail: user?.email || '',
        paidAt: new Date().toISOString()
      };
      
      console.log('Saving payment record:', paymentData);
      const paymentSaved = await createPaymentRecord(paymentData);
      
      if (!paymentSaved) {
        console.error('Failed to save payment record');
      }
      
      // Use the enrollUserInCourse function to properly enroll the user
      const success = await enrollUserInCourse(user?.uid || '', course.id);
      
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
    <>
    <Card className={cn(
      "group flex flex-col h-full overflow-hidden rounded-xl shadow-md hover:shadow-2xl transition-all duration-500 border-2 hover:border-primary/50 hover:-translate-y-2",
      !isPublished && "opacity-60 bg-muted/30"
    )}>
      <Link href={courseLink} aria-disabled={!isClickable} className={cn("block relative overflow-hidden", !isClickable && "pointer-events-none")}>
        <div className="relative w-full h-48 bg-gradient-to-br from-primary/10 to-accent/10">
          <Image
            src={convertGoogleDriveUrl(course.imageUrl || '') || getFallbackImageUrl()}
            alt={course.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            data-ai-hint="course topic"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
      <CardHeader className="p-5">
        <Badge variant="secondary" className="mb-3 w-fit bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 hover:from-primary/20 hover:to-accent/20 transition-all">
          {course.category}
        </Badge>
        <Link href={courseLink} aria-disabled={!isClickable} className={cn("block", !isClickable && "pointer-events-none")}>
          <CardTitle className="text-lg font-bold hover:text-primary transition-colors line-clamp-2 group-hover:text-primary">
            {course.title}
          </CardTitle>
        </Link>
      </CardHeader>
      <CardContent className="p-5 pt-0 flex-grow">
          <div className="flex items-center text-sm text-muted-foreground space-x-4 mb-3">
            <div className="flex items-center gap-2 bg-primary/5 px-3 py-1.5 rounded-full">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="font-medium">{course.modules.reduce((acc, m) => acc + m.lessons.length, 0)} Lessons</span>
            </div>
            <div className="flex items-center gap-2 bg-accent/5 px-3 py-1.5 rounded-full">
                <BarChart className="h-4 w-4 text-accent" />
                <span className="font-medium">{course.level}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2 font-medium">By {course.author}</p>
          
          {/* Pricing Display */}
          {(() => {
            const priceInfo = getCoursePriceDisplay(course.pricing, course.price);
            return (
              <div className="flex items-center gap-2 mt-4 px-3 py-2 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border border-primary/10">
                {priceInfo.isDonation ? (
                  <Heart className="h-5 w-5 text-pink-500" />
                ) : priceInfo.isPaid ? (
                  <DollarSign className="h-5 w-5 text-green-600" />
                ) : null}
                <span className={cn(
                  "text-lg font-bold",
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
      <CardFooter className="p-5 pt-0">
        {isEnrolled ? (
          <Button asChild className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 h-11">
            <Link href={courseLink} className="flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Start Learning</span>
            </Link>
          </Button>
        ) : (
          <Button 
            onClick={handleEnroll} 
            disabled={isEnrolling}
            className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 h-11"
          >
            {isEnrolling ? 'Enrolling...' : 'Enroll Now'}
          </Button>
        )}
      </CardFooter>

    </Card>

    {/* Payment Modal - Rendered via Portal */}
    {showPaymentModal && user && typeof window !== 'undefined' && createPortal(
      <div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowPaymentModal(false);
          }
        }}
      >
        <div 
          className="bg-white dark:bg-card rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5 border-b-2 border-primary/10 flex justify-between items-center bg-gradient-to-r from-primary/5 to-accent/5">
            <h3 className="text-xl font-bold">Enroll in Course</h3>
            <button
              onClick={() => setShowPaymentModal(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
          <div className="p-6">
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
      </div>,
      document.body
    )}
    </>
  );
}
