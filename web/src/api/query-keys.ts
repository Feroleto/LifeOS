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
  },
} as const;
