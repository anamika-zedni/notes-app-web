import { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "@/lib/axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AxiosError } from "axios";
interface ApiErrorResponse {
  errors?: {
    name?: string;
  };
}

const CATEGORY_COLORS = [
  "#1abc9c", // Turquoise
  "#2ecc71", // Emerald
  "#3498db", // Peter River
  "#9b59b6", // Amethyst
  "#34495e", // Wet Asphalt
  "#16a085", // Green Sea
  "#27ae60", // Nephritis
  "#2980b9", // Belize Hole
  "#8e44ad", // Wisteria
  "#f1c40f", // Sunflower
  "#e67e22", // Carrot
  "#e74c3c", // Alizarin
  "#95a5a6", // Concrete
  "#f39c12", // Orange
  "#d35400", // Pumpkin
];

interface CategoryModalProps {
  category?: {
    id: string;
    name: string;
    color: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CategoryModal({
  category,
  isOpen,
  onClose,
  onSuccess,
}: CategoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: category?.name || "",
    color: category?.color || CATEGORY_COLORS[0],
  });
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      name: "",
      color: CATEGORY_COLORS[0],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (category?.id) {
        await api.put(`/categories/${category.id}`, formData);
      } else {
        await api.post("/categories", formData);
      }

      toast.success(
        `Category ${category ? "updated" : "created"} successfully`
      );
      onSuccess();
      resetForm();
      onClose();
    } catch (err) {
      console.error(`${category ? "Update" : "Create"} category error:`, err);
      if (err instanceof AxiosError) {
        const error = err as AxiosError<ApiErrorResponse>;

        if (error.response?.data?.errors?.name) {
          setError(error.response.data.errors.name);
          return;
        }
      }
      toast.error(`Failed to ${category ? "update" : "create"} category`, {
        style: { background: "#dc2626", color: "white" },
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: "",
        color: CATEGORY_COLORS[0],
      });
      setError(null);
    } else if (category) {
      setFormData({
        name: category.name,
        color: category.color,
      });
    }
  }, [isOpen, category]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {category ? "Edit Category" : "Create Category"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                setError(null); // Clear error when user types
              }}
              placeholder="Enter category name"
              required
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    formData.color === color
                      ? "border-black dark:border-white scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData({ ...formData, color: color })}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? category
                  ? "Updating..."
                  : "Creating..."
                : category
                ? "Update"
                : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}