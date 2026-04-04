import { api } from './client';

/* ── Types ────────────────────────────────────────────────────── */

export type GoalType = 'sessions' | 'assignments' | 'streak' | 'messages' | 'custom';

export type UserGoal = {
  id:          string;
  title:       string;
  type:        GoalType;
  targetValue: number;
  currentValue: number;
  progressPct: number;       // 0–100, capped
  description: string | null;
  dueAt:       string | null; // ISO
  completedAt: string | null; // ISO
  createdAt:   string;
};

export type CreateGoalBody = {
  title:        string;
  type:         GoalType;
  targetValue:  number;        // 1–10000
  description?: string;
  dueAt?:       string;        // ISO
};

export type UpdateGoalBody = Partial<Pick<CreateGoalBody, 'title' | 'description' | 'dueAt' | 'targetValue'>>;

/* ── API ──────────────────────────────────────────────────────── */

export const goalsApi = {
  /* GET /api/goals?status=active|completed|all */
  getAll: (status: 'active' | 'completed' | 'all' = 'active') =>
    api.get<{ success: boolean; goals: UserGoal[] }>(`/api/goals?status=${status}`),

  /* GET /api/goals/:id */
  get: (id: string) =>
    api.get<{ success: boolean; goal: UserGoal }>(`/api/goals/${id}`),

  /* POST /api/goals */
  create: (body: CreateGoalBody) =>
    api.post<{ success: boolean; goal: UserGoal }>('/api/goals', body),

  /* PATCH /api/goals/:id — cannot edit completed goals */
  update: (id: string, body: UpdateGoalBody) =>
    api.patch<{ success: boolean }>(`/api/goals/${id}`, body),

  /* DELETE /api/goals/:id */
  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/api/goals/${id}`),

  /* POST /api/goals/:id/increment — custom-type goals only */
  increment: (id: string, amount = 1) =>
    api.post<{ success: boolean }>(`/api/goals/${id}/increment`, { amount }),
};
