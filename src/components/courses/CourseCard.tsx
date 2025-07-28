
import Image from 'next/image';
import Link from 'next/link';
import type { Course } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '../ui/button';
import { BookOpen, BarChart, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  const isPublished = course.isPublished ?? true; // Default to published if undefined

  return (
    <Card className={cn(
      "flex flex-col h-full overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300",
      !isPublished && "opacity-60 bg-muted/30"
    )}>
      <Link href={isPublished ? `/learn/${course.slug}` : '#'} aria-disabled={!isPublished} className={cn("block", !isPublished && "pointer-events-none")}>
        <div className="relative w-full h-40 bg-muted">
          <Image
            src={course.imageUrl || 'https://placehold.co/400x200.png'}
            alt={course.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            data-ai-hint="course topic"
          />
           {!isPublished && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="flex items-center gap-2 text-white font-semibold">
                <EyeOff className="h-5 w-5" />
                <span>Unpublished</span>
              </div>
            </div>
          )}
        </div>
      </Link>
      <CardHeader className="p-4">
        <Badge variant="secondary" className="mb-2 w-fit">{course.category}</Badge>
        <Link href={isPublished ? `/learn/${course.slug}` : '#'} aria-disabled={!isPublished} className={cn("block", !isPublished && "pointer-events-none")}>
          <CardTitle className="text-md font-semibold hover:text-primary transition-colors line-clamp-2">
            {course.title}
          </CardTitle>
        </Link>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow">
          <div className="flex items-center text-xs text-muted-foreground space-x-4">
            <div className="flex items-center gap-1.5">
                <BookOpen className="h-3 w-3" />
                <span>{course.modules.reduce((acc, m) => acc + m.lessons.length, 0)} Lessons</span>
            </div>
            <div className="flex items-center gap-1.5">
                <BarChart className="h-3 w-3" />
                <span>{course.level}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">By {course.author}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button asChild={isPublished} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={!isPublished}>
          {isPublished ? (
            <Link href={`/learn/${course.slug}`}>Start Learning</Link>
          ) : (
            <span>Unavailable</span>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
