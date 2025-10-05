'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export default function ManualEnrollPage() {
  const [userId, setUserId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const handleEnroll = async () => {
    if (!userId || !courseId || !adminKey) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/manual-enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, courseId, adminKey })
      });

      const data = await response.json();

      if (data.status === 'success') {
        toast({
          title: 'Success',
          description: 'User enrolled successfully!'
        });
        setUserId('');
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
            <Label htmlFor="userId">User ID (Firebase UID)</Label>
            <Input
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g., uXvdtusVltrpiehZI84a"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Find this in Firestore under the users collection
            </p>
          </div>

          <div>
            <Label htmlFor="courseId">Course ID</Label>
            <Input
              id="courseId"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              placeholder="e.g., qp7aX8AICbo4ZV1kOPO5"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Find this in Firestore under the courses collection
            </p>
          </div>

          <div>
            <Label htmlFor="adminKey">Admin Secret Key</Label>
            <Input
              id="adminKey"
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Enter admin secret key"
            />
            <p className="text-sm text-muted-foreground mt-1">
              This is set in your environment variables
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
            <h3 className="font-semibold mb-2">Quick Reference:</h3>
            <ul className="text-sm space-y-1">
              <li><strong>Gospel's User ID:</strong> uXvdtusVltrpiehZI84a</li>
              <li><strong>Learn AI Course ID:</strong> qp7aX8AICbo4ZV1kOPO5</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
