'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings, Save } from 'lucide-react';

interface AdminSettingsData {
  minimumDonation: number;
  suggestedAmounts: number[];
  updatedAt: string | null;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<AdminSettingsData>({
    minimumDonation: 100,
    suggestedAmounts: [2000, 5000, 7000, 15000, 20000, 25000],
    updatedAt: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [suggestedAmountsText, setSuggestedAmountsText] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    // Update suggested amounts text when settings change
    setSuggestedAmountsText(settings.suggestedAmounts.join(', '));
  }, [settings.suggestedAmounts]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      
      if (data.status === 'success') {
        setSettings(data.data);
      } else {
        toast({
          title: "Error Loading Settings",
          description: data.message || "Failed to load admin settings.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error Loading Settings",
        description: "Network error while loading settings.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Parse suggested amounts from text
      const suggestedAmounts = suggestedAmountsText
        .split(',')
        .map(str => parseInt(str.trim()))
        .filter(num => !isNaN(num) && num > 0);
      
      if (suggestedAmounts.length === 0) {
        toast({
          title: "Invalid Input",
          description: "Please enter at least one valid suggested amount.",
          variant: "destructive"
        });
        return;
      }
      
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minimumDonation: settings.minimumDonation,
          suggestedAmounts
        })
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setSettings(data.data);
        toast({
          title: "Settings Updated",
          description: "Admin settings have been updated successfully."
        });
      } else {
        toast({
          title: "Update Failed",
          description: data.message || "Failed to update settings.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Save Error",
        description: "Network error while saving settings.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading settings...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Payment Settings
        </CardTitle>
        <CardDescription>
          Configure minimum donation amounts and suggested payment options.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="minimumDonation">Minimum Donation Amount (₦)</Label>
            <Input
              id="minimumDonation"
              type="number"
              min="1"
              step="1"
              value={settings.minimumDonation}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                minimumDonation: parseInt(e.target.value) || 100
              }))}
              placeholder="100"
            />
            <p className="text-xs text-muted-foreground">
              The minimum amount users can donate for courses.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="suggestedAmounts">Suggested Amounts (₦)</Label>
            <Input
              id="suggestedAmounts"
              type="text"
              value={suggestedAmountsText}
              onChange={(e) => setSuggestedAmountsText(e.target.value)}
              placeholder="2000, 5000, 7000, 15000, 20000, 25000"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of suggested donation amounts.
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {settings.updatedAt ? (
              <>Last updated: {new Date(settings.updatedAt).toLocaleString()}</>
            ) : (
              'Never updated'
            )}
          </div>
          
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">Preview</h4>
          <div className="text-sm text-blue-700">
            <p><strong>Minimum:</strong> ₦{settings.minimumDonation.toLocaleString()}</p>
            <p><strong>Quick buttons:</strong> {suggestedAmountsText.split(',').map(amt => `₦${parseInt(amt.trim()).toLocaleString()}`).join(', ')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
