
"use client";

import { useState, useEffect } from 'react';
import { getAllCourses, createSampleCourse } from '@/lib/mockData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading courses...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-card p-8 rounded-xl shadow-xl border-2 border-primary/20">
          <p className="text-xl text-foreground mb-4">Please login to view courses.</p>
          <Button asChild className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
            <a href="/auth/login">Login Now</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-accent/5 to-background p-12 rounded-2xl shadow-xl border-2 border-primary/10 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="flex justify-between items-start relative z-10">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Explore Our Courses</h1>
            <p className="mt-3 text-lg text-muted-foreground max-w-2xl">Find the perfect course to practice and boost your skills. Start learning today!</p>
          </div>
          {courses.length === 0 && (
            <Button 
              onClick={handleCreateSampleCourse} 
              disabled={isCreatingSample}
              className="ml-4 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-lg hover:shadow-xl transition-all"
            >
              {isCreatingSample ? 'Creating...' : 'Create Sample Course'}
            </Button>
          )}
        </div>
      </section>

      {/* Filters and Search Section */}
      <section className="bg-card p-8 rounded-xl shadow-lg border-2 border-primary/10 hover:border-primary/20 transition-all duration-300">
        <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          Find Your Perfect Course
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
          <div className="lg:col-span-2">
            <label htmlFor="search" className="block text-sm font-semibold text-foreground mb-2">Search Courses</label>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground group-hover:text-primary transition-colors" />
              <Input 
                id="search" 
                type="search" 
                placeholder="Search by category, title..." 
                className="pl-10 h-11 border-2 border-primary/20 focus:border-primary transition-all" 
              />
            </div>
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-semibold text-foreground mb-2">Category</label>
            <Select>
              <SelectTrigger id="category" className="h-11 border-2 border-primary/20 hover:border-primary/40 transition-all">
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
            <label htmlFor="sort" className="block text-sm font-semibold text-foreground mb-2">Sort By</label>
            <Select>
              <SelectTrigger id="sort" className="h-11 border-2 border-primary/20 hover:border-primary/40 transition-all">
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

      {/* Courses Grid */}
      {courses.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Available Courses ({courses.length})</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course, index) => (
              <div 
                key={course.id} 
                className="animate-in fade-in slide-in-from-bottom-4 duration-700"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CourseCard course={course} />
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="text-center py-20">
          <div className="bg-card p-12 rounded-xl shadow-xl border-2 border-dashed border-primary/30 max-w-md mx-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-10 w-10 text-primary" />
            </div>
            <p className="text-xl font-semibold text-foreground mb-2">No courses found</p>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        </div>
      )}
    </div>
  );
}
