import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AreaFormDialog } from "./AreaFormDialog";
import type { Area } from "./area.types";
import { useAreas, useDeleteArea } from "./areas.queries";

/** The areas the foundation document suggests starting from. */
const SUGGESTED_AREAS = ["Health", "Studies", "Finance", "Productivity", "Personal"];

export function AreasPage() {
  const areas = useAreas();
  const remove = useDeleteArea();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Area | undefined>(undefined);
  const [initialName, setInitialName] = useState<string | undefined>(undefined);
  const [deleting, setDeleting] = useState<Area | undefined>(undefined);

  const openCreate = (name?: string) => {
    setEditing(undefined);
    setInitialName(name);
    setFormOpen(true);
  };

  const openEdit = (area: Area) => {
    setEditing(area);
    setInitialName(undefined);
    setFormOpen(true);
  };

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Areas</h1>
          <p className="text-muted-foreground text-sm">
            Labels you attach to goals, across every part of your life.
          </p>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus /> New area
        </Button>
      </header>

      {areas.isPending ? (
        <LoadingState rows={5} />
      ) : areas.isError ? (
        <ErrorState error={areas.error} onRetry={() => void areas.refetch()} />
      ) : areas.data.length === 0 ? (
        <EmptyState
          title="No areas yet"
          description="Start from one of these, or create your own."
        >
          {SUGGESTED_AREAS.map((name) => (
            <Button key={name} variant="outline" size="sm" onClick={() => openCreate(name)}>
              {name}
            </Button>
          ))}
        </EmptyState>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Icon</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areas.data.map((area) => (
              <TableRow key={area.id}>
                <TableCell>
                  <span
                    aria-hidden
                    className="border-border block size-4 rounded-full border"
                    style={area.color ? { backgroundColor: area.color } : undefined}
                  />
                </TableCell>
                <TableCell className="font-medium">{area.name}</TableCell>
                <TableCell className="text-muted-foreground">{area.description ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{area.icon ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${area.name}`}
                    onClick={() => openEdit(area)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${area.name}`}
                    onClick={() => setDeleting(area)}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AreaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        area={editing}
        initialName={initialName}
      />

      <ConfirmDialog
        open={deleting !== undefined}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={`Delete ${deleting?.name ?? ""}?`}
        description="Goals tagged with this area keep existing, but lose the label."
        isPending={remove.isPending}
        error={remove.error}
        onConfirm={() => {
          if (!deleting) return;

          remove.mutate(deleting.id, { onSuccess: () => setDeleting(undefined) });
        }}
      />
    </section>
  );
}
