import { z } from "zod";

import type { Area } from "./area.types";

/**
 * @IsHexColor would also take #rgb and rrggbb, but <input type="color"> always
 * emits the six-digit form, so accepting only that keeps both inputs in sync.
 */
export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const AREA_COLOR_PRESETS = ["#22c55e", "#3b82f6", "#eab308", "#a855f7", "#f97316"];

export const areaFormSchema = z.object({
  name: z.string().trim().min(1, "Required").max(80, "At most 80 characters"),
  description: z.string().trim().max(500, "At most 500 characters"),
  color: z
    .string()
    .trim()
    .refine((value) => value === "" || HEX_COLOR.test(value), "Use a hex color like #22c55e"),
  icon: z.string().trim().max(40, "At most 40 characters"),
});

export type AreaFormValues = z.infer<typeof areaFormSchema>;

export type CreateAreaBody = {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
};

export type UpdateAreaBody = {
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
};

export function areaFormDefaults(area?: Area): AreaFormValues {
  return {
    name: area?.name ?? "",
    description: area?.description ?? "",
    color: area?.color ?? "",
    icon: area?.icon ?? "",
  };
}

/**
 * The form models "not filled in" as "", which the DTO rejects: "" fails
 * @IsHexColor and @MinLength(1). Empty keys are dropped instead.
 */
export function toCreateAreaBody(values: AreaFormValues): CreateAreaBody {
  const body: CreateAreaBody = { name: values.name.trim() };
  const description = values.description.trim();
  const color = values.color.trim();
  const icon = values.icon.trim();

  if (description) body.description = description;
  if (color) body.color = color;
  if (icon) body.icon = icon;

  return body;
}

/**
 * On PATCH, clearing an optional field needs an explicit null: @IsOptional()
 * lets null through and Prisma writes it, whereas omitting the key would keep
 * whatever is stored.
 */
export function toUpdateAreaBody(values: AreaFormValues): UpdateAreaBody {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    color: values.color.trim() || null,
    icon: values.icon.trim() || null,
  };
}
