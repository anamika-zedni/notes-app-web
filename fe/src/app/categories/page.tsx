"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import AuthGuard from "@/components/auth/AuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import CategoryModal from "@/components/categories/CategoryModal";
import api from "@/lib/axios";
import { AxiosError } from "axios";
import type { ApiErrorResponse } from "@/types/api";

interface Category {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  isShared: boolean;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get("/categories");
      setCategories(data.categories);
    } catch (err) {
      console.error("Fetch categories error:", err);
      if (err instanceof AxiosError) {
        const error = err as AxiosError<ApiErrorResponse>;
        toast.error(
          error.response?.data?.message || "Failed to load categories",
          {
            style: { background: "#dc2626", color: "white" },
          }
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      await api.delete(`/categories/${id}`);
      toast.success("Category deleted successfully");
      fetchCategories();
    } catch (err) {
      console.error("Delete category error:", err);
      if (err instanceof AxiosError) {
        const error = err as AxiosError<ApiErrorResponse>;
        toast.error(
          error.response?.data?.message || "Failed to delete category",
          {
            style: { background: "#dc2626", color: "white" },
          }
        );
      }
    }
  };

  return (
    <AuthGuard>
      <AppLayout>
        <div className="container mx-auto p-4">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Categories</h1>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                New Category
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center min-h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No categories yet. Create your first category!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <Card key={category.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <div>
                        <h3 className="font-medium capitalize">
                          {category.name}
                        </h3>
                        {category.isShared && (
                          <span className="text-xs text-muted-foreground">
                            Shared category
                          </span>
                        )}
                      </div>
                    </div>
                    {!category.isShared && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedCategory(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(category.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
        <CategoryModal
          category={selectedCategory}
          isOpen={showCreateModal || !!selectedCategory}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedCategory(null);
          }}
          onSuccess={fetchCategories}
        />
      </AppLayout>
    </AuthGuard>
  );
}