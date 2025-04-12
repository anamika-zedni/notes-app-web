export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface SharedUser {
  id: string;
  username: string;
  permission: "view" | "edit";
}

export interface Attachment {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  color: string;
  isOwner: boolean;
  author: User;
  categories: Category[];
  shared: SharedUser[];
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalNotes: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}