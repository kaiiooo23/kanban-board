import { create } from 'zustand';
import { Task, TaskPriority, TaskStatus } from '@/types/task';

interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
}

type UpdateTaskPayload = Partial<Omit<Task, 'id'>>;

interface KanbanState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;

  fetchTasks: () => Promise<void>;
  addTask: (payload: CreateTaskPayload) => Promise<void>;
  updateTask: (id: string, payload: UpdateTaskPayload) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

export const useKanbanStore = create<KanbanState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  // 1. GET /api/tasks (HTTP 200)
  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const result: { data: Task[] } = await response.json();
      set({ tasks: result.data, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Gagal memuat data tugas',
        isLoading: false,
      });
    }
  },

  // 2. POST /api/tasks (HTTP 201)
  addTask: async (payload) => {
    set({ error: null });
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const result: { data: Task } = await response.json();
      set({ tasks: [...get().tasks, result.data] });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Gagal menambah tugas',
      });
    }
  },

  // 3. PATCH /api/tasks/:id (HTTP 200 - untuk edit isi maupun pindah kolom status)
  updateTask: async (id, payload) => {
    set({ error: null });
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const result: { data: Task } = await response.json();
      set({
        tasks: get().tasks.map((task) => (task.id === id ? result.data : task)),
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Gagal memperbarui tugas',
      });
    }
  },

  // 4. DELETE /api/tasks/:id (HTTP 200)
  deleteTask: async (id) => {
    set({ error: null });
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      set({
        tasks: get().tasks.filter((task) => task.id !== id),
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Gagal menghapus tugas',
      });
    }
  },
}));