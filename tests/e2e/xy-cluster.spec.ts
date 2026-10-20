import * as XLSX from 'xlsx';
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { openPage, reloadPage } from "./navigation";
import type { Page } from "@playwright/test";
async function paste(page: Page, label: string, text: string) {
  await page.getByLabel(label, { exact: true }).evaluate((element, text) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", text);
    element.dispatchEvent(
      new ClipboardEvent("paste", { bubbles: true, clipboardData }),
    );
  }, text);
}
async function ready(page: Page) {
  await expect(
    page.getByRole("status").filter({ hasText: "Graph ready." }),
  ).toBeVisible();
  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();
}
test("XY plots multiple series and exports the same named coordinates", async ({
  page,
}) => {
  await openPage(page, "/xy-graph-maker/");
  await paste(
    page,
    "X, row 1",
    "Name\tX\tA\tB\nP\t-2\t-4\t3\nQ\t0\t0\t5\nR\t3\t6\t7",
  );
  await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute(
    "data-series-count",
    "2",
  );
  await expect(
    page.getByRole("button", { name: "Switch to Box Plot", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "A and B by X", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await page.getByLabel("Show value labels", { exact: true }).check();
  await page
    .getByRole("button", { name: "Coordinate plane", exact: true })
    .click();
  await expect(page.getByLabel("X minimum", { exact: true })).toHaveValue(
    "-10",
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "SVG", exact: true }).click();
  const file = await download;
  const svg = await readFile((await file.path())!, "utf8");
  expect(svg).toContain("P (-2, -4)");
  expect(svg).toContain("P (-2, 3)");
  expect(svg).toContain("R (3, 7)");
  await page.getByLabel("Show A series", { exact: true }).uncheck();
  await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute(
    "data-series-count",
    "1",
  );
  await page.getByRole("button", { name: "Save locally", exact: true }).click();
  await expect(
    page.getByText("Autosaved on this device. No cloud backup.", {
      exact: true,
    }),
  ).toBeVisible();
  await reloadPage(page);
  await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute(
    "data-series-count",
    "1",
  );
});
test("XY validates axis settings and supports clicking onto an empty plane", async ({
  page,
}) => {
  await openPage(page, "/xy-graph-maker/");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await page
    .getByRole("button", { name: "Coordinate plane", exact: true })
    .click();
  await page.getByLabel("X minimum", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Apply axes", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("minimum");
  await page
    .getByRole("button", { name: "Coordinate plane", exact: true })
    .click();
  await page.getByLabel("Click to plot", { exact: true }).check();
  const canvas = page.locator('[data-chart-status="ready"] canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await canvas.click({
    position: { x: box!.width / 2 + 10, y: box!.height / 2 - 15 },
  });
  await expect(page.locator('[data-chart-status="ready"]')).toContainText(
    "1 point",
  );
  await expect(page.getByLabel("X, row 2", { exact: true })).toHaveValue("0");
  await expect(page.getByLabel("Y, row 2", { exact: true })).toHaveValue("0");
  await page.getByRole('button',{name:'Add point names',exact:true}).click();
  await page.getByLabel('Point name, row 2',{exact:true}).fill('O');
  await page.getByLabel('Show value labels',{exact:true}).check();
  const namedDownload=page.waitForEvent('download');await page.getByRole('button',{name:'SVG',exact:true}).click();
  expect(await readFile((await(await namedDownload).path())!,'utf8')).toContain('O (0, 0)');
});
test("Scatter computes the known regression and handles a constant X", async ({
  page,
}) => {
  await openPage(page, "/scatter-plot-maker/");
  await paste(page, "Hours Studied, row 1", "X\tY\n-2\t-1\n0\t3\n2\t7");
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await page.getByLabel("Linear trendline and R²", { exact: true }).check();
  await expect(page.locator("[data-chart-insight]")).toHaveText(
    "y = 2x + 3; R² = 1",
  );
  await paste(page, "X, row 1", "X\tY\n1\t2\n1\t3");
  await expect(page.locator("[data-chart-insight]")).toContainText(
    "different X",
  );
});
test("Equation graphs all requested examples, multiple functions and rejects code", async ({
  page,
}) => {
  await openPage(page, "/equation-graph-maker/");
  await ready(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Equation Graph Maker",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://graphmaker.site/equation-graph-maker/",
  );
  for (const expression of [
    "y = 2x + 3",
    "y = x²",
    "y = sin(x)",
    "y = x² - 4",
  ]) {
    await page.getByLabel("Equation 1", { exact: true }).fill(expression);
    await ready(page);
    await expect(page.locator('[data-chart-status="ready"]')).toContainText(
      expression,
    );
  }
  await page.getByRole("button", { name: "Add equation", exact: true }).click();
  await page.getByLabel("Equation 2", { exact: true }).fill("y = sin(x)");
  await ready(page);
  await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute(
    "data-series-count",
    "2",
  );
  await page
    .getByLabel("Equation 1", { exact: true })
    .fill("globalThis.alert(1)");
  await expect(page.locator("#expression-error-0")).toBeVisible();
  await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute(
    "data-series-count",
    "1",
  );
  await page.getByLabel("Equation 1", { exact: true }).fill("y = x² - 4");
  await ready(page);
  await page.getByRole("button", { name: "Save locally", exact: true }).click();
  await expect(
    page.getByText("Autosaved on this device. No cloud backup.", {
      exact: true,
    }),
  ).toBeVisible();
  await reloadPage(page);
  await ready(page);
  await expect(page.getByLabel("Equation 1", { exact: true })).toHaveValue(
    "y = x² - 4",
  );
  await expect(page.getByLabel("Equation 2", { exact: true })).toHaveValue(
    "y = sin(x)",
  );
});
test("Equation zoom, pan, exports and narrow layout preserve the current view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page, "/equation-graph-maker/");
  await ready(page);
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await ready(page);
  await expect(page.getByLabel("X minimum", { exact: true })).toHaveValue("-5");
  await expect(page.getByLabel("X maximum", { exact: true })).toHaveValue("5");
  await page.getByRole("button", { name: "Pan right", exact: true }).click();
  await ready(page);
  await expect(page.getByLabel("X minimum", { exact: true })).toHaveValue(
    "-2.5",
  );
  await expect(page.getByLabel("X maximum", { exact: true })).toHaveValue(
    "7.5",
  );
  const svgDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "SVG", exact: true }).click();
  const svg = await readFile((await (await svgDownload).path())!, "utf8");
  expect(svg).toContain("<svg");
  expect(svg).toContain("y = 2x + 3");
  const pngDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG", exact: true }).click();
  const png = await readFile((await (await pngDownload).path())!);
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(png.readUInt32BE(16)).toBeGreaterThan(300);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "Reset axes", exact: true }).click();
  await ready(page);
  await expect(page.getByLabel("X minimum", { exact: true })).toHaveValue(
    "-10",
  );
});


test('equation viewport gestures, keyboard inputs and print view remain usable', async ({page}) => {
  await page.setViewportSize({width:1280,height:900});
  await openPage(page,'/equation-graph-maker/');await ready(page);
  await page.getByLabel('Equation 1',{exact:true}).focus();
  await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type('y = x^2 - 4');await ready(page);
  await expect(page.getByLabel('Equation 1',{exact:true})).toHaveAttribute('aria-invalid','false');
  await page.getByRole('button',{name:'Customize',exact:true}).click();
  const canvas=page.locator('[data-chart-status="ready"] canvas'); await canvas.scrollIntoViewIfNeeded();
  const box=await canvas.boundingBox();expect(box).not.toBeNull();
  await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2);await page.mouse.down();await page.mouse.move(box!.x+box!.width/2+35,box!.y+box!.height/2,{steps:5});await page.mouse.up();await ready(page);
  await expect(page.getByLabel('X minimum',{exact:true})).not.toHaveValue('-10');
  await page.getByRole('button',{name:'Reset axes',exact:true}).click();await ready(page);
  await page.getByRole('button',{name:'Customize',exact:true}).click();
  await page.locator('#editor').screenshot({path:'verification-logs/equation-desktop.png'});
  await page.emulateMedia({media:'print'});
  await expect(canvas).toBeVisible();await expect(page.getByRole('button',{name:'Print graph',exact:true})).not.toBeVisible();
  await expect(page.getByText('Autosaved on this device. No cloud backup.',{exact:true})).not.toBeVisible();
  await page.locator('section[aria-labelledby="preview-heading"]').screenshot({path:'verification-logs/equation-print.png'});
});


for (const format of ['csv','xlsx'] as const) {
  test(`XY imports ${format} values without changing signed coordinates`,async({page}) => {
    await openPage(page,'/xy-graph-maker/');
    const rows=[['X','A','B'],[-2,-4,3],[0,0,5],[3,6,7]];
    let buffer:Buffer;
    if(format==='csv') buffer=Buffer.from(rows.map(row=>row.join(',')).join('\n'));
    else {const workbook=XLSX.utils.book_new();XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet(rows),'XY');buffer=Buffer.from(XLSX.write(workbook,{bookType:'xlsx',type:'buffer'}));}
    await page.getByLabel(format==='csv'?'Choose CSV file':'Choose XLSX file').setInputFiles({buffer,name:`coordinates.${format}`,mimeType:format==='csv'?'text/csv':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    await page.getByRole('button',{name:'Replace data',exact:true}).click();
    await expect(page.getByLabel('X, row 1',{exact:true})).toHaveValue('-2');await expect(page.getByLabel('A, row 1',{exact:true})).toHaveValue('-4');await expect(page.getByLabel('B, row 3',{exact:true})).toHaveValue('7');
    await expect(page.locator('[data-chart-status="ready"]')).toHaveAttribute('data-series-count','2');
  });
}
