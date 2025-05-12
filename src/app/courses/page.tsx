
import { CourseList } from '@/components/courses/CourseList';
import { mockCourses } from '@/lib/mockData';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Filter, Search } from 'lucide-react';

export default function CoursesPage() {
  // In a real app, you'd fetch courses, possibly with filters/search query
  const courses = mockCourses;

  return (
    <div className="space-y-8">
      <section className="bg-card p-6 rounded-lg shadow">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Explore Our Courses</h1>
        <p className="mt-2 text-muted-foreground">Find the perfect course to boost your skills and career.</p>
      </section>

      {/* Filters and Search Section */}
      <section className="bg-card p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="lg:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-muted-foreground mb-1">Search Courses</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="search" type="search" placeholder="Search by keyword, title..." className="pl-9" />
            </div>
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
            <Select>
              <SelectTrigger id="category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="web-dev">Web Development</SelectItem>
                <SelectItem value="design">Web Design</SelectItem>
                <SelectItem value="data-science">Data Science</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="sort" className="block text-sm font-medium text-muted-foreground mb-1">Sort By</label>
            <Select>
              <SelectTrigger id="sort">
                <SelectValue placeholder="Popularity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popularity">Popularity</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
           {/* 
           <div className="lg:col-start-4">
             <Button className="w-full">
               <Filter className="mr-2 h-4 w-4" /> Apply Filters
             </Button>
           </div>
           */}
        </div>
      </section>

      <CourseList courses={courses} />
    </div>
  );
}