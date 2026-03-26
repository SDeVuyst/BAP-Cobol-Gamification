import { useState, useEffect } from "react";
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
import { LogIn } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type FormData = z.infer<typeof formSchema>;

const inputClass =
  "border-slate-600/55 bg-black/35 text-slate-100 placeholder:text-slate-600 focus-visible:ring-cyan-600/40";

const Login = () => {
  const login = useAuthStore((state) => state.login);
  const isFetchingProfile = useAuthStore((state) => state.isFetchingProfile);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const profile = useAuthStore((state) => state.profile);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isInitialized && isAuthenticated && profile && !isFetchingProfile) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, isFetchingProfile, profile, navigate, isInitialized]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred during login.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated && isFetchingProfile) {
    return (
      <AuthLayout>
        <div className="flex h-48 items-center justify-center">
          <p className="font-mono text-sm text-slate-500">Loading your account…</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">Sign in</h2>
          <p className="text-sm text-slate-500">Enter your credentials to access your account</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-400">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      className={inputClass}
                      {...field}
                      disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                "Signing in…"
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" /> Sign in
                </>
              )}
            </Button>
          </form>
        </Form>

        <div className="text-center text-sm text-slate-500">
          <p>
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="font-medium text-cyan-600/90 underline-offset-4 hover:text-cyan-400 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;
