
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { AIToolFormDataInput } from "@/lib/types"; // Use the input type for the form
import { addAITool } from '@/lib/mockData'; // Using mock function to add tool

const aiToolFormSchema = z.object({
  name: z.string().min(3, { message: "Tool name must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  price: z.coerce.number().min(0, { message: "Price cannot be negative." }),
  thumbnailUrl: z.string().url({ message: "Please enter a valid URL for the thumbnail." }),
  previewLink: z.string().url({ message: "Please enter a valid URL for the preview link." }),
  tags: z.string().optional(), // Comma-separated string from input
});

export default function NewAIToolPage() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<AIToolFormDataInput>({ // Use AIToolFormDataInput
    resolver: zodResolver(aiToolFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      thumbnailUrl: "",
      previewLink: "",
      tags: "",
    },
  });

  async function onSubmit(values: AIToolFormDataInput) { // values are AIToolFormDataInput
    console.log("New AI tool data (from form):", values);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    addAITool(values); // Pass the form data directly to the mock function

    toast({
      title: "AI Tool Added (Mock)",
      description: `The tool "${values.name}" has been successfully added to the marketplace.`,
    });
    router.push("/admin/marketplace"); // Redirect to the tools list page
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Add New AI Tool</h1>
            <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Saving..." : "Save Tool"}
                </Button>
            </div>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Tool Information</CardTitle>
                <CardDescription>Enter the details for the new AI tool.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tool Name</FormLabel>
                            <FormControl><Input placeholder="e.g., AI Image Generator" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl><Textarea rows={4} placeholder="Describe the tool and its features..." {...field} /></FormControl>
                            <FormDescription>Mention included customization options (e.g., color, brand name).</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Price ($)</FormLabel>
                            <FormControl><Input type="number" step="0.01" placeholder="e.g., 199.00" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="thumbnailUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Thumbnail URL</FormLabel>
                            <FormControl><Input type="url" placeholder="https://example.com/thumbnail.jpg" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="previewLink"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Preview Link</FormLabel>
                            <FormControl><Input type="url" placeholder="https://example.com/preview" {...field} /></FormControl>
                            <FormDescription>Link to a live demo or video.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tags</FormLabel>
                            <FormControl><Input placeholder="e.g., productivity, code, design" {...field} /></FormControl>
                            <FormDescription>Comma-separated values.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>

        <div className="flex justify-end gap-2 mt-8">
            <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Tool"}
            </Button>
        </div>
      </form>
    </Form>
  );
}

