import { Field } from "@/components/field";
import { Input } from "@/components/ui/input";
import { AREA_COLOR_PRESETS, HEX_COLOR } from "./area.schemas";

export function AreaColorField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
}) {
  return (
    <Field label="Color" htmlFor="color" error={error} hint="Optional, e.g. #22c55e">
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label="Pick a color"
          // The picker cannot be empty, so it falls back to a neutral swatch
          // while the text field is blank or half-typed.
          value={HEX_COLOR.test(value) ? value : "#737373"}
          onChange={(event) => onChange(event.target.value)}
          className="border-input h-9 w-12 shrink-0 cursor-pointer rounded-md border bg-transparent p-1"
        />
        <Input
          id="color"
          placeholder="#22c55e"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      <div className="mt-2 flex gap-1.5">
        {AREA_COLOR_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-label={`Use ${preset}`}
            onClick={() => onChange(preset)}
            style={{ backgroundColor: preset }}
            className="size-5 rounded-full ring-offset-2 ring-offset-background hover:ring-2 hover:ring-ring"
          />
        ))}
      </div>
    </Field>
  );
}
