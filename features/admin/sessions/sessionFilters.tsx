export type SessionStatusFilter =
  | 'all'
  | 'active'
  | 'waiting'
  | 'paused'
  | 'host_left_grace';

export const sessionFilterOptions: {
  id: SessionStatusFilter;
  label: string;
}[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'paused', label: 'Paused' },
  { id: 'host_left_grace', label: 'Grace' },
];