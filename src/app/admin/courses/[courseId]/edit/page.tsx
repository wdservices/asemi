
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, X } from "lucide-react";
import type { Course, CourseFormData } from "@/lib/types";
import { getCourseById, updateCourse } from '@/lib/mockData'; // Use updateCourse mock function
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox


// Schemas (can be imported from new/page.tsx or a shared file)
const lessonSchema = z.object({
  id: z.string().optional(), // existing lessons will have an id
  title: z.string().min(1, "Lesson title is required."),
  contentType: z.enum(["video", "pdf", "text", "quiz"]),
  content: z.string().min(1, "Content/URL is required."),
  duration: z.string().optional(),
  isPreviewable: z.boolean().default(false),
  lessonOrder: z.number().min(0),
  // downloadableResources: z.array(...) // Add if needed
});

const moduleSchema = z.object({
  id: z.string().optional(), // existing modules will have an id
  title: z.string().min(1, "Module title is required."),
  moduleOrder: z.number().min(0),
  lessons: z.array(lessonSchema).min(1, "Each module must have at least one lesson."),
});

const courseFormSchema = z.object({
  title: z.string().min(3, { message: "Course title must be at least 3 characters." }),
  slug: z.string().min(3, { message: "Slug must be at least 3 characters." }).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens."),
  description: z.string().min(10, { message: "Short description must be at least 10 characters." }),
  longDescription: z.string().optional(),
  thumbnailUrl: z.string().url({ message: "Please enter a valid URL for the thumbnail." }),
  price: z.coerce.number().min(0, { message: "Price cannot be negative." }),
  category: z.string().optional(),
  level: z.enum(["Beginner", "Intermediate", "Advanced", "All Levels"]).optional(),
  tags: z.string().optional(), // Comma-separated
  instructorName: z.string().min(2, "Instructor name is required."),
  instructorBio: z.string().optional(),
  instructorTitle: z.string().optional(),
  previewVideoUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  paymentLink: z.string().url({ message: "Please enter a valid payment URL." }).optional().or(z.literal('')),
  redirectLink: z.string().url({ message: "Please enter a valid redirect URL." }).optional().or(z.literal('')),
  modules: z.array(moduleSchema).min(1, "Course must have at least one module."),
});


export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = typeof params.courseId === 'string' ? params.courseId : '';
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseFormSchema),
    // Default values will be set by useEffect once course data is fetched
  });

  useEffect(() => {
    if (courseId) {
      const fetchedCourse = getCourseById(courseId); // Use getCourseById
      if (fetchedCourse) {
        setCourse(fetchedCourse);
        form.reset({
          title: fetchedCourse.title,
          slug: fetchedCourse.slug,
          description: fetchedCourse.description,
          longDescription: fetchedCourse.longDescription || "",
          thumbnailUrl: fetchedCourse.thumbnailUrl,
          price: fetchedCourse.price,
          category: fetchedCourse.category || "",
          level: fetchedCourse.level || "All Levels",
          tags: fetchedCourse.tags?.join(',') || "",
          instructorName: fetchedCourse.instructor.name,
          instructorBio: fetchedCourse.instructor.bio || "",
          instructorTitle: fetchedCourse.instructor.title || "",
          previewVideoUrl: fetchedCourse.previewVideoUrl || "",
          paymentLink: fetchedCourse.paymentLink || "",
          redirectLink: fetchedCourse.redirectLink || "",
          modules: fetchedCourse.modules.map(m => ({
            id: m.id, // Keep existing IDs
            title: m.title,
            moduleOrder: m.moduleOrder,
            lessons: m.lessons.map(l => ({
              id: l.id, // Keep existing IDs
              title: l.title,
              contentType: l.contentType,
              content: l.content,
              duration: l.duration || "",
              isPreviewable: l.isPreviewable || false,
              lessonOrder: l.lessonOrder,
            }))
          })),
        });
      } else {
        toast({ title: "Error", description: "Course not found.", variant: "destructive" });
        router.push("/admin/courses");
      }
      setIsLoading(false);
    }
  }, [courseId, form, router, toast]);


  const { fields: moduleFields, append: appendModule, remove: removeModule } = useFieldArray({
    control: form.control,
    name: "modules",
  });

  async function onSubmit(values: CourseFormData) {
    console.log("Updated course data:", values);
    // Use mock function to update the course
    const updated = updateCourse(courseId, values);
    if (updated) {
        toast({
          title: "Course Updated (Mock)",
          description: `The course "${values.title}" has been successfully updated.`,
        });
        router.push("/admin/courses");
    } else {
         toast({
          title: "Update Failed",
          description: `Could not update the course "${values.title}".`,
          variant: "destructive",
        });
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><p>Loading course data...</p></div>;
  }

  if (!course) {
    return <div className="flex items-center justify-center h-full"><p>Course not found.</p></div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Edit Course: {course.title}</h1>
            <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
            </div>
        </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Course Info Column */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Course Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="slug" render={({ field }) => (<FormItem><FormLabel>Slug</FormLabel><FormControl><Input {...field} /></FormControl><FormDescription>Unique, URL-friendly identifier.</FormDescription><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Short Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="longDescription" render={({ field }) => (<FormItem><FormLabel>Full Description (What you'll learn)</FormLabel><FormControl><Textarea rows={6} {...field} /></FormControl><FormMessage /></FormItem>)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Instructor Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="instructorName" render={({ field }) => (<FormItem><FormLabel>Instructor Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="instructorTitle" render={({ field }) => (<FormItem><FormLabel>Instructor Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="instructorBio" render={({ field }) => (<FormItem><FormLabel>Instructor Bio</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Column for Pricing, Media, etc. */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Pricing & Meta</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Price ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="level" render={({ field }) => (<FormItem><FormLabel>Level</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Beginner">Beginner</SelectItem><SelectItem value="Intermediate">Intermediate</SelectItem><SelectItem value="Advanced">Advanced</SelectItem><SelectItem value="All Levels">All Levels</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="tags" render={({ field }) => (<FormItem><FormLabel>Tags</FormLabel><FormControl><Input {...field} /></FormControl><FormDescription>Comma-separated values.</FormDescription><FormMessage /></FormItem>)} />
              </CardContent>
            </Card>
             <Card>
                <CardHeader><CardTitle>Media & Links</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <FormField control={form.control} name="thumbnailUrl" render={({ field }) => (<FormItem><FormLabel>Thumbnail URL</FormLabel><FormControl><Input type="url" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="previewVideoUrl" render={({ field }) => (<FormItem><FormLabel>Preview Video URL (Optional)</FormLabel><FormControl><Input type="url" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="paymentLink" render={({ field }) => (<FormItem><FormLabel>Payment Link (Optional)</FormLabel><FormControl><Input type="url" placeholder="https://buy.stripe.com/..." {...field} /></FormControl><FormDescription>External link for purchase.</FormDescription><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="redirectLink" render={({ field }) => (<FormItem><FormLabel>Post-Payment Redirect Link (Optional)</FormLabel><FormControl><Input type="url" placeholder="/learn/your-course-slug" {...field} /></FormControl><FormDescription>Where users land after buying.</FormDescription><FormMessage /></FormItem>)} />
                </CardContent>
            </Card>
          </div>
        </div>


        {/* Modules and Lessons Section */}
        <Card>
          <CardHeader>
            <CardTitle>Course Structure (Modules & Lessons)</CardTitle>
            <CardDescription>Organize your course content into modules and lessons.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {moduleFields.map((moduleField, moduleIndex) => (
              <Card key={moduleField.id} className="p-4 bg-secondary/30">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-semibold">Module {moduleIndex + 1}</h4>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeModule(moduleIndex)} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {/* Hidden field for existing module ID if it exists */}
                <FormField control={form.control} name={`modules.${moduleIndex}.id`} render={({ field }) => (<FormItem className="hidden"><FormControl><Input type="hidden" {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name={`modules.${moduleIndex}.title`} render={({ field }) => (<FormItem><FormLabel>Module Title</FormLabel><FormControl><Input placeholder={`Module ${moduleIndex + 1} Title`} {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name={`modules.${moduleIndex}.moduleOrder`} render={({ field }) => (<FormItem className="hidden"><FormControl><Input type="hidden" {...field} value={moduleIndex} /></FormControl></FormItem>)} />
                <Separator className="my-4" />
                <h5 className="text-md font-medium mb-2">Lessons</h5>
                <EditLessonsFieldArray moduleIndex={moduleIndex} control={form.control} />
              </Card>
            ))}
            <Button type="button" variant="outline" onClick={() => appendModule({ title: "", moduleOrder: moduleFields.length, lessons: [{ title: "", contentType: "video", content: "", lessonOrder: 0, isPreviewable: false }] })}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Module
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 mt-8">
            <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
        </div>
      </form>
    </Form>
  );
}

// Helper component for lessons field array
function EditLessonsFieldArray({ moduleIndex, control }: { moduleIndex: number; control: any }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `modules.${moduleIndex}.lessons`,
  });

  return (
    <div className="space-y-4">
      {fields.map((lessonField, lessonIndex) => (
        <div key={lessonField.id} className="p-3 border rounded-md bg-card space-y-3 relative">
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(lessonIndex)} className="absolute top-1 right-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
          <p className="text-sm font-medium">Lesson {lessonIndex + 1}</p>
          {/* Hidden field for existing lesson ID */}
          <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.id`} render={({ field }) => (<FormItem className="hidden"><FormControl><Input type="hidden" {...field} /></FormControl></FormItem>)} />
          <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.title`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Lesson Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.lessonOrder`} render={({ field }) => (<FormItem className="hidden"><FormControl><Input type="hidden" {...field} value={lessonIndex} /></FormControl></FormItem>)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.contentType`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Content Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="video">Video</SelectItem><SelectItem value="pdf">PDF</SelectItem><SelectItem value="text">Text</SelectItem><SelectItem value="quiz">Quiz</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.content`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Content / URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center"> {/* Use items-center for checkbox alignment */}
            <FormField control={control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.duration`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Duration (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
             {/* Use Checkbox component and adjust FormItem structure */}
            <FormField
              control={control}
              name={`modules.${moduleIndex}.lessons.${lessonIndex}.isPreviewable`}
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-3 shadow-sm mt-5 h-[58px]"> {/* Adjust height/padding */}
                  <FormControl>
                      {/* Pass checked state and onCheckedChange */}
                      <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                      />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                      <FormLabel className="text-xs">Allow Preview?</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => append({ title: "", contentType: "video", content: "", lessonOrder: fields.length, isPreviewable: false })}>
        <PlusCircle className="mr-2 h-3 w-3" /> Add Lesson
      </Button>
    </div>
  );
}
