"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DollarSign, Gift, Heart } from "lucide-react";
import type { CoursePricing, CoursePricingType } from "@/lib/types";

interface PricingSelectorProps {
  value: CoursePricing;
  onChange: (pricing: CoursePricing) => void;
}

export default function PricingSelector({ value, onChange }: PricingSelectorProps) {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [tempAmount, setTempAmount] = useState(value.amount?.toString() || "");
  const [tempSuggestedDonation, setTempSuggestedDonation] = useState(value.suggestedDonation?.toString() || "");

  const handlePricingTypeChange = (type: CoursePricingType) => {
    if (type === "free") {
      onChange({ type: "free" });
    } else if (type === "payment") {
      setIsPaymentModalOpen(true);
    } else if (type === "donation") {
      setIsDonationModalOpen(true);
    }
  };

  const handlePaymentSave = () => {
    const amount = parseFloat(tempAmount);
    if (amount > 0) {
      onChange({ type: "payment", amount });
      setIsPaymentModalOpen(false);
    }
  };

  const handleDonationSave = () => {
    const suggestedDonation = tempSuggestedDonation ? parseFloat(tempSuggestedDonation) : undefined;
    onChange({ type: "donation", suggestedDonation });
    setIsDonationModalOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course Pricing</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup value={value.type} onValueChange={handlePricingTypeChange} className="space-y-4">
          <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="free" id="free" />
            <Label htmlFor="free" className="flex items-center gap-2 cursor-pointer flex-1">
              <Gift className="h-4 w-4 text-green-600" />
              <div>
                <div className="font-medium">Free Course</div>
                <div className="text-sm text-muted-foreground">No payment required</div>
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="donation" id="donation" />
            <Label htmlFor="donation" className="flex items-center gap-2 cursor-pointer flex-1">
              <Heart className="h-4 w-4 text-pink-600" />
              <div>
                <div className="font-medium">Donation Based</div>
                <div className="text-sm text-muted-foreground">
                  Pay what you can {value.suggestedDonation && `(suggested: ₦${value.suggestedDonation.toLocaleString()})`}
                </div>
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="payment" id="payment" />
            <Label htmlFor="payment" className="flex items-center gap-2 cursor-pointer flex-1">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <div>
                <div className="font-medium">Fixed Price</div>
                <div className="text-sm text-muted-foreground">
                  {value.amount ? `₦${value.amount.toLocaleString()}` : "Set a fixed price"}
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>

        {/* Payment Modal */}
        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Course Price</DialogTitle>
              <DialogDescription>
                Enter the fixed price for this course. Students must pay this amount before accessing the course.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Price (₦)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="30000"
                  value={tempAmount}
                  onChange={(e) => setTempAmount(e.target.value)}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Enter amount in Nigerian Naira (₦). Example: 30000 for ₦30,000
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handlePaymentSave} disabled={!tempAmount || parseFloat(tempAmount) <= 0}>
                Save Price
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Donation Modal */}
        <Dialog open={isDonationModalOpen} onOpenChange={setIsDonationModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Donation Settings</DialogTitle>
              <DialogDescription>
                Set up donation-based pricing. Students can pay any amount they choose to access the course.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="suggestedDonation">Suggested Donation (₦) - Optional</Label>
                <Input
                  id="suggestedDonation"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="5000"
                  value={tempSuggestedDonation}
                  onChange={(e) => setTempSuggestedDonation(e.target.value)}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Leave empty if you don't want to suggest an amount. Students can still donate any amount they choose.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDonationModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleDonationSave}>
                Save Settings
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}