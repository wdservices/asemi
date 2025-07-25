
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAIToolById } from '@/lib/mockData';
import type { AITool } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, ArrowLeft } from 'lucide-react';

export default function AIToolAccessPage() {
    const params = useParams();
    const router = useRouter();
    const { user, userProfile, loading } = useAuth();
    const toolId = typeof params.toolId === 'string' ? params.toolId : '';
    const [tool, setTool] = useState<AITool | null>(null);
    const [isLoadingTool, setIsLoadingTool] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        if (toolId) {
            const fetchedTool = getAIToolById(toolId);
            setTool(fetchedTool || null);
        }
        setIsLoadingTool(false);
    }, [toolId]);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push(`/auth/login?redirect=/tools/${toolId}/access`);
            } else if (tool && userProfile?.purchasedToolIds?.includes(tool.id)) {
                setIsAuthorized(true);
            } else if (tool && !userProfile?.purchasedToolIds?.includes(tool.id)) {
                // If user is logged in but hasn't purchased, show error
                setIsAuthorized(false);
            }
        }
    }, [user, userProfile, loading, tool, toolId, router]);

    if (loading || isLoadingTool) {
        return <div className="flex items-center justify-center h-screen"><p>Loading tool access...</p></div>;
    }

     if (!tool) {
        return <div className="flex items-center justify-center h-screen"><p>Tool not found.</p></div>;
    }


    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-center p-6">
                <Lock className="w-16 h-16 text-destructive mb-4" />
                <h1 className="text-2xl font-semibold mb-2">Access Denied</h1>
                <p className="text-muted-foreground mb-6">You have not purchased this AI tool.</p>
                <Button asChild>
                    <Link href="/marketplace">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Marketplace
                    </Link>
                </Button>
            </div>
        );
    }

    // Render the actual tool access content if authorized
    return (
         <div className="container mx-auto max-w-4xl py-12 px-4">
             <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-6">
                 <ArrowLeft className="mr-2 h-4 w-4" /> Back
             </Button>
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-3xl">Access: {tool.name}</CardTitle>
                    <CardDescription>Welcome! Here you can access the AI tool you purchased.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-muted-foreground">
                       This is where the interface or download links for the '{tool.name}' tool would be provided.
                    </p>
                    {/* Placeholder for tool interface/download */}
                    <div className="border border-dashed border-border/50 rounded-lg p-10 text-center bg-muted/40">
                         <p className="text-lg font-medium text-foreground">Tool Interface / Download Area</p>
                         <p className="text-sm text-muted-foreground mt-2">(Placeholder Content)</p>
                    </div>
                    <div className="text-center">
                         <Button asChild variant="link">
                            <Link href={tool.previewLink} target="_blank" rel="noopener noreferrer">View Original Preview</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
