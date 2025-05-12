
import Image from 'next/image';
import Link from 'next/link';
import type { AITool } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '../ui/button';
import { ExternalLink, Eye } from 'lucide-react';

interface AIToolCardProps {
  tool: AITool;
}

export function AIToolCard({ tool }: AIToolCardProps) {
  return (
    <Card className="flex flex-col h-full overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card">
      <div className="relative w-full h-48">
        <Image
          src={tool.thumbnailUrl}
          alt={tool.name}
          layout="fill"
          objectFit="cover"
          data-ai-hint="tool thumbnail"
        />
      </div>
      <CardHeader className="p-4">
         <CardTitle className="text-lg font-semibold text-foreground">
            {tool.name}
          </CardTitle>
          {tool.tags && tool.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
                {tool.tags.slice(0, 3).map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
            </div>
           )}
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-4">{tool.description}</p>
        <p className="text-xs text-muted-foreground/80 mt-2">
            * Includes basic customization (logo, brand color).
        </p>
      </CardContent>
      <CardFooter className="p-4 pt-2 flex flex-col items-start space-y-3 border-t border-border/50 mt-auto">
        <div className="flex items-center justify-between w-full text-sm">
            <span className="text-xl font-bold text-primary">${tool.price.toFixed(2)}</span>
             <Button variant="outline" size="sm" asChild>
                <Link href={tool.previewLink} target="_blank" rel="noopener noreferrer">
                    <Eye className="mr-1.5 h-4 w-4" /> Preview
                </Link>
            </Button>
        </div>
        <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
            {/* Link to purchase page or contact form */}
          <Link href={`/marketplace/tool/${tool.id}/purchase`}> {/* Placeholder Link */}
             View Details / Purchase
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

