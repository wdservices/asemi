
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, X } from "lucide-react";
import type { Course, CourseFormData } from "@/lib/types";
import { getCourseById, updateCourse } from '@/lib/mockData';
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const lessonSchema = z.object({
  title: z.string().min(1, "Lesson title is required."),
  contentType: z.enum(['video', 'text', 'pdf', 'quiz']),
  content: z.string().min(1, "Content (URL or text) is required."),
  duration: z.string().optional(),
});

const moduleSchema = z.object({
  title: z.string().min(1, "Module title is required."),
  lessons: z.array(lessonSchema).min(1, "Module must have at least one lesson."),
});

const courseFormSchema = z.object({
  title: z.string().min(3, "Course title must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  category: z.string().min(1, "Category is required."),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'All Levels']),
  author: z.string().min(1, "Author is required."),
  price: z.coerce.number().min(0, "Price must be a positive number."),
  imageUrl: z.string().url().optional().or(z.literal('')),
  modules: z.array(moduleSchema).min(1, "Course must have at least one module."),
});

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      level: "Beginner",
      author: "",
      price: 0,
      imageUrl: "",
      modules: [],
    },
  });

  useEffect(() => {
    if (courseId) {
      const fetchCourse = async () => {
        setIsLoading(true);
        const fetchedCourse = await getCourseById(courseId);
        if (fetchedCourse) {
          setCourse(fetchedCourse);
          // Map modules and lessons for form, excluding IDs which are not in the form data type
          const formModules = fetchedCourse.modules.map(m => ({
            title: m.title,
            lessons: m.lessons.map(l => ({
              title: l.title,
              contentType: l.contentType,
              content: l.content,
              duration: l.duration || "",
            }))
          }));

          form.reset({ ...fetchedCourse, modules: formModules });
        } else {
          toast({ title: "Error", description: "Course not found.", variant: 'destructive' });
          router.push('/admin/courses');
        }
        setIsLoading(false);
      };
      fetchCourse();
    }
  }, [courseId, form, router, toast]);

  const { fields: moduleFields, append: appendModule, remove: removeModule } = useFieldArray({
    control: form.control,
    name: "modules",
  });

  async function onSubmit(values: CourseFormData) {
    const success = await updateCourse(courseId, values);
    if (success) {
      toast({
        title: "Course Updated",
        description: `The course "${values.title}" has been successfully updated.`,
      });
      router.push("/admin/courses");
    } else {
      toast({
        title: "Error",
        description: `Failed to update course "${values.title}".`,
        variant: 'destructive'
      });
    }
  }
  
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!course) {
    return <div>Course not found.</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Edit Course</h1>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Course Details</CardTitle>
            <CardDescription>Update the information for this course.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Course Title</FormLabel><FormControl><Input placeholder="e.g., Ultimate Next.js Course" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="author" render={({ field }) => (<FormItem><FormLabel>Author</FormLabel><FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>Category</FormLabel><FormControl><Input placeholder="e.g., Web Development" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Price ($)</FormLabel><FormControl><Input type="number" placeholder="e.g., 99.99" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="level" render={({ field }) => (<FormItem><FormLabel>Level</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Beginner">Beginner</SelectItem><SelectItem value="Intermediate">Intermediate</SelectItem><SelectItem value="Advanced">Advanced</SelectItem><SelectItem value="All Levels">All Levels</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="imageUrl" render={({ field }) => (<FormItem><FormLabel>Cover Image URL (Optional)</FormLabel><FormControl><Input type="url" placeholder="https://example.com/image.png" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="description" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="A brief summary of the course..." {...field} /></FormControl><FormMessage /></FormItem>)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modules & Lessons</CardTitle>
            <CardDescription>Structure your course content into modules and lessons.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {moduleFields.map((moduleField, mIndex) => (
              <Card key={moduleField.id} className="p-4 bg-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold">Module {mIndex + 1}</h4>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeModule(mIndex)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                </div>
                <FormField control={form.control} name={`modules.${mIndex}.title`} render={({ field }) => (<FormItem><FormLabel>Module Title</FormLabel><FormControl><Input placeholder="e.g., Getting Started" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <Separator className="my-4" />
                <h5 className="text-md font-medium">Lessons</h5>
                <LessonsFieldArray mIndex={mIndex} control={form.control} />
              </Card>
            ))}
            <Button type="button" variant="outline" onClick={() => appendModule({ title: "", lessons: [{ title: "", contentType: "video", content: "", duration: "" }] })}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Module
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 mt-8">
          <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : "Save Changes"}</Button>
        </div>
      </form>
    </Form>
  );
}

function LessonsFieldArray({ mIndex, control }: { mIndex: number, control: any }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `modules.${mIndex}.lessons`,
  });

  return (
    <div className="space-y-4">
      {fields.map((lessonField, lIndex) => (
        <Card key={lessonField.id} className="p-3 bg-background">
          <div className="flex justify-between items-center mb-3">
            <h6 className="text-sm font-semibold">Lesson {lIndex + 1}</h6>
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(lIndex)} className="h-7 w-7 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={control} name={`modules.${mIndex}.lessons.${lIndex}.title`} render={({ field }) => (<FormItem><FormLabel>Lesson Title</FormLabel><FormControl><Input placeholder="e.g., What is React?" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={control} name={`modules.${mIndex}.lessons.${lIndex}.duration`} render={({ field }) => (<FormItem><FormLabel>Duration</FormLabel><FormControl><Input placeholder="e.g., 10:45" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={control} name={`modules.${mIndex}.lessons.${lIndex}.contentType`} render={({ field }) => (<FormItem><FormLabel>Content Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="video">Video</SelectItem><SelectItem value="text">Text</SelectItem><SelectItem value="pdf">PDF</SelectItem><SelectItem value="quiz">Quiz</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={control} name={`modules.${mIndex}.lessons.${lIndex}.content`} render={({ field }) => (<FormItem><FormLabel>Content URL / Text</FormLabel><FormControl><Input placeholder="https://youtube.com/watch?v=..." {...field} /></FormControl><FormMessage /></FormItem>)} />
          </div>
        </Card>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => append({ title: "", contentType: "video", content: "", duration: "" })}>
        <PlusCircle className="mr-2 h-4 w-4" /> Add Lesson
      </Button>
    </div>
  );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-48" />
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                </div>
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                    <div className="md:col-span-2 space-y-2"><Skeleton className="h-4 w-1/6" /><Skeleton className="h-20 w-full" /></div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent>
                     <Skeleton className="h-40 w-full" />
                </CardContent>
            </Card>
        </div>
    )
}
