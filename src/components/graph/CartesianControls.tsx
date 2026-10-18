import { useState } from "react";
import type { Dispatch } from "react";
import {
  cartesianError,
  coordinatePlane,
  defaultCartesian,
} from "../../graph/configs/cartesian";
import type { CartesianSettings } from "../../graph/configs/cartesian";
import type {
  GraphSettings,
  GraphSettingsAction,
} from "../../graph/configs/graphSettings";
interface Props {
  settings: GraphSettings;
  dispatch: Dispatch<GraphSettingsAction>;
  equation?: boolean;
}
export function CartesianControls({
  settings,
  dispatch,
  equation = false,
}: Props) {
  const [draft, setDraft] = useState<CartesianSettings>({
    ...settings.cartesian,
  });
  const [error, setError] = useState<string | null>(null);
  function apply(axes: CartesianSettings) {
    const problem = cartesianError(axes);
    setError(problem);
    if (problem) return;
    setDraft(axes);
    dispatch({
      type: "replace-settings",
      value: { ...settings, cartesian: axes },
    });
  }
  function navigate(scale: number, x = 0, y = 0) {
    const a = settings.cartesian,
      minX = a.xMin ?? -10,
      maxX = a.xMax ?? 10,
      minY = a.yMin ?? -10,
      maxY = a.yMax ?? 10;
    const dx = ((maxX - minX) * scale) / 2,
      dy = ((maxY - minY) * scale) / 2;
    const cx = (minX + maxX) / 2 + (x * (maxX - minX)) / 4,
      cy = (minY + maxY) / 2 + (y * (maxY - minY)) / 4;
    apply({
      ...a,
      xMin: cx - dx,
      xMax: cx + dx,
      yMin: cy - dy,
      yMax: cy + dy,
      xStep: null,
      yStep: null,
      origin: false,
    });
  }
  return (
    <fieldset className="border-border mt-4 border-t pt-4">
      <legend className="text-sm font-semibold">
        Axes and coordinate plane
      </legend>
      <div className="my-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="button-secondary"
          onClick={() => apply({ ...coordinatePlane })}
        >
          Coordinate plane
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={() =>
            apply(
              equation
                ? { ...coordinatePlane, xStep: null, yStep: null }
                : { ...defaultCartesian },
            )
          }
        >
          Reset axes
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["x", "y"] as const).flatMap((axis) =>
          (["Min", "Max", "Step"] as const).map((part) => {
            const key = `${axis}${part}` as
              "xMin" | "xMax" | "yMin" | "yMax" | "xStep" | "yStep";
            const label = `${axis.toUpperCase()} ${part === "Min" ? "minimum" : part === "Max" ? "maximum" : "grid spacing"}`;
            return (
              <label key={key} className="text-sm">
                {label}
                <input
                  type="number"
                  step="any"
                  className="border-border mt-1 min-h-10 w-full rounded-md border px-3"
                  placeholder="Auto"
                  value={draft[key] ?? ""}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      [key]:
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                    })
                  }
                />
              </label>
            );
          }),
        )}
      </div>
      <div className="my-3 flex flex-wrap gap-4">
        {(["origin", "equalScale"] as const).map((key) => (
          <label key={key} className="text-sm">
            <input
              type="checkbox"
              checked={draft[key]}
              onChange={(event) =>
                setDraft({ ...draft, [key]: event.target.checked })
              }
            />{" "}
            {key === "origin" ? "Show origin axes" : "Equal unit scale"}
          </label>
        ))}
      </div>
      <button
        type="button"
        className="button-secondary"
        onClick={() => apply(draft)}
      >
        Apply axes
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {equation && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="button-secondary"
            onClick={() => navigate(0.5)}
          >
            Zoom in
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => navigate(2)}
          >
            Zoom out
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => navigate(1, -1)}
          >
            Pan left
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => navigate(1, 1)}
          >
            Pan right
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => navigate(1, 0, 1)}
          >
            Pan up
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => navigate(1, 0, -1)}
          >
            Pan down
          </button>
        </div>
      )}
    </fieldset>
  );
}
