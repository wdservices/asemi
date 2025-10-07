
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
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Suspense } from 'react';

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  useEffect(() => {
    if (user) {
      // If user is already logged in, redirect them.
      // The logic inside useAuth handles determining if they are admin.
      // A simple push to a default dashboard is fine here.
      router.push(searchParams.get('redirect') || '/dashboard');
    }
  }, [user, router, searchParams]);

  async function onSubmit(values: LoginFormValues) {
    try {
      const { isAdmin } = await login(values.email, values.password);
      toast({ title: "Login Successful", description: "Welcome back!" });
      
      const redirectPath = searchParams.get('redirect') || (isAdmin ? '/admin/dashboard' : '/dashboard');
      router.push(redirectPath);

    } catch (error: any) {
      console.error("Login error:", error);
      
      // Use the error message from our enhanced auth hook, or provide a fallback
      const description = error.message || "An unexpected error occurred. Please try again.";
      
      toast({
        title: "Login Failed",
        description: description,
        variant: "destructive",
      });
    }
  }

  return (
    <Card className="w-full max-w-md shadow-2xl border-2 border-primary/20 backdrop-blur-sm bg-card/95">
      <CardHeader className="space-y-1 text-center pb-8">
        <div className="flex justify-center mb-6 animate-in zoom-in duration-500">
          <Logo />
        </div>
        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-in fade-in slide-in-from-top-4 duration-700">
          Welcome Back
        </CardTitle>
        <CardDescription className="text-base animate-in fade-in slide-in-from-top-4 duration-700 delay-150">
          Enter your credentials to access your account
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
                  <FormLabel className="text-sm font-semibold">Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="m@example.com" 
                      className="h-11 border-2 border-primary/20 focus:border-primary transition-all" 
                      {...field} 
                    />
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
                  <FormLabel className="text-sm font-semibold">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        className="h-11 border-2 border-primary/20 focus:border-primary transition-all pr-10" 
                        {...field} 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-primary transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="flex items-center justify-end text-sm">
                <Link href="/auth/forgot-password" className="font-medium text-primary hover:text-accent transition-colors">
                    Forgot password?
                </Link>
             </div>
            <Button 
              type="submit" 
              className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300" 
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  Logging in...
                </span>
              ) : 'Login'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center text-sm">
         <p className="text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/auth/register" className="font-medium text-primary hover:underline">
              Sign Up
            </Link>
          </p>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
