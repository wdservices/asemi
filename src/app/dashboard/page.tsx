
"use client";

import { useEffect, useState } from 'react';
import type { Exam } from '@/lib/types';
import { getAllExams } from '@/lib/mockData';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';
import { ExamCard } from '@/components/exams/ExamCard';


export default function DashboardPage() {
  const { user, userProfile } = useAuth();
  const [recentExams, setRecentExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userProfile) {
      // In a real app, you would fetch recent exams based on user activity
      // For now, we'll just show the first few mock exams as "recent"
      const allExams = getAllExams();
      setRecentExams(allExams.slice(0, 3));
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
        <h2 className="text-2xl font-semibold mb-6 text-foreground">Recent Exams</h2>
        {recentExams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentExams.map((exam) => (
               <ExamCard key={exam.id} exam={exam} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-card rounded-lg shadow">
            <p className="text-muted-foreground mb-4">You haven't attempted any exams yet.</p>
            <Button asChild>
              <Link href="/exams">Explore Exams</Link>
            </Button>
          </div>
        )}
      </section>

      {/* Placeholder for other dashboard sections like performance stats, etc. */}
       <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-6 text-foreground">Recommended For You</h2>
           <p className="text-muted-foreground">Based on your subjects and performance history. (Placeholder)</p>
          {/* Placeholder: Render some exam cards here */}
       </section>
    </div>
  );
}
