

import { getAllExams } from '@/lib/mockData';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { ExamCard } from '@/components/exams/ExamCard';
import type { Exam } from '@/lib/types';

export default function ExamsPage() {
  // Defensive: always array
  const exams: Exam[] = Array.isArray(getAllExams()) ? getAllExams() : [];

  return (
    <div className="space-y-8">
      <section className="bg-card p-6 rounded-lg shadow">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Explore Our Exams</h1>
        <p className="mt-2 text-muted-foreground">Find the perfect exam to practice and boost your skills.</p>
      </section>

      {/* Filters and Search Section */}
      <section className="bg-card p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="lg:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-muted-foreground mb-1">Search Exams</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="search" type="search" placeholder="Search by subject, title..." className="pl-9" />
            </div>
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-muted-foreground mb-1">Subject</label>
            <Select>
              <SelectTrigger id="category">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                <SelectItem value="chemistry">Chemistry</SelectItem>
                <SelectItem value="mathematics">Mathematics</SelectItem>
                <SelectItem value="physics">Physics</SelectItem>
                <SelectItem value="english">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="sort" className="block text-sm font-medium text-muted-foreground mb-1">Sort By</label>
            <Select>
              <SelectTrigger id="sort">
                <SelectValue placeholder="Newest" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {exams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {exams.map((exam) => (
                <ExamCard key={exam.id} exam={exam} />
            ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-10">No exams found.</div>
      )}
    </div>
  );
}
