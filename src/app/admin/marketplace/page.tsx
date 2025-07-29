
"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { getAllAITools, deleteAITool } from '@/lib/mockData'; // Fetch tools using mock function
import type { AITool } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Edit, Trash2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function AdminAIToolsPage() {
  const [tools, setTools] = useState<AITool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

   useEffect(() => {
    // Fetch tools on mount
    // Simulate API call delay
    setTimeout(() => {
        setTools(getAllAITools());
        setIsLoading(false);
    }, 500); // 500ms delay
  }, []);

  const handleDeleteTool = (toolId: string, toolName: string) => {
    if(confirm(`Are you sure you want to delete the tool "${toolName}"? This action cannot be undone.`)) {
        console.log("Deleting AI tool:", toolId);
        const success = deleteAITool(toolId); // Use mock delete function
        if (success) {
            toast({ title: "AI Tool Deleted", description: `Tool "${toolName}" has been deleted.`, variant: "default" });
             // Update the local state to reflect the deletion
            setTools(prevTools => prevTools.filter(tool => tool.id !== toolId));
        } else {
            toast({ title: "Deletion Failed", description: `Could not delete tool "${toolName}".`, variant: "destructive" });
        }
    }
  };

   if (isLoading) {
      return <div className="text-center p-6">Loading AI tools...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage AI Tools Marketplace</h1>
        <Button asChild>
          <Link href="/admin/marketplace/new"><PlusCircle className="mr-2 h-4 w-4" /> Add New Tool</Link>
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
            <CardTitle>All AI Tools</CardTitle>
            <CardDescription>View, edit, or delete AI tools available in the marketplace.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="hidden md:table-cell">Price</TableHead>
                <TableHead className="hidden md:table-cell">Tags</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tools.map((tool) => (
                <TableRow key={tool.id}>
                    <TableCell className="hidden sm:table-cell">
                    <Image
                        alt={tool.name}
                        className="aspect-video rounded-md object-cover" // Use aspect-video for better proportions
                        height={45} // Adjust height/width for aspect ratio
                        src={tool.thumbnailUrl || "/tool-fallback.webp"} // Placeholder if no image
                        width={80}
                        data-ai-hint="tool thumbnail"
                    />
                    </TableCell>
                    <TableCell className="font-medium">{tool.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{tool.description}</TableCell>
                    <TableCell className="hidden md:table-cell">${tool.price.toFixed(2)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {tool.tags?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                        {(!tool.tags || tool.tags.length === 0) && <span className="text-xs text-muted-foreground italic">No tags</span>}
                      </div>
                    </TableCell>
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
                            <Link href={`/admin/marketplace/${tool.id}/edit`}><Edit className="mr-2 h-4 w-4" />Edit</Link>
                        </DropdownMenuItem>
                         <DropdownMenuItem asChild>
                            <Link href={tool.previewLink} target="_blank"><ExternalLink className="mr-2 h-4 w-4" />View Preview</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={() => handleDeleteTool(tool.id, tool.name)}
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
       {tools.length === 0 && !isLoading && (
        <p className="text-center text-muted-foreground py-4">No AI tools found in the marketplace.</p>
      )}
    </div>
  );
}


