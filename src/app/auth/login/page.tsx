
"use client";

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login: mockLogin, user } = useAuth();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  if (user) { // If user is already logged in, redirect
    router.push(searchParams.get('redirect') || '/dashboard');
  }

  async function onSubmit(values: LoginFormValues) {
    // Simulate login. In a real app, this would be an API call.
    // Mock Login Details:
    // - Regular User: user@example.com (Password: any 6+ chars) -> Logs in as 'user1' from mockData
    // - Admin User: admin@example.com (Password: any 6+ chars) -> Logs in as 'admin1' from mockData (who is an admin)
    let userIdToLogin = '';
    if (values.email === 'user@example.com') userIdToLogin = 'user1';
    else if (values.email === 'admin@example.com') userIdToLogin = 'admin1';
    
    if (userIdToLogin) {
      mockLogin(userIdToLogin);
      toast({ title: "Login Successful", description: "Welcome back!" });
      const redirectPath = searchParams.get('redirect');
      // Redirect admins trying to access user dashboard to admin dashboard
      if (userIdToLogin === 'admin1' && redirectPath === '/dashboard') {
         router.push('/admin/dashboard');
      } else {
         router.push(redirectPath || (userIdToLogin === 'admin1' ? '/admin/dashboard' : '/dashboard'));
      }
    } else {
      toast({ title: "Login Failed", description: "Invalid email or password.", variant: "destructive" });
      form.setError("email", { type: "manual", message: "Invalid credentials" });
      form.setError("password", { type: "manual", message: "Invalid credentials" });
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <Logo />
        </div>
        <CardTitle className="text-2xl">Welcome Back!</CardTitle>
        <CardDescription>
          Enter your email and password to access your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              {form.formState.isSubmitting ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2 text-center text-sm">
         <p className="text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/auth/register" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
          <Link href="/auth/forgot-password" className="font-medium text-primary hover:underline text-xs">
              Forgot password?
          </Link>
      </CardFooter>
    </Card>
  );
}
