export const queryKeys = {
  me: ["me"] as const,
  areas: {
    all: ["areas"] as const,
    list: () => ["areas", "list"] as const,
  },
  goals: {
    all: ["goals"] as const,
    list: (filters: { status?: string; areaId?: string }) => ["goals", "list", filters] as const,
    detail: (id: string) => ["goals", "detail", id] as const,
    /** Derived, not part of the goal: GET /goals/:id/progress is its own read. */
    progress: (id: string) => ["goals", "progress", id] as const,
  },
  habits: {
    all: ["habits"] as const,
    list: (filters: { status?: string; areaId?: string }) => ["habits", "list", filters] as const,
    summary: (id: string) => ["habits", "summary", id] as const,
    /*
      Completions are events, so this reads GET /events rather than anything
      under /habits. It is keyed here anyway: it is the habits page that asks
      for it, and completing a habit has to invalidate it alongside the
      summaries, which one `habits.all` prefix does.
    */
    completions: (from: string) => ["habits", "completions", from] as const,
  },
  metrics: {
    all: ["metrics"] as const,
    list: (query: Record<string, string | undefined>) => ["metrics", "list", query] as const,
  },
} as const;
