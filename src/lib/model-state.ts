export type ModelStatus =
  | "not-downloaded"
  | "downloading"
  | "ready"
  | "active"
  | "error";

export interface ModelState {
  status: ModelStatus;
  progress: number;
  error?: string;
  benchmark?: number;
}

export type ModelAction =
  | { type: "download-started" }
  | { type: "download-progressed"; progress: number }
  | { type: "download-completed"; benchmark?: number }
  | { type: "benchmark-completed"; benchmark: number }
  | { type: "activated" }
  | { type: "deactivated" }
  | { type: "failed"; error: string }
  | { type: "deleted" };

export function modelStateReducer(
  state: ModelState,
  action: ModelAction,
): ModelState {
  switch (action.type) {
    case "download-started":
      return { status: "downloading", progress: 0 };
    case "download-progressed":
      return {
        status: "downloading",
        progress: Math.max(
          state.progress,
          Math.min(99, Math.max(0, Math.round(action.progress))),
        ),
      };
    case "download-completed":
      return { status: "ready", progress: 100, benchmark: action.benchmark };
    case "benchmark-completed":
      return { ...state, benchmark: action.benchmark };
    case "activated":
      return { ...state, status: "active", progress: 100, error: undefined };
    case "deactivated":
      return { ...state, status: "ready" };
    case "failed":
      return { ...state, status: "error", error: action.error };
    case "deleted":
      return { status: "not-downloaded", progress: 0 };
  }
}
