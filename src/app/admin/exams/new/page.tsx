
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, X } from "lucide-react";
import type { ExamFormData } from "@/lib/types";
import { addExam } from '@/lib/mockData';

const optionSchema = z.object({
  text: z.string().min(1, "Option text cannot be empty."),
});

const questionSchema = z.object({
  text: z.string().min(1, "Question text is required."),
  imageUrl: z.string().url().optional().or(z.literal('')),
  options: z.array(optionSchema).min(2, "Must have at least two options."),
  correctOptionIndex: z.coerce.number().min(0, "You must select a correct answer."),
  explanation: z.string().optional(),
});

const examFormSchema = z.object({
  title: z.string().min(3, { message: "Exam title must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  subject: z.string().min(1, "Subject is required."),
  year: z.coerce.number().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  questions: z.array(questionSchema).min(1, "Exam must have at least one question."),
});


export default function NewExamPage() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<ExamFormData>({
    resolver: zodResolver(examFormSchema),
    defaultValues: {
      title: "",
      description: "",
      subject: "",
      year: new Date().getFullYear(),
      imageUrl: "",
      questions: [{ text: "", options: [{ text: "" }, { text: "" }], correctOptionIndex: -1, explanation: "" }],
    },
  });

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  async function onSubmit(values: ExamFormData) {
    console.log("New exam data:", values);
    addExam(values);
    toast({
      title: "Exam Created (Mock)",
      description: `The exam "${values.title}" has been successfully created.`,
    });
    router.push("/admin/exams");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Add New Exam</h1>
            <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Saving..." : "Save Exam"}
                </Button>
            </div>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Exam Details</CardTitle>
                <CardDescription>Provide the basic information for this exam.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Exam Title</FormLabel><FormControl><Input placeholder="e.g., JAMB 2024 Use of English" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="subject" render={({ field }) => (<FormItem><FormLabel>Subject</FormLabel><FormControl><Input placeholder="e.g., Mathematics" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="year" render={({ field }) => (<FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" placeholder="e.g., 2024" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="imageUrl" render={({ field }) => (<FormItem><FormLabel>Cover Image URL (Optional)</FormLabel><FormControl><Input type="url" placeholder="https://example.com/image.png" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="description" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="A brief summary of the exam..." {...field} /></FormControl><FormMessage /></FormItem>)} />
            </CardContent>
        </Card>


        {/* Questions Section */}
        <Card>
          <CardHeader>
            <CardTitle>Questions</CardTitle>
            <CardDescription>Add questions and options for this exam.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {questionFields.map((questionField, qIndex) => (
              <Card key={questionField.id} className="p-4 bg-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold">Question {qIndex + 1}</h4>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-4">
                    <FormField control={form.control} name={`questions.${qIndex}.text`} render={({ field }) => (<FormItem><FormLabel>Question Text</FormLabel><FormControl><Textarea placeholder="What is the capital of Nigeria?" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name={`questions.${qIndex}.imageUrl`} render={({ field }) => (<FormItem><FormLabel>Image URL (Optional)</FormLabel><FormControl><Input type="url" placeholder="https://example.com/diagram.png" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    
                    <Separator />
                    <h5 className="text-md font-medium">Options</h5>
                    <p className="text-sm text-muted-foreground">Provide the options for this question and select the correct one.</p>
                    <QuestionsFieldArray qIndex={qIndex} control={form.control} />
                    
                    <Separator />
                     <FormField control={form.control} name={`questions.${qIndex}.explanation`} render={({ field }) => (<FormItem><FormLabel>Explanation (Optional)</FormLabel><FormControl><Textarea placeholder="Provide a brief explanation for the correct answer." {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
              </Card>
            ))}
            <Button type="button" variant="outline" onClick={() => appendQuestion({ text: "", options: [{ text: "" }, { text: "" }], correctOptionIndex: -1, explanation: "" })}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Question
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 mt-8">
            <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Exam"}
            </Button>
        </div>
      </form>
    </Form>
  );
}


// Helper component for questions field array
function QuestionsFieldArray({ qIndex, control }: { qIndex: number; control: any }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `questions.${qIndex}.options`,
  });

  return (
    <FormField
      control={control}
      name={`questions.${qIndex}.correctOptionIndex`}
      render={({ field }) => (
        <FormItem className="space-y-3">
          <FormControl>
            <RadioGroup
              onValueChange={(value) => field.onChange(parseInt(value, 10))}
              className="space-y-2"
            >
              {fields.map((optionField, oIndex) => (
                <div key={optionField.id} className="flex items-center gap-2">
                    <RadioGroupItem value={oIndex.toString()} id={`q${qIndex}-o${oIndex}`} />
                    <FormField
                        control={control}
                        name={`questions.${qIndex}.options.${oIndex}.text`}
                        render={({ field: optionField }) => (
                            <FormControl>
                                <Input {...optionField} placeholder={`Option ${String.fromCharCode(65 + oIndex)}`} className="flex-1" />
                            </FormControl>
                        )}
                    />
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(oIndex)} className="text-muted-foreground hover:text-destructive h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
