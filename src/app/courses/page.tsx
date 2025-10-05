
"use client";

import { useState, useEffect } from 'react';
import { getAllCourses, createSampleCourse } from '@/lib/mockData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { CourseCard } from '@/components/courses/CourseCard';
import type { Course } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingSample, setIsCreatingSample] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchCourses = async () => {
      if (user) {
        const fetchedCourses = await getAllCourses();
        
        // If no courses exist, create a mock course for testing
        if (fetchedCourses.length === 0) {
          const mockCourse = {
            id: "test-course-1",
            title: "React Development Fundamentals",
            slug: "react-development-fundamentals",
            description: "Learn the basics of React development from scratch",
            longDescription: "This comprehensive course covers everything you need to know about React development, from basic concepts to advanced patterns.",
            thumbnailUrl: "/course-fallback.webp",
            price: 0,
            pricing: { type: 'free' as const },
            category: "Web Development",
            level: "Beginner",
            tags: ["react", "javascript", "frontend"],
            instructorName: "John Doe",
            instructorBio: "Senior React Developer with 5+ years of experience",
            instructorTitle: "Senior Frontend Developer",
            previewVideoUrl: "https://www.youtube.com/watch?v=dGcsHMXbSOA",
            paymentLink: "",
            author: "John Doe",
            imageUrl: "/course-fallback.webp",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            modules: [
              {
                id: "module-1",
                title: "Getting Started with React",
                moduleOrder: 0,
                lessons: [
                  {
                    id: "lesson-1-1",
                    title: "Introduction to React",
                    contentType: "video" as const,
                    content: "https://www.youtube.com/watch?v=dGcsHMXbSOA",
                    duration: "15:30",
                    isPreviewable: true,
                    lessonOrder: 0,
                    downloadableResources: []
                  },
                  {
                    id: "lesson-1-2",
                    title: "Setting up Development Environment",
                    contentType: "video" as const,
                    content: "https://www.youtube.com/watch?v=SqcY0GlETPk",
                    duration: "12:45",
                    isPreviewable: false,
                    lessonOrder: 1,
                    downloadableResources: []
                  }
                ]
              },
              {
                id: "module-2",
                title: "React Components",
                moduleOrder: 1,
                lessons: [
                  {
                    id: "lesson-2-1",
                    title: "Understanding Components",
                    contentType: "video" as const,
                    content: "https://www.youtube.com/watch?v=Y2hgEGPzTZY",
                    duration: "18:20",
                    isPreviewable: false,
                    lessonOrder: 0,
                    downloadableResources: []
                  },
                  {
                    id: "lesson-2-2",
                    title: "Props and State",
                    contentType: "video" as const,
                    content: "https://www.youtube.com/watch?v=IYvD9oBCuJI",
                    duration: "22:15",
                    isPreviewable: false,
                    lessonOrder: 1,
                    downloadableResources: []
                  }
                ]
              }
            ]
          };
          setCourses([mockCourse]);
        } else {
          setCourses(fetchedCourses);
        }
      }
      setIsLoading(false);
    };

    fetchCourses();
  }, [user]);

  const handleCreateSampleCourse = async () => {
    setIsCreatingSample(true);
    try {
      const sampleCourse = await createSampleCourse();
      if (sampleCourse) {
        // Refresh courses list
        const fetchedCourses = await getAllCourses();
        setCourses(fetchedCourses);
        alert('Sample course created successfully!');
      }
    } catch (error) {
      console.error('Error creating sample course:', error);
      alert('Error creating sample course');
    } finally {
      setIsCreatingSample(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading courses...</div>;
  }

  if (!user) {
    return <div className="text-center py-8">Please login to view courses.</div>;
  }

  return (
    <div className="space-y-8">
      <section className="bg-card p-6 rounded-lg shadow">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Explore Our Courses</h1>
            <p className="mt-2 text-muted-foreground">Find the perfect course to practice and boost your skills.</p>
          </div>
          {courses.length === 0 && (
            <Button 
              onClick={handleCreateSampleCourse} 
              disabled={isCreatingSample}
              className="ml-4"
            >
              {isCreatingSample ? 'Creating...' : 'Create Sample Course'}
            </Button>
          )}
        </div>
      </section>

      {/* Filters and Search Section */}
      <section className="bg-card p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="lg:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-muted-foreground mb-1">Search Courses</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="search" type="search" placeholder="Search by category, title..." className="pl-9" />
            </div>
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
            <Select>
              <SelectTrigger id="category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="web-development">Web Development</SelectItem>
                <SelectItem value="web-design">Web Design</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="sort" className="block text-sm font-medium text-muted-foreground mb-1">Sort By</label>
            <Select>
              <SelectTrigger id="sort">
                <SelectValue placeholder="Newest" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {courses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
            ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-10">No courses found.</div>
      )}
    </div>
  );
}
