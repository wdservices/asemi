
import { AIToolCard } from '@/components/marketplace/AIToolCard';
import { getAllAITools } from '@/lib/mockData';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Filter, Search, Wand2 } from 'lucide-react';

export default function MarketplacePage() {
  // Defensive: always array
  const toolsRaw = getAllAITools();
  const tools = Array.isArray(toolsRaw) ? toolsRaw : [];

  return (
    <div className="space-y-8">
      <section className="bg-card p-6 rounded-lg shadow">
        <div className="flex items-center gap-3 mb-2">
           <Wand2 className="h-8 w-8 text-primary" />
           <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Tools Marketplace</h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          Explore powerful AI tools to enhance your workflow. Basic customization (logo, brand colors) is included with purchase.
        </p>
      </section>

      {/* Filters and Search Section */}
      <section className="bg-card p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="lg:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-muted-foreground mb-1">Search Tools</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="search" type="search" placeholder="Search by name, tag..." className="pl-9" />
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
                {/* Dynamically generate categories from tags in a real app */}
                <SelectItem value="content">Content Creation</SelectItem>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="productivity">Productivity</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
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

      {/* AI Tool List */}
      {tools.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <AIToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      ) : (
         <p className="text-center text-muted-foreground py-10">No AI tools found matching your criteria.</p>
      )}
    </div>
  );
}
