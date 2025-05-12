
"use client";
import Link from 'next/link';
import Image from 'next/image';
import { mockCourses } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Edit, Trash2, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function AdminCoursesPage() {
  const courses = mockCourses; // In a real app, fetch courses from backend
  const { toast } = useToast();

  const handleDeleteCourse = (courseId: string, courseTitle: string) => {
    // Placeholder for delete functionality
    if(confirm(`Are you sure you want to delete the course "${courseTitle}"? This action cannot be undone.`)) {
        console.log("Deleting course:", courseId);
        toast({ title: "Course Deleted (Mock)", description: `Course "${courseTitle}" has been deleted.`, variant: "default" });
        // Here you would typically refetch courses or update local state
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage Courses</h1>
        <Button asChild>
          <Link href="/admin/courses/new"><PlusCircle className="mr-2 h-4 w-4" /> Add New Course</Link>
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
            <CardTitle>All Courses</CardTitle>
            <CardDescription>View, edit, or delete courses on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">Image</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="hidden md:table-cell">Price</TableHead>
                <TableHead className="hidden md:table-cell">Instructor</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {courses.map((course) => (
                <TableRow key={course.id}>
                    <TableCell className="hidden sm:table-cell">
                    <Image
                        alt={course.title}
                        className="aspect-square rounded-md object-cover"
                        height="64"
                        src={course.thumbnailUrl}
                        width="64"
                        data-ai-hint="course thumbnail"
                    />
                    </TableCell>
                    <TableCell className="font-medium">
                        <Link href={`/courses/${course.slug}`} className="hover:underline" target="_blank" title="View course page (public)">
                            {course.title}
                        </Link>
                    </TableCell>
                    <TableCell>
                        <Badge variant="outline">{course.category || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">${course.price.toFixed(2)}</TableCell>
                    <TableCell className="hidden md:table-cell">{course.instructor.name}</TableCell>
                    <TableCell>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                            <Link href={`/admin/courses/${course.id}/edit`}><Edit className="mr-2 h-4 w-4" />Edit</Link>
                        </DropdownMenuItem>
                         <DropdownMenuItem asChild>
                            <Link href={`/courses/${course.slug}`} target="_blank"><Eye className="mr-2 h-4 w-4" />View Public Page</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={() => handleDeleteCourse(course.id, course.title)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />Delete
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </CardContent>
      </Card>
       {courses.length === 0 && (
        <p className="text-center text-muted-foreground py-4">No courses found.</p>
      )}
    </div>
  );
}