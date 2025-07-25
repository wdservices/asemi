
"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { getAllExams, deleteExam } from '@/lib/mockData';
import type { Exam } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function AdminExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

   useEffect(() => {
    // Fetch exams on mount
    setTimeout(() => {
        setExams(getAllExams());
        setIsLoading(false);
    }, 500);
  }, []);

  const handleDeleteExam = (examId: string, examTitle: string) => {
    if(confirm(`Are you sure you want to delete the exam "${examTitle}"? This action cannot be undone.`)) {
        const success = deleteExam(examId);
        if (success) {
            toast({ title: "Exam Deleted", description: `Exam "${examTitle}" has been deleted.`, variant: "default" });
            setExams(prevExams => prevExams.filter(exam => exam.id !== examId));
        } else {
            toast({ title: "Deletion Failed", description: `Could not delete exam "${examTitle}".`, variant: "destructive" });
        }
    }
  };

   if (isLoading) {
      return <div className="text-center p-6">Loading exams...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage Exams</h1>
        <Button asChild>
          <Link href="/admin/exams/new"><PlusCircle className="mr-2 h-4 w-4" /> Add New Exam</Link>
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
            <CardTitle>All Exams</CardTitle>
            <CardDescription>View, edit, or delete exams and their questions.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">Image</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="hidden md:table-cell">Year</TableHead>
                <TableHead className="hidden md:table-cell">Questions</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {exams.map((exam) => (
                <TableRow key={exam.id}>
                    <TableCell className="hidden sm:table-cell">
                    <Image
                        alt={exam.title}
                        className="aspect-video rounded-md object-cover"
                        height="45"
                        src={exam.imageUrl || 'https://placehold.co/80x45.png'}
                        width="80"
                        data-ai-hint="exam subject"
                    />
                    </TableCell>
                    <TableCell className="font-medium">{exam.title}</TableCell>
                    <TableCell>
                        <Badge variant="outline">{exam.subject || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{exam.year || 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell">{exam.questions.length}</TableCell>
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
                            <Link href={`/admin/exams/${exam.id}/edit`}><Edit className="mr-2 h-4 w-4" />Edit</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={() => handleDeleteExam(exam.id, exam.title)}
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
       {exams.length === 0 && !isLoading && (
        <p className="text-center text-muted-foreground py-4">No exams found.</p>
      )}
    </div>
  );
}
