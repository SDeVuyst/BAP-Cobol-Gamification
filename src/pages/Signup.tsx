import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import AuthLayout from "@/components/layout/AuthLayout";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { User } from "lucide-react";

const formSchema = z.object({
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters" })
    .max(20, { message: "Username must be at most 20 characters" })
    .regex(/^[a-zA-Z0-9_]+$/, {
      message: "Username can only include letters, numbers, and underscores",
    }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof formSchema>;

const inputClass =
  "border-slate-600/55 bg-black/35 text-slate-100 placeholder:text-slate-600 focus-visible:ring-cyan-600/40";

const Signup = () => {
  const signup = useAuthStore((state) => state.signup);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const navigate = useNavigate(); // For navigation
  const [error, setError] = useState<string | null>(null); // Local form error
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // Local submitting state

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  
  const onSubmit = async (data: FormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await signup(data.username, data.email, data.password);
      navigate("/dashboard");
    } catch (err) {
      // Error is already toasted by the authStore.
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">Create an account</h2>
          <p className="text-sm text-slate-500">Enter your information to create an account</p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-400">Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="yourusername"
                      className={inputClass}
                      {...field}
                      disabled={isSubmitting || isAuthLoading}
                    />
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
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      {...field}
                      disabled={isSubmitting || isAuthLoading}
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
                  <FormLabel className="text-slate-400">Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className={inputClass}
                      {...field}
                      disabled={isSubmitting || isAuthLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-400">Confirm password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className={inputClass}
                      {...field}
                      disabled={isSubmitting || isAuthLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {error && (
              <div className="rounded-md border border-rose-500/35 bg-rose-950/25 p-3 font-mono text-sm text-rose-200">
                {error}
              </div>
            )}
            
            <Button
              type="submit"
              className="w-full border border-cyan-700/45 bg-cyan-950/35 font-mono text-xs uppercase tracking-wide text-cyan-100 hover:bg-cyan-950/50"
              disabled={isSubmitting || isAuthLoading}
            >
              {(isSubmitting || isAuthLoading) ? (
                "Creating account…"
              ) : (
                <>
                  <User className="mr-2 h-4 w-4" /> Create account
                </>
              )}
            </Button>
          </form>
        </Form>
        
        <div className="text-center text-sm text-slate-500">
          <p>
            Already have an account?{" "}
            <Link to="/" className="font-medium text-cyan-600/90 underline-offset-4 hover:text-cyan-400 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Signup;