"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import {
  ArrowDownUp,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  Clock3,
  Command,
  LayoutGrid,
  ListTodo,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Task, TaskPriority, TaskStatus } from "@/types/task";

type BoardTask = Task & {
  assignee?: string;
  dueDate?: string;
  label?: string;
  checklist?: { completed: number; total: number };
  comments?: number;
};

type TaskDraft = Pick<Task, "title" | "description" | "status" | "priority"> & {
  dueDate: string;
  label: string;
};

const STORAGE_KEY = "ruang-kanban-tasks";

const columns: { id: TaskStatus; title: string; tone: string }[] = [
  { id: "todo", title: "Belum dikerjakan", tone: "todo" },
  { id: "in-progress", title: "Sedang dikerjakan", tone: "progress" },
  { id: "done", title: "Selesai", tone: "done" },
];

const initialTasks: BoardTask[] = [
  {
    id: "task-1",
    title: "Riset kebutuhan pengguna",
    description: "Rangkum insight dari interview dan susun pain point utama.",
    status: "todo",
    priority: "high",
    assignee: "Alex",
    dueDate: "2026-11-21",
    label: "Riset",
    checklist: { completed: 2, total: 5 },
    comments: 3,
  },
  {
    id: "task-2",
    title: "Susun sitemap produk",
    description: "Petakan halaman inti untuk pengalaman pengguna yang lebih ringkas.",
    status: "todo",
    priority: "medium",
    assignee: "Maya",
    dueDate: "2026-11-24",
    label: "Produk",
    checklist: { completed: 1, total: 3 },
  },
  {
    id: "task-3",
    title: "Audit kompetitor",
    description: "Bandingkan pola navigasi dan fitur dari tiga produk serupa.",
    status: "todo",
    priority: "low",
    assignee: "Alex",
    dueDate: "2026-11-26",
    label: "Riset",
    comments: 1,
  },
  {
    id: "task-4",
    title: "Rancang design system",
    description: "Rapikan komponen dasar, warna, dan aturan tipografi.",
    status: "in-progress",
    priority: "high",
    assignee: "Maya",
    dueDate: "2026-11-22",
    label: "Desain",
    checklist: { completed: 6, total: 8 },
    comments: 4,
  },
  {
    id: "task-5",
    title: "Buat alur onboarding",
    description: "Sederhanakan langkah pertama agar pengguna cepat memahami produk.",
    status: "in-progress",
    priority: "medium",
    assignee: "Alex",
    dueDate: "2026-11-25",
    label: "Produk",
    checklist: { completed: 3, total: 6 },
    comments: 2,
  },
  {
    id: "task-6",
    title: "Siapkan ilustrasi produk",
    description: "Buat ilustrasi ringan untuk layar kosong dan onboarding.",
    status: "in-progress",
    priority: "low",
    assignee: "Raka",
    dueDate: "2026-11-28",
    label: "Desain",
  },
  {
    id: "task-7",
    title: "Buat struktur project",
    description: "Siapkan fondasi folder dan aturan kerja tim.",
    status: "done",
    priority: "medium",
    assignee: "Alex",
    dueDate: "2026-11-18",
    label: "Engineering",
    checklist: { completed: 4, total: 4 },
  },
  {
    id: "task-8",
    title: "Tentukan identitas visual",
    description: "Finalisasi palet warna dan arah visual untuk produk.",
    status: "done",
    priority: "high",
    assignee: "Maya",
    dueDate: "2026-11-17",
    label: "Desain",
    checklist: { completed: 3, total: 3 },
    comments: 5,
  },
];

const priorityLabels: Record<TaskPriority, string> = {
  high: "Tinggi",
  medium: "Sedang",
  low: "Rendah",
};

const emptyDraft: TaskDraft = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  dueDate: "",
  label: "",
};

type TaskSnapshot = {
  tasks: BoardTask[];
  storageError: string;
};

const serverSnapshot: TaskSnapshot = {
  tasks: initialTasks,
  storageError: "",
};
let taskSnapshot = serverSnapshot;
let taskStoreInitialized = false;
let canPersistTasks = true;
const taskListeners = new Set<() => void>();

function notifyTaskListeners() {
  taskListeners.forEach((listener) => listener());
}

function initializeTaskStore() {
  if (taskStoreInitialized || typeof window === "undefined") return;
  taskStoreInitialized = true;

  try {
    const savedTasks = window.localStorage.getItem(STORAGE_KEY);
    if (!savedTasks) return;

    const parsed: unknown = JSON.parse(savedTasks);
    if (!Array.isArray(parsed) || !parsed.every(isBoardTask)) {
      throw new Error("Data tugas tersimpan tidak memiliki format yang valid.");
    }
    taskSnapshot = { ...taskSnapshot, tasks: parsed };
  } catch (error) {
    canPersistTasks = false;
    taskSnapshot = {
      ...taskSnapshot,
      storageError:
        error instanceof Error
          ? error.message
          : "Data tugas lokal tidak dapat dibaca.",
    };
  }
}

function subscribeToTasks(listener: () => void) {
  taskListeners.add(listener);
  const wasInitialized = taskStoreInitialized;
  initializeTaskStore();
  if (!wasInitialized) listener();
  return () => taskListeners.delete(listener);
}

function getTaskSnapshot() {
  return taskSnapshot;
}

function getServerTaskSnapshot() {
  return serverSnapshot;
}

function updateTasks(updater: (currentTasks: BoardTask[]) => BoardTask[]) {
  initializeTaskStore();
  const tasks = updater(taskSnapshot.tasks);
  let storageError = taskSnapshot.storageError;

  if (canPersistTasks) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      storageError = "";
    } catch (error) {
      canPersistTasks = false;
      storageError =
        error instanceof Error
          ? error.message
          : "Perubahan tidak dapat disimpan di browser ini.";
    }
  }

  taskSnapshot = { tasks, storageError };
  notifyTaskListeners();
}

function isBoardTask(value: unknown): value is BoardTask {
  if (!value || typeof value !== "object") return false;
  const task = value as Partial<BoardTask>;
  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    typeof task.description === "string" &&
    (task.status === "todo" ||
      task.status === "in-progress" ||
      task.status === "done") &&
    (task.priority === "low" ||
      task.priority === "medium" ||
      task.priority === "high")
  );
}

function formatDueDate(value?: string) {
  if (!value) return "Tanpa tenggat";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T00:00:00`));
}

function initials(name?: string) {
  return (name ?? "AK")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function KanbanBoard() {
  const { tasks, storageError } = useSyncExternalStore(
    subscribeToTasks,
    getTaskSnapshot,
    getServerTaskSnapshot,
  );
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<BoardTask | null>(null);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [formError, setFormError] = useState("");

  const visibleTasks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id");
    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        `${task.title} ${task.description} ${task.label ?? ""}`
          .toLocaleLowerCase("id")
          .includes(query);
      const matchesPriority =
        priorityFilter === "all" || task.priority === priorityFilter;
      const matchesAssignee = !assignedToMe || task.assignee === "Alex";
      return matchesSearch && matchesPriority && matchesAssignee;
    });
  }, [assignedToMe, priorityFilter, search, tasks]);

  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const activeTasks = tasks.filter(
    (task) => task.status === "in-progress",
  ).length;
  const completionRate = tasks.length
    ? Math.round((completedTasks / tasks.length) * 100)
    : 0;

  function openCreateDialog(status: TaskStatus = "todo") {
    setEditingTask(null);
    setDraft({ ...emptyDraft, status });
    setFormError("");
    setIsDialogOpen(true);
  }

  function openEditDialog(task: BoardTask) {
    setEditingTask(task);
    setDraft({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ?? "",
      label: task.label ?? "",
    });
    setFormError("");
    setIsDialogOpen(true);
  }

  function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) {
      setFormError("Tambahkan judul agar tugas mudah ditemukan.");
      return;
    }

    if (editingTask) {
      updateTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === editingTask.id
            ? {
                ...task,
                ...draft,
                title,
                dueDate: draft.dueDate || undefined,
                label: draft.label.trim() || undefined,
              }
            : task,
        ),
      );
    } else {
      updateTasks((currentTasks) => [
        {
          id: crypto.randomUUID(),
          ...draft,
          title,
          description: draft.description.trim(),
          dueDate: draft.dueDate || undefined,
          label: draft.label.trim() || undefined,
          assignee: "Alex",
        },
        ...currentTasks,
      ]);
    }

    setIsDialogOpen(false);
  }

  function moveTask(taskId: string, status: TaskStatus) {
    updateTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, status } : task,
      ),
    );
  }

  return (
    <div className="app-shell">
      {isMenuOpen && (
        <button
          aria-label="Tutup menu"
          className="sidebar-backdrop"
          onClick={() => setIsMenuOpen(false)}
          type="button"
        />
      )}
      <aside className={`sidebar${isMenuOpen ? " sidebar-open" : ""}`}>
        <a className="brand" href="#dashboard" aria-label="Ruang home">
          <span className="brand-mark">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span>ruang<span className="brand-period">.</span></span>
        </a>

        <div className="workspace-picker">
          <span className="workspace-avatar">S</span>
          <span className="workspace-copy">
            <strong>Studio Kreatif</strong>
            <small>Workspace</small>
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </div>

        <nav className="sidebar-nav" aria-label="Navigasi utama">
          <p className="nav-heading">MENU</p>
          <a className="nav-link" href="#overview">
            <LayoutGrid size={18} />
            <span>Overview</span>
          </a>
          <a className="nav-link nav-link-active" href="#board">
            <ListTodo size={18} />
            <span>Task board</span>
            <span className="nav-count">{tasks.length}</span>
          </a>
          <a className="nav-link" href="#team">
            <Users size={18} />
            <span>Tim saya</span>
          </a>
          <a className="nav-link" href="#board">
            <CalendarDays size={18} />
            <span>Kalender</span>
          </a>

          <div className="nav-section-heading">
            <p className="nav-heading">WORKSPACE</p>
          </div>
          <a className="project-link project-link-active" href="#board">
            <span className="project-dot project-dot-purple" />
            <span>Product launch</span>
            <span className="project-more">•••</span>
          </a>
          <a className="project-link" href="#board">
            <span className="project-dot project-dot-orange" />
            <span>Website refresh</span>
          </a>
          <a className="project-link" href="#board">
            <span className="project-dot project-dot-blue" />
            <span>Brand guidelines</span>
          </a>
        </nav>

        <div className="sidebar-bottom">
          <a className="nav-link" href="#settings">
            <Settings2 size={18} />
            <span>Pengaturan</span>
          </a>
          <div className="sidebar-profile">
            <span className="avatar avatar-alex">AK</span>
            <span className="profile-copy">
              <strong>Alexandra Kim</strong>
              <small>alex@ruang.design</small>
            </span>
            <button aria-label="Opsi profil" className="profile-more" type="button">
              <span>•••</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          <div className="topbar-context">
            <button
              aria-label="Buka menu"
              className="mobile-menu-button"
              onClick={() => setIsMenuOpen(true)}
              type="button"
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={15} />
            <strong>Product launch</strong>
          </div>
          <div className="topbar-actions">
            <label className="global-search">
              <Search size={17} />
              <input
                aria-label="Cari tugas"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari tugas..."
                value={search}
              />
              <span className="search-shortcut">
                <Command size={12} /> K
              </span>
            </label>
            <button aria-label="Notifikasi" className="icon-button notification-button" type="button">
              <Bell size={18} />
              <span className="notification-dot" />
            </button>
            <span className="avatar avatar-alex topbar-avatar">AK</span>
          </div>
        </header>

        <main className="dashboard-content" id="dashboard">
          <section className="welcome-section" id="overview">
            <div className="welcome-copy">
              <div className="eyebrow">
                <span className="eyebrow-indicator" />
                HARI JUMAT, 20 NOVEMBER 2026
              </div>
              <h1>Selamat pagi, Alex <span aria-hidden="true">✦</span></h1>
              <p>Ide bagus dimulai dari langkah kecil. Yuk, lanjutkan progresmu hari ini.</p>
            </div>
            <button
              className="button-primary"
              onClick={() => openCreateDialog()}
              type="button"
            >
              <Plus size={18} />
              Buat tugas
            </button>
          </section>

          <section className="stats-grid" aria-label="Ringkasan tugas">
            <article className="stat-card stat-card-total">
              <div className="stat-card-top">
                <span className="stat-icon stat-icon-lilac"><Target size={18} /></span>
                <span className="stat-trend"><Sparkles size={13} /> Project aktif</span>
              </div>
              <div className="stat-number">{tasks.length}</div>
              <div className="stat-caption">Total tugas di project ini</div>
              <div className="stat-bottom"><span className="stat-mini-bar"><i /></span> Product launch</div>
            </article>
            <article className="stat-card">
              <div className="stat-card-top">
                <span className="stat-icon stat-icon-amber"><Clock3 size={18} /></span>
                <span className="stat-label">Sedang berjalan</span>
              </div>
              <div className="stat-number">{activeTasks}</div>
              <div className="stat-caption">Tugas yang sedang dikerjakan</div>
              <div className="stat-bottom"><span className="stat-dots"><i /><i /><i /></span> Tetap semangat!</div>
            </article>
            <article className="stat-card">
              <div className="stat-card-top">
                <span className="stat-icon stat-icon-green"><Check size={18} /></span>
                <span className="stat-label">Progress selesai</span>
              </div>
              <div className="stat-number">{completionRate}<span className="stat-percent">%</span></div>
              <div className="stat-caption">{completedTasks} dari {tasks.length} tugas sudah selesai</div>
              <div className="progress-track"><span style={{ width: `${completionRate}%` }} /></div>
            </article>
          </section>

          {storageError && (
            <p className="storage-notice" role="status">
              Perubahan hanya tersimpan sementara: {storageError}
            </p>
          )}

          <section className="board-section" id="board">
            <div className="board-heading">
              <div>
                <div className="board-title-row">
                  <h2>Papan tugas</h2>
                  <span className="board-count">{tasks.length}</span>
                </div>
                <p>Atur pekerjaanmu, satu langkah dalam satu waktu.</p>
              </div>
              <div className="board-heading-actions" id="team">
                <div className="avatar-stack" aria-label="Anggota tim">
                  <span className="avatar avatar-alex">AK</span>
                  <span className="avatar avatar-maya">MC</span>
                  <span className="avatar avatar-raka">RP</span>
                  <span className="avatar avatar-more">+2</span>
                </div>
                <button className="button-outline" type="button">
                  <Users size={16} />
                  Bagikan
                </button>
              </div>
            </div>

            <div className="board-toolbar">
              <div className="board-tabs" role="group" aria-label="Filter penugasan">
                <button
                  aria-pressed={!assignedToMe}
                  className={!assignedToMe ? "board-tab board-tab-active" : "board-tab"}
                  onClick={() => setAssignedToMe(false)}
                  type="button"
                >
                  Semua tugas
                </button>
                <button
                  aria-pressed={assignedToMe}
                  className={assignedToMe ? "board-tab board-tab-active" : "board-tab"}
                  onClick={() => setAssignedToMe(true)}
                  type="button"
                >
                  Ditugaskan ke saya
                </button>
              </div>
              <div className="board-tools">
                <label className="filter-select-wrap">
                  <Settings2 size={15} />
                  <select
                    aria-label="Filter prioritas"
                    onChange={(event) => setPriorityFilter(event.target.value)}
                    value={priorityFilter}
                  >
                    <option value="all">Semua prioritas</option>
                    <option value="high">Prioritas tinggi</option>
                    <option value="medium">Prioritas sedang</option>
                    <option value="low">Prioritas rendah</option>
                  </select>
                  <ChevronDown size={14} />
                </label>
                <button className="icon-button sort-button" aria-label="Urutkan tugas" type="button">
                  <ArrowDownUp size={16} />
                </button>
              </div>
            </div>

            <div className="kanban-columns">
              {columns.map((column) => {
                const columnTasks = visibleTasks.filter(
                  (task) => task.status === column.id,
                );
                return (
                  <section
                    aria-label={column.title}
                    className={`kanban-column column-${column.tone}`}
                    key={column.id}
                  >
                    <div className="column-heading">
                      <div className="column-title-wrap">
                        <span className={`column-indicator indicator-${column.tone}`}>
                          {column.id === "done" ? <Check size={12} /> : null}
                        </span>
                        <h3>{column.title}</h3>
                        <span className="column-count">{columnTasks.length}</span>
                      </div>
                      <button
                        aria-label={`Tambah tugas ${column.title}`}
                        className="column-add"
                        onClick={() => openCreateDialog(column.id)}
                        type="button"
                      >
                        <Plus size={17} />
                      </button>
                    </div>
                    <div className="task-list">
                      {columnTasks.map((task) => (
                        <article className="task-card" key={task.id}>
                          <div className="task-card-top">
                            {task.label && <span className="task-label">{task.label}</span>}
                            <button
                              aria-label={`Edit ${task.title}`}
                              className="task-edit-button"
                              onClick={() => openEditDialog(task)}
                              type="button"
                            >
                              <span>•••</span>
                            </button>
                          </div>
                          <button
                            className="task-title-button"
                            onClick={() => openEditDialog(task)}
                            type="button"
                          >
                            <h4>{task.title}</h4>
                          </button>
                          {task.description && <p className="task-description">{task.description}</p>}
                          <div className="task-meta-row">
                            <span className={`priority-badge priority-${task.priority}`}>
                              <span />
                              {priorityLabels[task.priority]}
                            </span>
                            <span className="task-due-date">
                              <CalendarDays size={13} />
                              {formatDueDate(task.dueDate)}
                            </span>
                          </div>
                          <div className="task-card-footer">
                            <div className="task-activity">
                              <span className={`avatar task-assignee avatar-${(task.assignee ?? "alex").toLowerCase()}`}>
                                {initials(task.assignee)}
                              </span>
                              {task.checklist && (
                                <span className="task-activity-item">
                                  <Check size={13} />
                                  {task.checklist.completed}/{task.checklist.total}
                                </span>
                              )}
                              {task.comments ? (
                                <span className="task-activity-item">
                                  <MessageSquare size={13} />
                                  {task.comments}
                                </span>
                              ) : null}
                            </div>
                            <label className="task-status-control">
                              <span className="sr-only">Pindahkan status tugas</span>
                              <select
                                aria-label={`Status ${task.title}`}
                                onChange={(event) =>
                                  moveTask(task.id, event.target.value as TaskStatus)
                                }
                                value={task.status}
                              >
                                {columns.map((option) => (
                                  <option key={option.id} value={option.id}>
                                    {option.title}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown size={12} />
                            </label>
                          </div>
                        </article>
                      ))}
                      {columnTasks.length === 0 && (
                        <div className="empty-column">
                          <CircleDashed size={20} />
                          <span>{search || assignedToMe || priorityFilter !== "all" ? "Tidak ada tugas yang cocok" : "Belum ada tugas di sini"}</span>
                        </div>
                      )}
                      <button
                        className="add-task-button"
                        onClick={() => openCreateDialog(column.id)}
                        type="button"
                      >
                        <Plus size={15} />
                        Tambah tugas
                      </button>
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
          <footer className="page-footer">
            <span>Semua progres tersimpan otomatis</span>
            <span className="footer-status"><span /> Tersimpan lokal</span>
          </footer>
        </main>
      </div>

      <Dialog
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setFormError("");
        }}
        open={isDialogOpen}
      >
        <DialogContent className="task-dialog" showCloseButton={false}>
          <DialogHeader className="task-dialog-header">
            <div className="dialog-icon"><ListTodo size={19} /></div>
            <div>
              <DialogTitle>{editingTask ? "Edit tugas" : "Buat tugas baru"}</DialogTitle>
              <DialogDescription>
                {editingTask
                  ? "Perbarui detail tugas agar semua tetap selaras."
                  : "Tambahkan detail tugas ke project Product launch."}
              </DialogDescription>
            </div>
            <button
              aria-label="Tutup dialog"
              className="dialog-close"
              onClick={() => setIsDialogOpen(false)}
              type="button"
            >
              <X size={18} />
            </button>
          </DialogHeader>
          <form className="task-form" onSubmit={saveTask}>
            <label className="form-field">
              <span>Nama tugas <b>*</b></span>
              <input
                autoFocus
                maxLength={100}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Contoh: Rancang halaman utama"
                value={draft.title}
              />
            </label>
            <label className="form-field">
              <span>Deskripsi <small>Opsional</small></span>
              <textarea
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Jelaskan apa yang perlu dikerjakan..."
                rows={3}
                value={draft.description}
              />
            </label>
            <div className="form-field-row">
              <label className="form-field">
                <span>Status</span>
                <select
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      status: event.target.value as TaskStatus,
                    }))
                  }
                  value={draft.status}
                >
                  {columns.map((column) => (
                    <option key={column.id} value={column.id}>{column.title}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Prioritas</span>
                <select
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      priority: event.target.value as TaskPriority,
                    }))
                  }
                  value={draft.priority}
                >
                  <option value="low">Rendah</option>
                  <option value="medium">Sedang</option>
                  <option value="high">Tinggi</option>
                </select>
              </label>
            </div>
            <div className="form-field-row">
              <label className="form-field">
                <span>Label <small>Opsional</small></span>
                <input
                  maxLength={30}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, label: event.target.value }))
                  }
                  placeholder="Desain, riset, produk..."
                  value={draft.label}
                />
              </label>
              <label className="form-field">
                <span>Tenggat waktu</span>
                <input
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, dueDate: event.target.value }))
                  }
                  type="date"
                  value={draft.dueDate}
                />
              </label>
            </div>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <DialogFooter className="task-dialog-footer">
              <button
                className="button-dialog-cancel"
                onClick={() => setIsDialogOpen(false)}
                type="button"
              >
                Batal
              </button>
              <button className="button-primary button-dialog-save" type="submit">
                <Plus size={16} />
                {editingTask ? "Simpan perubahan" : "Buat tugas"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
