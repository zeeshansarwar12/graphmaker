import { compileExpression } from "./expression";
import type { TabularData } from "../transforms/tabularData";
export interface EquationResult {
  data: TabularData;
  errors: Array<string | null>;
  limited: boolean;
}
export function sampleEquations(
  expressions: string[],
  min: number,
  max: number,
  yRange = 20,
): EquationResult {
  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    max <= min ||
    max - min < 1e-8 ||
    Math.max(Math.abs(min), Math.abs(max)) > 1e9
  )
    throw new Error("Choose a valid X range.");
  if (expressions.length > 8) throw new Error("Use at most 8 equations.");
  const errors: Array<string | null> = [],
    curves: Array<Array<[number, number] | null>> = [];
  let limited = false;
  expressions.forEach((expression) => {
    let evaluate: (x: number) => number;
    try {
      evaluate = compileExpression(expression);
      errors.push(null);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Invalid equation.");
      curves.push([]);
      return;
    }
    const points: Array<[number, number] | null> = [];
    let evaluations = 0;
    const at = (x: number): number => {
      if (evaluations >= 8192) { limited = true; return NaN; }
      evaluations++;
      return evaluate(x);
    };
    function segment(
      a: number,
      ya: number,
      b: number,
      yb: number,
      depth: number,
    ) {
      if (evaluations >= 8192) {
        limited = true;
        points.push(null);
        return;
      }
      const middle = (a + b) / 2,
        ym = at(middle);
      // An irrational interior probe reduces regular-grid aliasing of oscillatory functions.
      const fraction = 0.3819660112501051;
      const probe = at(a + (b - a) * fraction);
      if ([ya, ym, yb, probe].every((value) => !Number.isFinite(value))) {
        points.push(null);
        return;
      }
      const finite = [ya, ym, yb, probe].every(Number.isFinite);
      const deviation = Math.max(Math.abs(ym - (ya + yb) / 2), Math.abs(probe - (ya + (yb - ya) * fraction)));
      const unresolved = !finite || deviation > Math.max(1e-10, yRange / 800);
      if (unresolved && depth < 8) {
        segment(a, ya, middle, ym, depth + 1);
        segment(middle, ym, b, yb, depth + 1);
      } else {
        if (unresolved) {
          points.push(null);
          if (finite) limited = true;
        }
        points.push(Number.isFinite(yb) ? [b, yb] : null);
      }
    }
    let a = min,
      ya = at(a);
    points.push(Number.isFinite(ya) ? [a, ya] : null);
    for (let i = 1; i <= 128; i++) {
      const b = min + ((max - min) * i) / 128,
        yb = at(b);
      segment(a, ya, b, yb, 0);
      a = b;
      ya = yb;
    }
    if (!points.some((point) => point !== null))
      errors[errors.length - 1] = "No real finite values in this X range.";
    curves.push(points);
  });
  // Each curve uses its own rows; null rows break lines without joining discontinuities.
  const rows: TabularData["rows"] = [];
  curves.forEach((curve, index) => {
    curve.forEach((point) => {
      const cells = new Array(expressions.length + 1).fill("");
      if (point) {
        cells[0] = String(point[0]);
        cells[index + 1] = String(point[1]);
      }
      rows.push({ id: `equation-row-${rows.length}`, cells });
    });
    rows.push({
      id: `equation-row-${rows.length}`,
      cells: new Array(expressions.length + 1).fill(""),
    });
  });
  return {
    data: {
      columns: [
        { id: "equation-x", kind: "number", name: "X" },
        ...expressions.map((expression, index) => ({
          id: `equation-${index}`,
          kind: "number" as const,
          name: expression || `Equation ${index + 1}`,
        })),
      ],
      rows,
    },
    errors,
    limited,
  };
}
