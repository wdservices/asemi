
"use client"; // Need client component for hooks

import Image from 'next/image';
import Link from 'next/link';
import type { AITool } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '../ui/button';
import { ExternalLink, Eye, CheckCircle, ShoppingCart } from 'lucide-react'; // Added CheckCircle, ShoppingCart
import { useAuth } from '@/hooks/use-auth-mock'; // Import useAuth
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { addPurchasedToolToUser } from '@/lib/mockData'; // Import mock purchase function
import { useState, useEffect } from 'react'; // Import hooks


interface AIToolCardProps {
  tool: AITool;
}

export function AIToolCard({ tool }: AIToolCardProps) {
  const { user, updateUser } = useAuth(); // Get user and updateUser
  const { toast } = useToast();
  const [isPurchased, setIsPurchased] = useState(false);

  useEffect(() => {
      if (user && tool) {
          setIsPurchased(user.purchasedToolIds?.includes(tool.id) || false);
      } else {
          setIsPurchased(false);
      }
  }, [user, tool]);


  const handleMockPurchase = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Prevent default link behavior if it was an <a> tag
      // e.preventDefault();

      if (!user) {
          toast({ title: "Login Required", description: "Please login to purchase this tool.", variant: "destructive" });
          // Consider redirecting to login: router.push(`/auth/login?redirect=/marketplace`);
          return;
      }
      if (tool && user) {
          // MOCK: Simulate successful purchase
          const success = addPurchasedToolToUser(user.id, tool.id);
          if (success) {
              // Update the user state in the Auth context
              updateUser({ purchasedToolIds: [...(user.purchasedToolIds || []), tool.id] });
              toast({ title: "Tool Purchased (Mock)", description: `You now have access to ${tool.name}.`, variant: "default" });
              // Optionally redirect or let UI update
          } else {
              toast({ title: "Already Purchased", description: `You already own ${tool.name}.`, variant: "default" });
          }
      }
  };


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
         {isPurchased && (
           <div className="absolute top-2 right-2 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 z-10">
              <CheckCircle className="h-3 w-3" /> Owned
           </div>
        )}
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
            {!isPurchased && <span className="text-xl font-bold text-primary">${tool.price.toFixed(2)}</span>}
            {isPurchased && <span className="text-sm font-medium text-green-600">You own this tool</span>}
             <Button variant="outline" size="sm" asChild>
                <Link href={tool.previewLink} target="_blank" rel="noopener noreferrer">
                    <Eye className="mr-1.5 h-4 w-4" /> Preview
                </Link>
            </Button>
        </div>

        {isPurchased ? (
             <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                 <Link href={tool.redirectLink || '#'}> {/* Link to access page or placeholder */}
                     <ExternalLink className="mr-2 h-4 w-4" /> Access Tool
                 </Link>
             </Button>
        ) : tool.paymentLink ? (
            // Use an <a> tag for external payment link, but simulate purchase onClick for mock
            <Button
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={handleMockPurchase} // Simulate purchase on click for demo
                // In a real app, might be: asChild
            >
                 {/* In a real app:
                 <a href={tool.paymentLink} target="_blank" rel="noopener noreferrer">
                     <ShoppingCart className="mr-2 h-4 w-4" /> Purchase Tool
                 </a>
                 */}
                 {/* Mock Button Text: */}
                 <ShoppingCart className="mr-2 h-4 w-4" /> Purchase Tool (Mock)
             </Button>
        ) : (
            <Button className="w-full" disabled>Purchase Unavailable</Button>
        )}
      </CardFooter>
    </Card>
  );
}
