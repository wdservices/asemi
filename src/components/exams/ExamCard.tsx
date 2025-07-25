
import Image from 'next/image';
import Link from 'next/link';
import type { Exam } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '../ui/button';
import { FileText, Calendar } from 'lucide-react';

interface ExamCardProps {
  exam: Exam;
}

export function ExamCard({ exam }: ExamCardProps) {
  return (
    <Card className="flex flex-col h-full overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
      <Link href={`/exams/${exam.id}`} className="block">
        <div className="relative w-full h-40 bg-muted">
          <Image
            src={exam.imageUrl || 'https://placehold.co/400x200.png'}
            alt={exam.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            data-ai-hint="exam subject"
          />
        </div>
      </Link>
      <CardHeader className="p-4">
        <Badge variant="secondary" className="mb-2 w-fit">{exam.subject}</Badge>
        <Link href={`/exams/${exam.id}`} className="block">
          <CardTitle className="text-md font-semibold hover:text-primary transition-colors line-clamp-2">
            {exam.title}
          </CardTitle>
        </Link>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow">
          <div className="flex items-center text-xs text-muted-foreground space-x-4">
            <div className="flex items-center gap-1.5">
                <FileText className="h-3 w-3" />
                <span>{exam.questions.length} Questions</span>
            </div>
            {exam.year && (
                 <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    <span>{exam.year}</span>
                </div>
            )}
          </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href={`/exams/${exam.id}`}>Start Practice</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
