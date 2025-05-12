
// Note: The filename uses [courseId] but the content refers to it as a slug.
// For this example, courseId will be treated as the slug for fetching.
// In a real app, you might have separate id and slug fields.
"use client"; // For client-side data fetching and interactivity

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { Course, CourseModule, Lesson as LessonType } from '@/lib/types';
import { getCourseBySlug } from '@/lib/mockData'; // Using slug as ID for fetching
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Star, PlayCircle, Clock, BarChart, Users, FileText, Lock, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth-mock';
import { useToast } from '@/hooks/use-toast';

// Placeholder for Video Player
const VideoPlayer = ({ src, title }: { src: string, title: string }) => (
  <div className="aspect-video bg-muted rounded-lg overflow-hidden shadow-inner">
    <iframe
      width="100%"
      height="100%"
      src={src.includes("youtube.com/embed") ? src : `https://www.youtube.com/embed/${src}`} // Basic YouTube embed logic
      title={title}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      className="border-0"
    ></iframe>
  </div>
);


export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, login } = useAuth(); // Assuming login can set the user for demo purposes
  const courseSlug = typeof params.courseId === 'string' ? params.courseId : '';
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock enrollment check
  const isEnrolled = user?.enrolledCourseIds?.includes(course?.id || '') || false;


  useEffect(() => {
    if (courseSlug) {
      const fetchedCourse = getCourseBySlug(courseSlug);
      if (fetchedCourse) {
        setCourse(fetchedCourse);
      } else {
        // Handle course not found, e.g., redirect to 404 or show message
        router.push('/courses'); // Redirect to courses list for simplicity
      }
      setIsLoading(false);
    }
  }, [courseSlug, router]);

  const handleEnroll = () => {
    if (!user) {
      toast({ title: "Login Required", description: "Please login to enroll in this course.", variant: "destructive" });
      router.push(`/auth/login?redirect=/courses/${courseSlug}`);
      return;
    }
    // Mock enrollment logic
    if (course) {
       // In a real app, this would involve payment and backend update
      const updatedUser = { ...user, enrolledCourseIds: [...(user.enrolledCourseIds || []), course.id] };
      // This is a mock update; in a real app, useAuth would handle this via backend.
      // For demo, we can call a modified login function if it supports updating the user state.
      // Or, more simply, just show a success message and navigate.
      toast({ title: "Successfully Enrolled!", description: `You can now access ${course.title}.`, variant: "default" });
      router.push(`/learn/${course.slug}`);
    }
  };

  if (isLoading) {
    return <div className="container mx-auto max-w-screen-lg px-4 py-8 text-center">Loading course details...</div>;
  }

  if (!course) {
    return <div className="container mx-auto max-w-screen-lg px-4 py-8 text-center">Course not found.</div>;
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Main Content Column */}
      <div className="lg:col-span-2 space-y-8">
        {/* Course Header */}
        <section>
          {course.category && <Badge variant="outline" className="mb-2">{course.category}</Badge>}
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{course.title}</h1>
          <p className="mt-2 text-lg text-muted-foreground">{course.description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage src={course.instructor.avatarUrl} alt={course.instructor.name} data-ai-hint="instructor avatar" />
                <AvatarFallback>{course.instructor.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span>Created by <Link href={`/instructors/${course.instructor.id}`} className="font-medium text-primary hover:underline">{course.instructor.name}</Link></span>
            </div>
            {course.rating && (
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                <span>{course.rating.toFixed(1)} ({course.numberOfRatings} ratings)</span>
              </div>
            )}
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              <span>{/* Placeholder for student count e.g. 12,345 students */}</span>
            </div>
          </div>
        </section>

        <Separator />

        {/* Course Long Description / What you'll learn */}
        {course.longDescription && (
          <section>
            <h2 className="text-2xl font-semibold mb-3">What you'll learn</h2>
            <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: course.longDescription.replace(/\n/g, '<br />') }} />
          </section>
        )}
        
        <Separator />

        {/* Course Content / Modules */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Course Content</h2>
          <Accordion type="single" collapsible className="w-full bg-card p-4 rounded-lg shadow">
            {course.modules.map((module, moduleIndex) => (
              <AccordionItem value={`module-${module.id}`} key={module.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex justify-between w-full items-center pr-2">
                    <span className="font-medium text-left">{module.title}</span>
                    <span className="text-xs text-muted-foreground">{module.lessons.length} lessons</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 pt-2">
                    {module.lessons.map((lesson, lessonIndex) => (
                      <li key={lesson.id} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/50">
                        <div className="flex items-center">
                          {lesson.contentType === 'video' ? <PlayCircle className="h-5 w-5 mr-3 text-primary" /> : <FileText className="h-5 w-5 mr-3 text-primary" />}
                          <span className="text-sm">{lesson.title}</span>
                          {lesson.isPreviewable && !isEnrolled && (
                            <Badge variant="outline" className="ml-2 text-xs">Preview</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{lesson.duration}</span>
                          {(!lesson.isPreviewable && !isEnrolled) && <Lock className="h-4 w-4 text-muted-foreground" />}
                           {(lesson.isPreviewable || isEnrolled) && <CheckCircle className="h-4 w-4 text-green-500" />}
                        </div>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <Separator />
        
        {/* Instructor Section */}
        <section>
            <h2 className="text-2xl font-semibold mb-4">About the Instructor</h2>
            <div className="flex items-start gap-4 bg-card p-6 rounded-lg shadow">
                <Avatar className="h-20 w-20">
                    <AvatarImage src={course.instructor.avatarUrl} alt={course.instructor.name} data-ai-hint="instructor photo" />
                    <AvatarFallback>{course.instructor.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                    <h3 className="text-xl font-semibold text-primary">{course.instructor.name}</h3>
                    <p className="text-sm text-muted-foreground mb-1">{course.instructor.title}</p>
                    {course.instructor.bio && <p className="text-sm text-foreground mt-2">{course.instructor.bio}</p>}
                    {/* Add more instructor details like ratings, total students, courses by instructor link */}
                </div>
            </div>
        </section>

      </div>

      {/* Sidebar / CTA Column */}
      <aside className="lg:col-span-1 space-y-6 sticky top-24 h-fit"> {/* Added sticky and h-fit */}
        <Card className="shadow-xl">
          <div className="p-4">
            {course.previewVideoUrl ? (
              <VideoPlayer src={course.previewVideoUrl} title={`Preview: ${course.title}`} />
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <Image src={course.thumbnailUrl} alt={course.title} width={300} height={200} className="object-cover rounded-lg" data-ai-hint="course thumbnail" />
              </div>
            )}
          </div>
          <div className="p-6 pt-0">
            <h2 className="text-3xl font-bold text-primary mb-4">${course.price.toFixed(2)}</h2>
            
            {isEnrolled ? (
              <Button size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white" asChild>
                <Link href={`/learn/${course.slug}`}>Go to Course</Link>
              </Button>
            ) : (
              <Button size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleEnroll}>
                Enroll Now
              </Button>
            )}
            
            <Button variant="outline" size="lg" className="w-full mt-3">Add to Wishlist</Button> {/* Wishlist functionality is a placeholder */}
            
            <p className="text-xs text-muted-foreground text-center mt-4">30-Day Money-Back Guarantee</p>

            <div className="mt-6 space-y-3 text-sm">
              <h4 className="font-semibold text-foreground">This course includes:</h4>
              <ul className="space-y-1.5 text-muted-foreground">
                <li className="flex items-center"><Clock className="h-4 w-4 mr-2 text-primary" /> {course.duration || 'On-demand video'}</li>
                <li className="flex items-center"><FileText className="h-4 w-4 mr-2 text-primary" /> {course.totalLessons || 'Multiple'} lessons</li>
                <li className="flex items-center"><BarChart className="h-4 w-4 mr-2 text-primary" /> {course.level || 'All Levels'}</li>
                <li className="flex items-center"><Users className="h-4 w-4 mr-2 text-primary" /> Full lifetime access</li>
                {/* Add more features like certificate, downloadable resources etc. */}
              </ul>
            </div>
          </div>
        </Card>
      </aside>
    </div>
  );
}