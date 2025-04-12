/** @format */

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NOTE_COLORS } from "@/constants/colors";
import type { Note, Category, User, SharedUser } from "@/types/note";
import { Search, X, Upload, FileText } from "lucide-react";
import { debounce } from "lodash";
import api from "@/lib/axios";
import { AxiosError } from "axios";

interface ApiErrorResponse {
  errors?: {
    [key: string]: string;
  };
  message?: string;
}

interface EditNoteModalProps {
  note: Note;
  isOpen: boolean;
  onClose: () => void;
  onNoteUpdated: () => void;
}

export default function EditNoteModal({
  note,
  isOpen,
  onClose,
  onNoteUpdated,
}: EditNoteModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: note.title,
    body: note.body,
    color: note.color,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    note.categories?.map((cat) => cat.id) || []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SharedUser[]>(
    note.shared || []
  );
  const [isSearching, setIsSearching] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState(
    note.attachments || []
  );
  const [fileError, setFileError] = useState<string>("");
  const MAX_FILE_SIZE = 1024 * 1024; // 1MB

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await api.get('/categories');
        setCategories(data.categories);
      } catch (err) {
        console.error("Fetch categories error:", err);
        if (err instanceof AxiosError) {
          const error = err as AxiosError<ApiErrorResponse>;
          toast.error(error.response?.data?.message || "Failed to load categories");
        }
      }
    };

    fetchCategories();
  }, []);

  const debouncedSearch = useRef(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setUserSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data } = await api.get(`/users?query=${query}`);
        const filteredUsers = data.users.filter(
          (user: User) => !selectedUsers.some((selected) => selected.id === user.id)
        );
        setUserSearchResults(filteredUsers);
      } catch (err) {
        console.error("Error searching users:", err);
        if (err instanceof AxiosError) {
          const error = err as AxiosError<ApiErrorResponse>;
          toast.error(error.response?.data?.message || "Failed to search users");
        }
      } finally {
        setIsSearching(false);
      }
    }, 500)
  ).current;

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleCategoryChange = (value: string) => {
    setSelectedCategories((prev) => {
      const newCategories = prev.includes(value)
        ? prev.filter((id) => id !== value)
        : [...prev, value];
      return newCategories;
    });
  };

  const handleUserSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const handleAddUser = (user: User) => {
    setSelectedUsers((prev) => [
      ...prev,
      {
        id: user.id,
        username: user.username,
        permission: "view",
      },
    ]);
    setSearchQuery("");
    setUserSearchResults([]);
  };

  const handleRemoveUser = (id: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const handlePermissionChange = (
    id: string,
    username: string,
    permission: "view" | "edit"
  ) => {
    setSelectedUsers((prev) =>
      prev.map((user) =>
        user.id === id ? { ...user, id, username, permission } : user
      )
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError("");
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];

    files.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`File "${file.name}" exceeds the 1MB size limit`);
      } else {
        validFiles.push(file);
      }
    });

    setAttachments((prev) => [...prev, ...validFiles]);
  };

  const handleRemoveNewFile = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingFile = async (filename: string) => {
    try {
      await api.delete(`/notes/${note.id}/attachments/${filename}`);
      setExistingAttachments((prev) =>
        prev.filter((file) => file.filename !== filename)
      );
      toast.success("File deleted successfully");
    } catch (err) {
      console.error("Delete file error:", err);
      if (err instanceof AxiosError) {
        const error = err as AxiosError<ApiErrorResponse>;
        toast.error(error.response?.data?.message || "Failed to delete file");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("body", formData.body);
      formDataToSend.append("color", formData.color);
      formDataToSend.append("categories", JSON.stringify(selectedCategories));
      formDataToSend.append("shared", JSON.stringify(selectedUsers));

      // Append new files
      attachments.forEach((file) => {
        formDataToSend.append("attachments", file);
      });

      await api.put(`/notes/${note.id}`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success("Note updated successfully");
      onNoteUpdated();
      onClose();
    } catch (err) {
      console.error("Update note error:", err);
      if (err instanceof AxiosError) {
        const error = err as AxiosError<ApiErrorResponse>;
        toast.error(error.response?.data?.message || "Failed to update note", {
          style: { background: "#dc2626", color: "white" }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[85vh] w-full">
        <DialogHeader>
          <DialogTitle>Edit Note</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Enter note title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Content</Label>
            <Textarea
              id="body"
              value={formData.body}
              onChange={(e) =>
                setFormData({ ...formData, body: e.target.value })
              }
              placeholder="Enter note content"
              className="min-h-[200px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Share with users</Label>
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={handleUserSearch}
                placeholder="Search users by username or email"
                className="pr-8"
              />
              <Search
                className={`h-4 w-4 absolute right-2 top-3 ${
                  isSearching
                    ? "animate-spin text-primary"
                    : "text-muted-foreground"
                }`}
              />
            </div>

            {searchQuery && userSearchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-background border rounded-md shadow-lg max-h-48 overflow-auto">
                {userSearchResults.map((user, index) => (
                  <div
                    key={`${user.id}-${index}`}
                    className="w-full px-4 py-2 hover:bg-muted cursor-pointer"
                    onClick={() => handleAddUser(user)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{user.username}</span>
                      <span className="text-muted-foreground text-xs truncate">
                        {user.email}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Users Display */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 p-2 bg-muted/30 rounded-lg">
                {selectedUsers.map((shared, index) => (
                  <div
                    key={`${shared.id}-${index}`}
                    className="flex items-center gap-2 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                  >
                    <span className="font-medium">{shared.username}</span>
                    <select
                      value={shared.permission}
                      onChange={(e) =>
                        handlePermissionChange(
                          shared.id,
                          shared.username,
                          e.target.value as "view" | "edit"
                        )
                      }
                      className="bg-transparent border-none text-xs outline-none"
                    >
                      <option value="view">View</option>
                      <option value="edit">Edit</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemoveUser(shared.id)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Categories</Label>
            <Select onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {categories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id}
                      className="flex items-center gap-2"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="capitalize">{category.name}</span>
                      </div>
                      {selectedCategories.includes(category.id) && (
                        <span className="ml-auto">✓</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {selectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 p-2 bg-muted/30 rounded-lg">
                {selectedCategories.map((id) => {
                  const category = categories.find((c) => c.id === id);
                  return (
                    category && (
                      <div
                        key={id}
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors"
                        style={{
                          backgroundColor: category.color,
                          color: "#ffffff",
                        }}
                      >
                        <span>{category.name}</span>
                        <button
                          type="button"
                          onClick={() => handleCategoryChange(id)}
                          className="ml-1 text-white hover:text-red-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Attachments</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              <Label
                htmlFor="file-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                Add Files
              </Label>
              <span className="text-xs text-muted-foreground">
                Maximum file size: 1MB
              </span>
            </div>

            {fileError && (
              <p className="text-xs text-destructive mt-1">{fileError}</p>
            )}

            {/* Existing Attachments */}
            {existingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {existingAttachments.map((file) => (
                  <div
                    key={file.filename}
                    className="flex items-center gap-2 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                  >
                    <FileText className="h-3 w-3" />
                    <span className="font-medium truncate max-w-[150px]">
                      {file.filename}
                    </span>
                    <span className="text-muted-foreground">
                      ({Math.round(file.size / 1024)}KB)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleRemoveExistingFile(file.filename)
                      }
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* New Attachments */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                  >
                    <FileText className="h-3 w-3" />
                    <span className="font-medium truncate max-w-[150px]">
                      {file.name}
                    </span>
                    <span className="text-muted-foreground">
                      ({Math.round(file.size / 1024)}KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveNewFile(index)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {NOTE_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    formData.color === color.value
                      ? "border-black dark:border-white scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() =>
                    setFormData({ ...formData, color: color.value })
                  }
                  title={color.label}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Note"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
