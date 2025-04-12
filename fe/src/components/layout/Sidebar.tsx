"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LayoutDashboard, User, Tag } from "lucide-react";
import api from "@/lib/axios";
import { AxiosError } from "axios";
import type { ApiErrorResponse } from "@/types/api";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      
      // Clear local storage
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
      if (err instanceof AxiosError) {
        const error = err as AxiosError<ApiErrorResponse>;
        toast.error(error.response?.data?.message || "Failed to logout", {
          style: { background: "#dc2626", color: "white" }
        });
      }
    }
  };

  const routes = [
    { 
      href: "/", 
      label: "Home",
      icon: LayoutDashboard 
    },
    { 
      href: "/categories", 
      label: "Categories",
      icon: Tag 
    },
    { 
      href: "/profile", 
      label: "Profile",
      icon: User 
    },
  ];

  return (
    <div className="h-screen w-64 border-r bg-gray-50/40 p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Notes App</h1>
      </div>
      
      <nav className="flex-1">
        <ul className="space-y-2">
          {routes.map((route) => (
            <li key={route.href}>
              <Link
                href={route.href}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors",
                  pathname === route.href && "bg-gray-100 text-blue-600 font-medium"
                )}
              >
                <route.icon className="h-4 w-4" />
                <span>{route.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t pt-4">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          Logout
        </Button>
      </div>
    </div>
  );
}