
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send } from "lucide-react";
import { useState } from "react";

export default function ContactPage() {
    const { toast } = useToast();
    const [form, setForm] = useState({
        name: "",
        email: "",
        subject: "",
        message: ""
    });

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // Mock form submission
        toast({
            title: "Message Sent!",
            description: "Thanks for reaching out. We'll get back to you shortly.",
        });
        setForm({ name: "", email: "", subject: "", message: "" });
    };

    return (
        <div className="space-y-12">
            <section className="text-center">
                <h1 className="text-4xl font-bold tracking-tight text-foreground">Contact Us</h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    We'd love to hear from you. Fill out the form below or email us directly.
                </p>
            </section>

            <section className="max-w-3xl mx-auto">
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-2xl flex items-center gap-2"><Mail className="h-6 w-6 text-primary" /> Get in Touch</CardTitle>
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
                                    <Input id="name" placeholder="John Doe" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input id="email" type="email" placeholder="john@example.com" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject</Label>
                                <Input id="subject" placeholder="e.g., Question about a course" required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="message">Your Message</Label>
                                <Textarea id="message" placeholder="Please describe your question in detail..." rows={6} required value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
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
