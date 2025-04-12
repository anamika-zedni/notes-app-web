/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import api from "@/lib/axios";
import axios, { AxiosError } from "axios";

interface ServerErrors {
  email?: string;
  username?: string;
  password?: string;
  server?: string;
}

interface ServerResponse {
  success: boolean;
  errors?: ServerErrors;
  message?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ServerErrors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    if (formData.password !== formData.confirmPassword) {
      setErrors({ password: "Passwords do not match" });
      toast.error("Passwords do not match", {
        style: { background: "#dc2626", color: "white" },
      });
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.post<ServerResponse>("/auth/register", {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      if (data.success) {
        toast.success("Registration successful! Please login.");
        router.push("/login");
      } else if (data.errors) {
        setErrors(data.errors);
        // Show all validation errors in toasts
        Object.values(data.errors).forEach((error) => {
          toast.error(error, {
            style: { background: "#dc2626", color: "white" },
          });
        });
      }
    } catch (err: unknown) {
      console.error("Registration error:", err);
      if (axios.isAxiosError(err)) {
        const error = err as AxiosError<ServerResponse>;
        if (error.response?.data.errors) {
          setErrors(error.response.data.errors);
          Object.values(error.response.data.errors).forEach((errorMsg) => {
            toast.error(errorMsg, {
              style: { background: "#dc2626", color: "white" },
            });
          });
        }
      } else {
        setErrors({ server: "Server error. Please try again later." });
        toast.error("Server error. Please try again later.", {
          style: { background: "#dc2626", color: "white" },
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Enter your details to register</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className={errors.username ? "border-red-500" : ""}
                />
              </div>
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username}</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={errors.email ? "border-red-500" : ""}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className={errors.password ? "border-red-500" : ""}
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 6 characters long
                </p>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                />
              </div>
            </div>
            {errors.server && (
              <p className="text-sm text-red-500 text-center">
                {errors.server}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Register"}
            </Button>
            <div className="space-y-2 text-center text-sm">
              <p>
                Already have an account?{" "}
                <Link href="/login" className="text-blue-500 hover:underline">
                  Login
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
