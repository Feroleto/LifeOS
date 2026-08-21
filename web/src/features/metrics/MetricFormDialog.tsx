import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { ChipButton } from "@/components/chip-button";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessages } from "@/lib/errors";
import { metricFormDefaults, metricFormSchema, toCreateMetricBody } from "./metric.schemas";
import type { MetricFormValues } from "./metric.schemas";
import { seriesLabel } from "./metric-series";
import type { MetricSeries } from "./metric-series";
import { useCreateMetric } from "./metrics.queries";

/**
 * Recording one measurement.
 *
 * There is no edit mode and no `metric` prop: `METRIC` is append-only, so this
 * dialog only ever creates. Correcting a reading is deleting it and recording
 * another, which is what the card's "Undo last reading" is for.
 */
export function MetricFormDialog({
  open,
  onOpenChange,
  areaId,
  timeZone,
  today,
  existingSeries,
  seriesKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The area this measurement is filed under, straight from the route. */
  areaId: string;
  /** The user's own zone — what `recordedAt` is anchored in. */
  timeZone: string;
  today: string;
  /**
   * The series this area already has, which is the **only** source of
   * candidate keys: `key` is a free string and the API keeps no registry of the
   * ones in use, so these come from the window the page swept.
   */
  existingSeries: MetricSeries[];
  /** Preselects one of them — set when the dialog is opened from its card. */
  seriesKey?: string | undefined;
}) {
  /*
    The series the form opens on: the one the caller named, or else the first —
    `toSeries` orders by the most recent reading, so that is the one the user
    touched last. Falling back matters because the chip row is the only way to
    set a key while `isNewSeries` is false; opening with none selected would
    leave the field unreachable.
  */
  const seed = existingSeries.find((series) => series.key === seriesKey) ?? existingSeries[0];

  /*
    The reset below depends on these two rather than on `seed`, so that a caller
    recomputing `existingSeries` on every render — which is what `toSeries` over
    a query result does — cannot re-run it under the user's typing.
  */
  const seedKey = seed?.key ?? "";
  const seedUnit = seed?.unit ?? "";

  // Whether the key is typed rather than picked. An area with no series has
  // nothing to pick from, so it starts there.
  const [isNewSeries, setIsNewSeries] = useState(!seedKey);

  const form = useForm<MetricFormValues>({
    resolver: zodResolver(metricFormSchema),
    defaultValues: metricFormDefaults(today, seedKey, seedUnit),
  });

  const create = useCreateMetric();

  useEffect(() => {
    if (open) {
      form.reset(metricFormDefaults(today, seedKey, seedUnit));
      setIsNewSeries(!seedKey);
    }
  }, [open, today, seedKey, seedUnit, form]);

  const key = form.watch("key");

  /**
   * Picking an existing series carries its unit over, so `sleep_hours` does not
   * quietly acquire a second one — the unit of the latest reading is what every
   * card headlines.
   */
  function selectSeries(series: MetricSeries) {
    setIsNewSeries(false);
    form.setValue("key", series.key, { shouldValidate: true });
    form.setValue("unit", series.unit ?? "");
  }

  const submit = form.handleSubmit(async (values) => {
    try {
      await create.mutateAsync(toCreateMetricBody(values, timeZone, areaId));

      onOpenChange(false);
    } catch (error) {
      form.setError("root", { message: errorMessages(error).join(" ") });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-[28px] leading-tight font-normal">
            Record measurement
          </DialogTitle>
          <DialogDescription>
            A number and the day it was measured. Readings sharing a series name are charted
            together.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-[18px]" onSubmit={submit} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label>Series</Label>
            <div className="flex flex-wrap gap-1.5">
              {existingSeries.map((series) => (
                <ChipButton
                  key={series.key}
                  variant="solid"
                  selected={!isNewSeries && key === series.key}
                  onClick={() => selectSeries(series)}
                >
                  {seriesLabel(series.key)}
                </ChipButton>
              ))}

              <ChipButton
                variant="solid"
                selected={isNewSeries}
                onClick={() => {
                  setIsNewSeries(true);
                  form.setValue("key", "");
                  form.setValue("unit", "");
                }}
              >
                New series…
              </ChipButton>
            </div>
          </div>

          {isNewSeries ? (
            <Field
              label="Series name"
              htmlFor="key"
              hint="snake_case — it is the only name a series has"
              error={form.formState.errors.key?.message}
            >
              <Input id="key" autoFocus placeholder="body_weight" {...form.register("key")} />
            </Field>
          ) : form.formState.errors.key ? (
            <p className="text-destructive text-xs">{form.formState.errors.key.message}</p>
          ) : null}

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Value" htmlFor="value" error={form.formState.errors.value?.message}>
              <Input id="value" inputMode="decimal" autoFocus={!isNewSeries} {...form.register("value")} />
            </Field>

            <Field
              label="Unit"
              htmlFor="unit"
              hint="Optional"
              error={form.formState.errors.unit?.message}
            >
              <Input id="unit" placeholder="kg" {...form.register("unit")} />
            </Field>
          </div>

          <Field
            label="Measured on"
            htmlFor="recordedAt"
            error={form.formState.errors.recordedAt?.message}
          >
            <Input id="recordedAt" type="date" {...form.register("recordedAt")} />
          </Field>

          {form.formState.errors.root ? (
            <p className="text-destructive text-xs">{form.formState.errors.root.message}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Saving…" : "Record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
