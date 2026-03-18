export type Notification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  type?: string;
  data?: Record<string, unknown>;
};