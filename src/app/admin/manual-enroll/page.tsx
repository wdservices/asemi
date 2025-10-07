'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export default function ManualEnrollPage() {
  const [email, setEmail] = useState('');
  const [courseId, setCourseId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  // Load available courses on component mount
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const response = await fetch('/api/admin/enroll-user');
        const data = await response.json();
        if (data.status === 'success') {
          setCourses(data.data);
        }
      } catch (error) {
        console.error('Failed to load courses:', error);
      }
    };
    loadCourses();
  }, []);

  const handleEnroll = async () => {
    if (!email || !courseId) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in email and select a course',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/enroll-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, courseId })
      });

      const data = await response.json();

      if (data.status === 'success') {
        toast({
          title: 'Success',
          description: `User ${email} enrolled successfully!`
        });
        setEmail('');
        setCourseId('');
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Enrollment failed',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to enroll user',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-destructive">Access denied. Admin only.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Manual User Enrollment</CardTitle>
          <CardDescription>
            Manually enroll users who paid before the automated enrollment system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">User Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g., mitch@communionme.com"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter the email address of the user who paid
            </p>
          </div>

          <div>
            <Label htmlFor="courseId">Course</Label>
            <select
              id="courseId"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full p-2 border border-input rounded-md bg-background"
            >
              <option value="">Select a course...</option>
              {courses.map((course: any) => (
                <option key={course.id} value={course.id}>
                  {course.title} ({course.pricing?.type || 'free'})
                </option>
              ))}
            </select>
            <p className="text-sm text-muted-foreground mt-1">
              Select the course the user should be enrolled in
            </p>
          </div>

          <Button
            onClick={handleEnroll}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Enrolling...' : 'Enroll User'}
          </Button>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Users to Enroll:</h3>
            <ul className="text-sm space-y-1">
              <li><strong>User 1:</strong> mitch@communionme.com</li>
              <li><strong>User 2:</strong> innocentodo41@gmail.com</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              These users made payments but didn't get access due to verification issues.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
