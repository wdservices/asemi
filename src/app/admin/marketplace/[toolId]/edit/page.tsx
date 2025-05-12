
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { AITool, AIToolFormDataInput } from '@/lib/types';
import { getAIToolById, updateAITool } from '@/lib/mockData'; // Using mock functions

// Reuse the schema from the 'new' page
const aiToolFormSchema = z.object({
  name: z.string().min(3, { message: "Tool name must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  price: z.coerce.number().min(0, { message: "Price cannot be negative." }),
  thumbnailUrl: z.string().url({ message: "Please enter a valid URL for the thumbnail." }),
  previewLink: z.string().url({ message: "Please enter a valid URL for the preview link." }),
  tags: z.string().optional(), // Comma-separated string from input
  paymentLink: z.string().url({ message: "Please enter a valid payment URL." }).optional().or(z.literal('')),
  redirectLink: z.string().url({ message: "Please enter a valid redirect URL." }).optional().or(z.literal('')),
});

export default function EditAIToolPage() {
  const router = useRouter();
  const params = useParams();
  const toolId = typeof params.toolId === 'string' ? params.toolId : '';
  const { toast } = useToast();
  const [tool, setTool] = useState<AITool | null>(null);
  const [isLoading, setIsLoading] = useState(true);

   const form = useForm<AIToolFormDataInput>({
    resolver: zodResolver(aiToolFormSchema),
    // Default values will be set by useEffect once tool data is fetched
  });

  useEffect(() => {
    if (toolId) {
      // Simulate API call delay
      setTimeout(() => {
          const fetchedTool = getAIToolById(toolId);
          if (fetchedTool) {
            setTool(fetchedTool);
            form.reset({
                name: fetchedTool.name,
                description: fetchedTool.description,
                price: fetchedTool.price,
                thumbnailUrl: fetchedTool.thumbnailUrl,
                previewLink: fetchedTool.previewLink,
                tags: fetchedTool.tags?.join(', ') || '',
                paymentLink: fetchedTool.paymentLink || '',
                redirectLink: fetchedTool.redirectLink || '',
            });
          } else {
            toast({ title: "Error", description: "AI Tool not found.", variant: "destructive" });
            router.push("/admin/marketplace");
          }
          setIsLoading(false);
      }, 500); // 500ms delay
    }
  }, [toolId, form, router, toast]);


  async function onSubmit(values: AIToolFormDataInput) {
    console.log("Updated AI tool data (from form):", values);
     // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const updated = updateAITool(toolId, values); // Use mock update function
    if (updated) {
        toast({
          title: "AI Tool Updated (Mock)",
          description: `The tool "${values.name}" has been successfully updated.`,
        });
        router.push("/admin/marketplace");
    } else {
         toast({
          title: "Update Failed",
          description: `Could not update the tool "${values.name}".`,
          variant: "destructive",
        });
    }
  }

   if (isLoading) {
    return <div className="flex items-center justify-center h-full"><p>Loading tool data...</p></div>;
  }

  if (!tool) {
     // Message should be handled by the redirect in useEffect, but added as fallback
    return <div className="flex items-center justify-center h-full"><p>Tool not found.</p></div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Edit AI Tool: {tool.name}</h1>
            <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
            </div>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Tool Information</CardTitle>
                <CardDescription>Modify the details for the AI tool.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Tool Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormDescription>Mention included customization options (e.g., color, brand name).</FormDescription><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Price ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="thumbnailUrl" render={({ field }) => (<FormItem><FormLabel>Thumbnail URL</FormLabel><FormControl><Input type="url" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="previewLink" render={({ field }) => (<FormItem><FormLabel>Preview Link</FormLabel><FormControl><Input type="url" {...field} /></FormControl><FormDescription>Link to a live demo or video.</FormDescription><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="tags" render={({ field }) => (<FormItem><FormLabel>Tags</FormLabel><FormControl><Input {...field} /></FormControl><FormDescription>Comma-separated values.</FormDescription><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="paymentLink" render={({ field }) => (<FormItem><FormLabel>Payment Link (Optional)</FormLabel><FormControl><Input type="url" placeholder="https://buy.stripe.com/..." {...field} /></FormControl><FormDescription>External link for purchase.</FormDescription><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="redirectLink" render={({ field }) => (<FormItem><FormLabel>Post-Payment Redirect Link (Optional)</FormLabel><FormControl><Input type="url" placeholder="/tools/your-tool-id/access" {...field} /></FormControl><FormDescription>Where users land after buying.</FormDescription><FormMessage /></FormItem>)} />
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
