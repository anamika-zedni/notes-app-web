import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { Note } from "@/types/note";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, FileText, Download } from "lucide-react";
import EditNoteModal from "./EditNoteModal";
import api from "@/lib/axios";

interface NoteDetailsModalProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function NoteDetailsModal({
  note,
  isOpen,
  onClose,
}: NoteDetailsModalProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!note) return;
    if (!confirm("Are you sure you want to delete this note?")) return;

    setLoading(true);
    try {
      await api.delete(`/notes/${note.id}`);
      toast.success("Note deleted successfully");
      onClose();
    } catch (error) {
      console.error("Delete note error:", error);
      toast.error("Failed to delete note", {
        style: { background: "#dc2626", color: "white" },
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const formattedDate = format(d, "dd-MMM-yyyy").toLowerCase();
    const time = format(d, "HH:mm");
    const distance = formatDistanceToNow(d, { addSuffix: true });
    return `${formattedDate} at ${time} (${distance})`;
  };

  if (!note) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="max-w-[90vw] max-h-[85vh] w-full rounded-xl overflow-hidden shadow-lg"
         
        >
          <DialogHeader className="pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold">
                {note.title}
              </DialogTitle>
              {(note.isOwner || note.shared?.some(share => share.permission === "edit")) && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEditModal(true);
                    }}
                    disabled={loading}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    disabled={loading}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(85vh-8rem)] p-1">
            <div 
              className="space-y-6 p-4 rounded-lg"
              style={{
                border: `2px solid ${note.color}30`,
                backgroundColor: `${note.color}05`
              }}
            >
              {/* Note Content */}
              <div className="prose dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-base leading-relaxed">
                  {note.body}
                </p>
              </div>

              {/* Categories */}
              {note.categories.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Categories
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {note.categories.map((category) => (
                      <div
                        key={category.id}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${category.color}15`,
                          color: category.color,
                          border: `1px solid ${category.color}30`,
                        }}
                      >
                        {category.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {note.attachments && note.attachments.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Attachments ({note.attachments.length})
                  </h3>
                  <div className="space-y-2">
                    {note.attachments.map((file) => (
                      <a
                        key={file.filename}
                        href={`${process.env.NEXT_PUBLIC_API_URL}/uploads/${note.author.id}/${file.filename}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-secondary/50 transition-colors group"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {file.originalname}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {Math.round(file.size / 1024)}KB
                          </p>
                        </div>
                        <Download className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="space-y-3 text-sm text-muted-foreground border-t pt-4">
                <div className="flex items-center justify-between">
                  <span>Created by</span>
                  <span className="font-medium">
                    {note.author.id === JSON.parse(localStorage.getItem("user") || "{}")?.id 
                      ? "you" 
                      : note.author.username}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Created</span>
                  <span>{formatDate(note.createdAt)}</span>
                </div>
                {note.updatedAt !== note.createdAt && (
                  <div className="flex items-center justify-between">
                    <span>Updated</span>
                    <span>{formatDate(note.updatedAt)}</span>
                  </div>
                )}

                {/* Sharing Information */}
                {note.shared && note.shared.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <h3 className="font-medium">Shared with</h3>
                    <div className="space-y-1 ml-4">
                      {note.shared.map((share) => (
                        <div
                          key={share.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span>{share.username}</span>
                          <span className="px-2 py-0.5 bg-secondary rounded-full">
                            {share.permission}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showEditModal && (
        <EditNoteModal
          note={note}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onNoteUpdated={onClose}
        />
      )}
    </>
  );
}