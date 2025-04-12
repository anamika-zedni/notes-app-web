export interface ApiErrorResponse {
  errors?: {
    [key: string]: string;
  };
  message?: string;
}