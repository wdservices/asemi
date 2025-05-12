
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Logo from '@/components/layout/Logo';
import { useAuth } from '@/hooks/use-auth-mock';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';

const registerSchema = z.object({
  displayName: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  // We need the raw setUser function from the context for this mock registration
  const { user, login: _, setUser, setLoading } = useAuth(); // Renamed login to _ as we'll call setUser directly
  const { toast } = useToast();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
    },
  });

  if (user) { // If user is already logged in, redirect
    router.push('/dashboard');
  }

  async function onSubmit(values: RegisterFormValues) {
    setLoading(true); // Simulate loading
    // Simulate registration. In a real app, this would be an API call.
    // For mock, we'll create a new user object based on the form values
    // and set it directly in the auth context. This user won't persist
    // across refreshes unless added to mockData.ts and login is used.
    console.log("Registering user:", values);

    const newUser: UserProfile = {
      id: `temp-${Date.now()}`, // Temporary ID
      email: values.email,
      displayName: values.displayName,
      avatarUrl: null, // Default avatar will be used
      enrolledCourseIds: [],
      isAdmin: false,
    };

    // Directly set the new user in the auth context
    if (setUser) {
      setUser(newUser);
      // Optionally, store in localStorage to mimic session persistence for demo
      localStorage.setItem('mockUserId', newUser.id);
      // Add the temp user to mockUsers in memory ONLY for this session, so redirection works
      // Note: This is a hack for the mock setup. A real backend handles this.
      // We might need to modify useAuth to allow temporary setting without full login logic
      // Or, accept that refresh will log out this temp user.
      // Let's proceed without modifying mockUsers for now. The dashboard will show the name.
    }

    setLoading(false); // End loading simulation
    toast({ title: "Registration Successful", description: `Welcome to Skill Stream, ${values.displayName}!` });
    router.push('/dashboard'); // Redirect to dashboard after registration
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="space-y-1 text-center">
         <div className="flex justify-center mb-4">
          <Logo />
        </div>
        <CardTitle className="text-2xl">Create an Account</CardTitle>
        <CardDescription>
          Enter your details below to get started with Skill Stream.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="m@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="text-center text-sm">
         <p className="text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-medium text-primary hover:underline">
              Login
            </Link>
          </p>
      </CardFooter>
    </Card>
  );
}
