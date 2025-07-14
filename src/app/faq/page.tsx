
"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send } from "lucide-react";

const faqItems = [
  {
    question: "What is Asemi?",
    answer: "Asemi is an online learning platform that offers a wide range of expert-led video courses and a marketplace for powerful, customizable AI tools designed to enhance your skills and workflow."
  },
  {
    question: "How do I enroll in a course?",
    answer: "To enroll, simply navigate to the course you're interested in, click on the purchase button, and complete the payment process. If it's a free course, you can enroll directly. Once enrolled, the course will appear in your dashboard."
  },
  {
    question: "What do I get when I purchase an AI tool?",
    answer: "When you purchase an AI tool from our marketplace, you get access to the tool itself along with basic customization options, such as adding your own logo and brand colors. You'll receive instructions on how to access and configure your tool after purchase."
  },
  {
    question: "Is there a free trial available?",
    answer: "We do not offer a site-wide free trial, but many of our courses have free preview lessons that you can watch to get a feel for the content and teaching style before you decide to buy."
  },
  {
    question: "How can I reset my password?",
    answer: "If you've forgotten your password, you can go to the login page and click the 'Forgot Password?' link. You'll be prompted to enter your email address, and we'll send you a link to reset your password."
  },
  {
    question: "How can I contact support?",
    answer: "If your question isn't answered here, you can reach out to us directly through the contact form on this page or by emailing us at hello.wdservices@gmail.com. We're happy to help!"
  }
];

export default function FAQPage() {
    const { toast } = useToast();

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // Mock form submission
        toast({
            title: "Message Sent!",
            description: "Thanks for reaching out. We'll get back to you shortly.",
        });
        (event.target as HTMLFormElement).reset();
    };

  return (
    <div className="space-y-12">
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Frequently Asked Questions</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Have questions? We've got answers. If you can't find what you're looking for, feel free to contact us.
        </p>
      </section>

      {/* FAQ Accordion Section */}
      <section>
        <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
          {faqItems.map((item, index) => (
            <AccordionItem value={`item-${index}`} key={index}>
              <AccordionTrigger className="text-left font-semibold text-lg hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Contact Section */}
      <section className="max-w-3xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2"><Mail className="h-6 w-6 text-primary"/> Still have questions?</CardTitle>
            <CardDescription>
              Use the form below to get in touch with our team. We aim to respond within 24 hours.
              You can also email us directly at <a href="mailto:hello.wdservices@gmail.com" className="text-primary hover:underline">hello.wdservices@gmail.com</a>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleFormSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="John Doe" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="john@example.com" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" placeholder="e.g., Question about a course" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Your Message</Label>
                <Textarea id="message" placeholder="Please describe your question in detail..." rows={6} required />
              </div>
              <Button type="submit" className="w-full md:w-auto">
                <Send className="mr-2 h-4 w-4" /> Send Message
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
