'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Plus } from 'lucide-react';

export default function EnrollSpecificUsersPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [email, setEmail] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [isCreatingSample, setIsCreatingSample] = useState(false);
  const { toast } = useToast();

  // Load courses on mount
  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setIsLoadingCourses(true);
    try {
      console.log('=== LOADING COURSES ===');
      console.log('Fetching from: /api/admin/enroll-user');
      const response = await fetch('/api/admin/enroll-user');
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
      
      if (data.status === 'success') {
        console.log('✅ API returned success');
        console.log('Number of courses:', data.data?.length || 0);
        console.log('Courses array:', data.data);
        
        if (Array.isArray(data.data)) {
          setCourses(data.data);
          console.log('✅ Courses set in state:', data.data.length);
          
          if (data.data.length > 0) {
            setSelectedCourse(data.data[0].id);
            console.log('✅ Selected first course:', data.data[0].id, data.data[0].title);
          } else {
            console.warn('⚠️ Courses array is empty');
          }
        } else {
          console.error('❌ data.data is not an array:', typeof data.data);
        }
      } else {
        console.error('❌ API returned error:', data);
        toast({
          title: "Failed to Load Courses",
          description: data.message || "Could not fetch courses from database.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Exception while loading courses:', error);
      toast({
        title: "Error Loading Courses",
        description: "Network error while fetching courses.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const createSampleData = async () => {
    setIsCreatingSample(true);
    try {
      const response = await fetch('/api/admin/create-sample-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        toast({
          title: "Sample Data Created",
          description: `Sample course "${data.data.courseTitle}" created successfully.`
        });
        // Reload courses
        await loadCourses();
      } else {
        toast({
          title: "Failed to Create Sample Data",
          description: data.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create sample data.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingSample(false);
    }
  };

  const handleEnrollUser = async () => {
    if (!email || !selectedCourse) {
      toast({
        title: 'Missing Information',
        description: 'Please enter an email and select a course.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/admin/enroll-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, courseId: selectedCourse })
      });

      const data = await response.json();

      if (data.status === 'success') {
        toast({
          title: "User Enrolled Successfully",
          description: `${email} has been enrolled in the selected course.`
        });
        setEmail(''); // Clear the form
      } else {
        toast({
          title: "Enrollment Failed",
          description: data.message || "Failed to enroll user.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error enrolling user:', error);
      toast({
        title: "Error",
        description: "Failed to enroll user. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Manual User Enrollment</h1>
          <p className="text-muted-foreground mt-2">
            Manually enroll users who made payments but didn't receive access due to verification issues.
          </p>
        </div>

        {courses.length === 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-yellow-500 flex items-center justify-center">
                  <span className="text-white text-xs">!</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-yellow-800">No Courses Available</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    You need to create a course first before enrolling users.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={createSampleData}
                    disabled={isCreatingSample}
                    variant="outline"
                    size="sm"
                  >
                    {isCreatingSample ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-3 w-3" />
                        Create Sample Course
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/admin/test-firestore');
                        const data = await response.json();
                        console.log('Firestore test result:', data);
                        toast({
                          title: "Firestore Test",
                          description: `Found ${data.data?.totalCourses || 0} courses in Firestore. Check console for details.`
                        });
                      } catch (error) {
                        console.error('Firestore test error:', error);
                        toast({
                          title: "Firestore Test Failed",
                          description: "Check console for error details.",
                          variant: "destructive"
                        });
                      }
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Test Firestore
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Enroll User by Email
            </CardTitle>
            <CardDescription>
              Enter a user's email address to enroll them in a course.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">User Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="course">Course</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse} disabled={isLoadingCourses}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingCourses ? "Loading courses..." : "Select a course"} />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingCourses ? (
                      <SelectItem value="loading" disabled>
                        Loading courses...
                      </SelectItem>
                    ) : courses.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No courses available
                      </SelectItem>
                    ) : (
                      courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {!isLoadingCourses && (
                  <p className="text-xs text-muted-foreground">
                    {courses.length} course(s) available
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleEnrollUser}
                disabled={isLoading || !email || !selectedCourse}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enrolling...
                  </>
                ) : (
                  'Enroll User'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center mt-0.5">
                <span className="text-white text-xs">i</span>
              </div>
              <div>
                <h4 className="font-medium text-blue-800">How to Use</h4>
                <ul className="text-sm text-blue-700 mt-1 space-y-1">
                  <li>• Enter the email address of the user you want to enroll</li>
                  <li>• Select the course from the dropdown</li>
                  <li>• Click "Enroll User" to complete the enrollment</li>
                  <li>• The user must already have an account in the system</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
