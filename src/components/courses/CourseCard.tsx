
import Image from 'next/image';
import Link from 'next/link';
import type { Course } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Users } from 'lucide-react';
import { Button } from '../ui/button';

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Card className="flex flex-col h-full overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
      <Link href={`/courses/${course.slug}`} className="block">
        <div className="relative w-full h-48">
          <Image
            src={course.thumbnailUrl}
            alt={course.title}
            layout="fill"
            objectFit="cover"
            data-ai-hint="course thumbnail"
          />
        </div>
      </Link>
      <CardHeader className="p-4">
        {course.category && (
          <Badge variant="secondary" className="mb-2 w-fit">{course.category}</Badge>
        )}
        <Link href={`/courses/${course.slug}`} className="block">
          <CardTitle className="text-lg font-semibold hover:text-primary transition-colors">
            {course.title}
          </CardTitle>
        </Link>
        <p className="text-xs text-muted-foreground mt-1">By {course.instructor.name}</p>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-3">{course.description}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex flex-col items-start space-y-3">
        <div className="flex items-center justify-between w-full text-sm">
          <div className="flex items-center">
            {course.rating && (
              <>
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                <span>{course.rating.toFixed(1)}</span>
                <span className="text-muted-foreground ml-1">({course.numberOfRatings || 0})</span>
              </>
            )}
          </div>
          <span className="text-lg font-semibold text-primary">${course.price.toFixed(2)}</span>
        </div>
        <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href={`/courses/${course.slug}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}