import { describe, expect, it } from "vitest";
import { compileExpression } from "../../src/graph/equations/expression";
import { sampleEquations } from "../../src/graph/equations/sample";
import { linearRegression } from "../../src/graph/statistics/regression";
import { createXyChartView } from "../../src/graph/configs/xyChart";
import { createEquationChartView } from "../../src/graph/configs/equationChart";
import {
  cartesianError,
  coordinatePlane,
  fitCartesianGrid,
} from "../../src/graph/configs/cartesian";
import { createDefaultGraphSettings } from "../../src/graph/configs/graphSettings";
import { createDataFromRows } from "../../src/graph/transforms/tabularData";
import {
  createProjectSnapshot,
  parseGraphProject,
} from "../../src/lib/storage/graphProject";

describe("restricted equation grammar", () => {
  it.each([
    ["y = 2x + 3", -2, -1],
    ["y = x²", -3, 9],
    ["y = sin(x)", Math.PI / 2, 1],
    ["y = x² - 4", 2, 0],
    ["-x^2", 3, -9],
    ["(-x)^2", 3, 9],
    ["2^3^2", 0, 512],
    ["2^-2", 0, 0.25],
    ["2(x+1)", 2, 6],
    ["cos(pi)", 0, -1],
    ["ln(e)", 0, 1],
    ["log10(100)", 0, 2],
    ["sqrt(9)+abs(-2)", 0, 5],
  ])("evaluates %s correctly", (expression, x, y) =>
    expect(compileExpression(expression)(x)).toBeCloseTo(y, 10),
  );
  it.each([
    "globalThis.alert(1)",
    "x.constructor",
    "import(x)",
    "x=3",
    "y=x;alert(x)",
    "[1,2]",
    "x[0]",
    "unknown(x)",
    "2+",
    "sin(x",
    "x < 1",
    "2**3",
    "(".repeat(40) + "x" + ")".repeat(40),
    "x".repeat(513),
  ])("rejects unsupported input: %s", (input) =>
    expect(() => compileExpression(input)).toThrow(),
  );
});
describe("bounded function sampling", () => {
  it("plots known values for all requested examples", () => {
    for (const [expression, x, y] of [
      ["y=2x+3", 0, 3],
      ["y=x²", -2, 4],
      ["y=sin(x)", 0, 0],
      ["y=x²-4", 2, 0],
    ] as const) {
      const result = sampleEquations([expression], -4, 4);
      expect(result.errors).toEqual([null]);
      expect(
        result.data.rows.some(
          (row) =>
            Number(row.cells[0]) === x &&
            row.cells[1] !== "" &&
            Math.abs(Number(row.cells[1]) - y) < 1e-10,
        ),
      ).toBe(true);
    }
  });
  it("breaks lines around a pole that is not a base sample point", () => {
    const result = sampleEquations(["1/(x-0.12345)"], -1, 1);
    const rows = result.data.rows;
    let prior: number | null = null;
    for (const row of rows) {
      if (!row.cells[0] || !row.cells[1]) {
        prior = null;
        continue;
      }
      const x = Number(row.cells[0]);
      if (prior !== null) expect(prior < 0.12345 && x > 0.12345).toBe(false);
      prior = x;
    }
    expect(rows.some((row) => row.cells.every((cell) => cell === ""))).toBe(
      true,
    );
  });
  it("keeps valid domains and isolates errors for multiple equations", () => {
    const result = sampleEquations(["sqrt(x)", "bad(x)", "sin(x)"], -4, 4);
    expect(result.errors[0]).toBeNull();
    expect(result.errors[1]).toContain("Unsupported");
    expect(result.errors[2]).toBeNull();
    expect(
      result.data.rows.some(
        (row) =>
          row.cells[1] !== "" &&
          Number(row.cells[0]) === 4 &&
          Number(row.cells[1]) === 2,
      ),
    ).toBe(true);
    expect(
      result.data.rows
        .filter((row) => row.cells[1] !== "")
        .every((row) => Number(row.cells[0]) >= 0),
    ).toBe(true);
    expect(result.data.rows.length).toBeLessThan(30000);
  });
  it("rejects invalid domains and too many functions", () => {
    expect(() => sampleEquations(["x"], 1, 1)).toThrow();
    expect(() => sampleEquations(new Array(9).fill("x"), -1, 1)).toThrow();
  });
});
describe("XY and coordinate-plane correctness", () => {
  it("plots all Y series with gaps, negative values, names and working visibility", () => {
    const data = createDataFromRows([
      ["Name", "X", "A", "B"],
      ["P", "-2", "-4", "3"],
      ["Q", "0", "", "5"],
      ["R", "3", "6", "7"],
    ]);
    const settings = { ...createDefaultGraphSettings(), showValueLabels: true };
    const view = createXyChartView(data, settings);
    if (view.status !== "ready") throw new Error("not ready");
    expect(view.series.map((series) => series.name)).toEqual(["A", "B"]);
    expect(view.options.series).toMatchObject([
      { data: [[-2, -4], null, [3, 6]], label: { show: true } },
      {
        data: [
          [-2, 3],
          [0, 5],
          [3, 7],
        ],
      },
    ]);
    expect(view.options.legend).toMatchObject({ show: true, data: ["A", "B"] });
    const hidden = createXyChartView(data, {
      ...settings,
      hiddenSeriesIds: [data.columns[2].id],
    });
    if (hidden.status !== "ready") throw new Error("not ready");
    expect(hidden.series.map((s) => s.name)).toEqual(["B"]);
  });
  it("validates bounds and density and maintains equal physical units", () => {
    expect(cartesianError({ ...coordinatePlane, xMin: 10 })).toContain(
      "minimum",
    );
    expect(cartesianError({ ...coordinatePlane, xStep: 0 })).toContain(
      "positive",
    );
    expect(cartesianError({ ...coordinatePlane, xStep: 0.00001 })).toContain(
      "200",
    );
    expect(cartesianError({ ...coordinatePlane, xMin: 1 })).toContain("zero");
    const fitted = fitCartesianGrid({}, coordinatePlane, 700, 320);
    expect(fitted.grid).toMatchObject({ width: 220, height: 220 });
  });
  it("restores old projects and validates equation/axis settings", () => {
    const snapshot = createProjectSnapshot({
      graphType: "xy",
      data: createDataFromRows([
        ["X", "Y"],
        ["1", "2"],
      ]),
      settings: createDefaultGraphSettings(),
    });
    const legacy = JSON.parse(JSON.stringify(snapshot));
    delete legacy.settings.cartesian;
    delete legacy.settings.equations;
    const parsed = parseGraphProject(legacy);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.project.settings.cartesian.xMin).toBeNull();
    expect(
      parseGraphProject({
        ...snapshot,
        settings: {
          ...snapshot.settings,
          cartesian: { ...coordinatePlane, xMin: 20 },
        },
      }).ok,
    ).toBe(false);
    expect(parseGraphProject({ ...snapshot, graphType: "equation" }).ok).toBe(
      true,
    );
  });
  it("uses function values in the shared chart without point markers", () => {
    const sampled = sampleEquations(["x^2"], -2, 2);
    const view = createEquationChartView(sampled.data, {
      ...createDefaultGraphSettings(),
      cartesian: coordinatePlane,
    });
    expect(view.status).toBe("ready");
    if (view.status === "ready") {
      expect(view.options.series).toMatchObject([{ showSymbol: false }]);
      expect(view.series[0].values).toContain(4);
    }
  });
});
describe("least-squares regression", () => {
  it("computes a known line and R²", () => {
    expect(
      linearRegression([
        [-2, -1],
        [0, 3],
        [2, 7],
      ]),
    ).toMatchObject({ slope: 2, intercept: 3, rSquared: 1 });
    const result = linearRegression([
      [-2, 4],
      [-1, 1],
      [0, 0],
      [1, 1],
      [2, 4],
    ]);
    expect(result).toMatchObject({ slope: 0, rSquared: 0 });
  });
  it("reports degenerate data instead of fabricated fit statistics", () => {
    expect(linearRegression([[1, 2]])).toHaveProperty("error");
    expect(
      linearRegression([
        [1, 2],
        [1, 3],
      ]),
    ).toHaveProperty("error");
    expect(
      linearRegression([
        [1, 4],
        [2, 4],
        [3, 4],
      ]),
    ).toMatchObject({ slope: 0, intercept: 4, rSquared: null });
  });
});


it('does not reduce high-frequency sine to an aliased flat line', () => {
  const result = sampleEquations(['sin(128*pi*x)'], -1, 1);
  expect(result.data.rows.some(row => row.cells[1] !== '' && Math.abs(Number(row.cells[1])) > 0.8)).toBe(true);
});
it('does not export an invalid equation as a blank valid graph', () => {
  const result = sampleEquations(['bad(x)'], -1, 1);
  expect(createEquationChartView(result.data, {...createDefaultGraphSettings(),cartesian:coordinatePlane}).status).toBe('empty');
});

it('validates and roundtrips an equation table backup',()=>{
 const settings=createDefaultGraphSettings();
 const data=createDataFromRows([['Category','Value'],['English','72']]);
 const project=createProjectSnapshot({data,settings,graphType:'equation',tableBackup:{data,settings}});
 const result=parseGraphProject(JSON.parse(JSON.stringify(project)));
 expect(result.ok).toBe(true);
 if(result.ok) expect(result.project.tableBackup).toEqual({data,settings});
 expect(parseGraphProject({...project,tableBackup:{data:{},settings}}).ok).toBe(false);
});
