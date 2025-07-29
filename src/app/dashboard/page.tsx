
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
  const [recentCourses, setRecentCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
        if (userProfile) {
        // In a real app, you would fetch recent courses based on user activity
        // For now, we'll just show the first few mock courses as "recent"
        const allCourses = await getAllCourses();
        setRecentCourses(allCourses.slice(0, 3));
        }
        setIsLoading(false);
    }
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
        <h2 className="text-2xl font-semibold mb-6 text-foreground">My Courses</h2>
        {recentCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
<<<<<<< HEAD
            {recentCourses.map((course) => (
               <CourseCard key={course.id} course={course} />
=======
            {enrolledCourses.map((course) => (
              <div key={course.id} className="bg-card rounded-lg shadow-lg overflow-hidden flex flex-col">
                 <Link href={`/learn/${course.slug}`} className="block">
                  <div className="relative w-full h-40">
                    <Image
                      src={course.thumbnailUrl || "/course-fallback.webp"}
                      alt={course.title}
                      fill
                      className="object-cover aspect-video"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      data-ai-hint="course image"
                    />
                  </div>
                </Link>
                <div className="p-4 flex-grow flex flex-col">
                  <h3 className="text-lg font-semibold text-foreground mb-1 hover:text-primary transition-colors">
                    <Link href={`/learn/${course.slug}`}>{course.title}</Link>
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">By {course.instructor.name}</p>
                  
                  {course.enrollmentProgress !== undefined && (
                    <div className="mt-auto space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{course.enrollmentProgress}%</span>
                      </div>
                      <Progress value={course.enrollmentProgress} className="h-2" />
                       <Button asChild size="sm" className="w-full mt-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Link href={`/learn/${course.slug}`}>
                          {course.enrollmentProgress > 0 ? 'Continue Learning' : 'Start Learning'}
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
>>>>>>> 6eac0ccc0308dd5cc8e1982a3a6b9ae0241f424c
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

      {/* Placeholder for other dashboard sections like performance stats, etc. */}
       <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-6 text-foreground">Recommended For You</h2>
           <p className="text-muted-foreground">Based on your interests and learning history. (Placeholder)</p>
          {/* Placeholder: Render some course cards here */}
       </section>
    </div>
  );
}
