
"use client";

import { useEffect, useState } from 'react';
import type { Course } from '@/lib/types';
import { getAllCourses } from '@/lib/mockData';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { CourseCard } from '@/components/courses/CourseCard';


export default function DashboardPage() {
  const { user, userProfile } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      if (userProfile) {
        const allCourses = await getAllCourses();
        
        // Filter enrolled courses
        const enrolled = allCourses.filter(course => 
          userProfile.enrolledCourses?.includes(course.id)
        );
        setEnrolledCourses(enrolled);
        
        // Get recommended courses (first 3 courses not enrolled in)
        const recommended = allCourses
          .filter(course => !userProfile.enrolledCourses?.includes(course.id))
          .slice(0, 3);
        setRecommendedCourses(recommended);
      }
      setIsLoading(false);
    };
    
    fetchCourses();
  }, [userProfile]);

  if (isLoading) {
    return <div className="text-center">Loading your dashboard...</div>;
  }

  if (!user) {
    return <div className="text-center">Please login to view your dashboard.</div>; // Should be handled by layout
  }

  return (
    <div className="space-y-8">
      <section className="bg-card p-6 rounded-lg shadow">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">My Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Welcome back, {user.displayName || 'User'}! Continue your learning journey.</p>
      </section>

      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-foreground">My Enrolled Courses</h2>
          <Button asChild variant="outline">
            <Link href="/courses">Browse All Courses</Link>
          </Button>
        </div>
        {enrolledCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-card rounded-lg shadow">
            <p className="text-muted-foreground mb-4">You haven't enrolled in any courses yet.</p>
            <Button asChild>
              <Link href="/courses">Explore Courses</Link>
            </Button>
          </div>
        )}
      </section>

{/* Recommended courses section - shows if user has no enrolled courses */}
      {enrolledCourses.length === 0 && recommendedCourses.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-6 text-foreground">Recommended For You</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
