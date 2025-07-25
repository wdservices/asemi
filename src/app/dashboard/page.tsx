
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
    if (userProfile) {
      // In a real app, you would fetch recent courses based on user activity
      // For now, we'll just show the first few mock courses as "recent"
      const allCourses = getAllCourses();
      setRecentCourses(allCourses.slice(0, 3));
    }
    setIsLoading(false);
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
            {recentCourses.map((course) => (
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

      {/* Placeholder for other dashboard sections like performance stats, etc. */}
       <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-6 text-foreground">Recommended For You</h2>
           <p className="text-muted-foreground">Based on your interests and learning history. (Placeholder)</p>
          {/* Placeholder: Render some course cards here */}
       </section>
    </div>
  );
}
