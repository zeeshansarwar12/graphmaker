import { useEffect, useState } from "react";
import type { Dispatch } from "react";
import type {
  GraphSettings,
  GraphSettingsAction,
} from "../../graph/configs/graphSettings";
import type { TabularData } from "../../graph/transforms/tabularData";
import type { EquationResult } from "../../graph/equations/sample";
interface Props {
  settings: GraphSettings;
  dispatch: Dispatch<GraphSettingsAction>;
  onData: (data: TabularData) => void;
  onBusy: (busy: boolean) => void;
}
export default function EquationInput({
  settings,
  dispatch,
  onData,
  onBusy,
}: Props) {
  const [errors, setErrors] = useState<Array<string | null>>([]);
  const [notice, setNotice] = useState("Calculating graph…");
  const { equations, cartesian } = settings;
  const requestKey = JSON.stringify([equations,cartesian.xMin,cartesian.xMax,cartesian.yMin,cartesian.yMax]);
  const [settledKey,setSettledKey] = useState<string | null>(null);
  useEffect(() => {
    onBusy(true);

    const worker = new Worker(
      new URL("../../graph/equations/worker.ts", import.meta.url),
      { type: "module" },
    );
    const timer = window.setTimeout(() => {
      worker.terminate();
      setNotice("Calculation took too long. Simplify the equations.");
      onData({
        columns: [
          { id: "equation-x", kind: "number", name: "X" },
          { id: "equation-0", kind: "number", name: "Y" },
        ],
        rows: [],
      });
      onBusy(false); setSettledKey(requestKey);
    }, 4000);
    worker.onmessage = (
      event: MessageEvent<{
        ok: boolean;
        result?: EquationResult;
        error?: string;
      }>,
    ) => {
      window.clearTimeout(timer);
      if (event.data.ok && event.data.result) {
        onData(event.data.result.data);
        setErrors(event.data.result.errors);
        setNotice(
          event.data.result.limited
            ? "Sampling limit reached in some regions; gaps are shown instead of uncertain segments. Zoom in for more detail."
            : "Graph ready. Trigonometric functions use radians.",
        );
      } else {
        setNotice(event.data.error || "Unable to calculate graph.");
        onData({
          columns: [
            { id: "equation-x", kind: "number", name: "X" },
            { id: "equation-0", kind: "number", name: "Y" },
          ],
          rows: [],
        });
      }
      onBusy(false); setSettledKey(requestKey);
      worker.terminate();
    };
    worker.onerror = () => {
      window.clearTimeout(timer);
      setNotice(
        "Unable to load the equation calculator. Reload this page to try again.",
      );
      onData({
        columns: [
          { id: "equation-x", kind: "number", name: "X" },
          { id: "equation-0", kind: "number", name: "Y" },
        ],
        rows: [],
      });
      onBusy(false); setSettledKey(requestKey);
      worker.terminate();
    };
    worker.postMessage({
      expressions: equations,
      min: cartesian.xMin ?? -10,
      max: cartesian.xMax ?? 10,
      yRange: (cartesian.yMax ?? 10) - (cartesian.yMin ?? -10),
    });
    return () => {
      window.clearTimeout(timer);
      worker.terminate();
    };
  }, [
    equations,
    cartesian.xMin,
    cartesian.xMax,
    cartesian.yMin,
    cartesian.yMax,
    onData,
    onBusy,
    requestKey,
  ]);
  function replace(next: string[]) {
    dispatch({
      type: "replace-settings",
      value: { ...settings, equations: next, hiddenSeriesIds: [] },
    });
  }
  return (
    <div>
      <h3 className="text-lg font-bold" id="data-heading">
        Equations
      </h3>
      <p className="text-text-muted my-3 text-sm">
        Enter y = f(x). Use x, pi, e, + − * / ^, parentheses, sin, cos, tan,
        sqrt, abs, ln, log or log10. ln and log mean natural logarithm.
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {["y = 2x + 3", "y = x²", "y = sin(x)", "y = x² - 4"].map((example) => (
          <button
            type="button"
            className="button-secondary"
            key={example}
            onClick={() => replace([example])}
          >
            {example}
          </button>
        ))}
      </div>
      {equations.map((expression, index) => (
        <div className="mb-4" key={index}>
          <label
            className="text-sm font-semibold"
            htmlFor={`expression-${index}`}
          >
            Equation {index + 1}
          </label>
          <div className="flex gap-2 mt-1">
            <input
              id={`expression-${index}`}
              className="border-border min-h-11 min-w-0 flex-1 rounded-md border px-3"
              value={expression}
              maxLength={512}
              aria-invalid={Boolean(errors[index])}
              aria-describedby={
                errors[index] ? `expression-error-${index}` : undefined
              }
              onChange={(event) =>
                replace(
                  equations.map((value, i) =>
                    i === index ? event.target.value : value,
                  ),
                )
              }
            />
            {equations.length > 1 && (
              <button
                type="button"
                className="button-secondary"
                aria-label={`Remove equation ${index + 1}`}
                onClick={() => replace(equations.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            )}
          </div>
          {errors[index] && (
            <p
              className="text-sm text-red-700 mt-1"
              id={`expression-error-${index}`}
              role="alert"
            >
              {errors[index]}
            </p>
          )}
        </div>
      ))}
      <button
        type="button"
        className="button-secondary"
        disabled={equations.length >= 8}
        onClick={() => replace([...equations, ""])}
      >
        Add equation
      </button>
      <p className="text-text-muted mt-3 text-sm" role="status">
        {settledKey === requestKey ? notice : "Calculating graph…"}
      </p>
    </div>
  );
}
