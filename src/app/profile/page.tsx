'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, BookOpen, Calendar } from 'lucide-react';
import { getAllCourses } from '@/lib/mockData';
import type { Course } from '@/lib/types';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login?redirect=/profile');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      if (userProfile?.enrolledCourses && userProfile.enrolledCourses.length > 0) {
        try {
          const allCourses = await getAllCourses();
          const enrolled = allCourses.filter(course => 
            userProfile.enrolledCourses?.includes(course.id)
          );
          setEnrolledCourses(enrolled);
        } catch (error) {
          console.error('Error fetching enrolled courses:', error);
        }
      }
      setIsLoadingCourses(false);
    };

    if (userProfile) {
      fetchEnrolledCourses();
    }
  }, [userProfile]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const initials = user.displayName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">My Profile</h1>

      {/* Profile Information Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Your account details and information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage 
                src={user.photoURL || `https://avatar.vercel.sh/${user.email}.png`} 
                alt={user.displayName || "User Avatar"} 
              />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-4">
              <div>
                <Label htmlFor="displayName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  value={user.displayName || 'Not set'}
                  disabled
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="joinDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Member Since
                </Label>
                <Input
                  id="joinDate"
                  value={user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown'}
                  disabled
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enrolled Courses Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            My Enrolled Courses
          </CardTitle>
          <CardDescription>
            Courses you have enrolled in ({enrolledCourses.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingCourses ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading courses...
            </div>
          ) : enrolledCourses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                You haven't enrolled in any courses yet.
              </p>
              <Button asChild>
                <Link href="/courses">Browse Courses</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {enrolledCourses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{course.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {course.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {course.modules?.length || 0} modules
                      </span>
                      <span>{course.level}</span>
                      <span>{course.category}</span>
                    </div>
                  </div>
                  <Button asChild>
                    <Link href={`/learn/${course.slug}`}>
                      Continue Learning
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* Account Actions */}
      <div className="flex gap-4">
        <Button variant="outline" asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/settings">Account Settings</Link>
        </Button>
      </div>
    </div>
  );
}
