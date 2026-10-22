import type { TabularData } from '../graph/transforms/tabularData';

export interface BarTemplate {
  id: string; name: string; description: string; explanation: string;
  page: string; orientation: 'vertical' | 'horizontal';
  xAxisTitle: string; yAxisTitle: string; data: TabularData;
}
function template(page: string, id: string, name: string, description: string, explanation: string,
  headers: string[], rows: string[][], orientation: BarTemplate['orientation'], unit: string): BarTemplate {
  return { page, id, name, description, explanation, orientation,
    xAxisTitle: orientation === 'horizontal' ? unit : headers[0],
    yAxisTitle: orientation === 'horizontal' ? '' : unit,
    data: { columns: headers.map((name,index) => ({ id: `column-${index+1}`, name, kind: index ? 'number' : 'label' })),
      rows: rows.map((cells,index) => ({ id: `row-${index+1}`, cells })) } };
}
const stacked='/stacked-bar-graph-maker/';
const bar='/bar-graph-maker/', grouped='/grouped-bar-chart-maker/', horizontal='/horizontal-bar-graph-maker/';
export const barTemplates: BarTemplate[] = [
  template(stacked,'quarterly-costs','Quarterly costs','Show how cost categories contribute to each quarterly total.','Q1 totals 100: 60 for staff, 25 for materials and 15 for other costs.',
    ['Quarter','Staff','Materials','Other'],[['Q1','60','25','15'],['Q2','65','30','20'],['Q3','70','35','20']],'vertical','Cost (USD thousands)'),
  template(stacked,'channel-sales','Sales by channel','Compare total sales and the channel mix for each region.','North totals 120 units across online and store sales.',
    ['Region','Online','Store'],[['North','70','50'],['South','45','65'],['West','60','35']],'vertical','Units sold'),
  template(stacked,'project-hours','Project hours','Break down project effort into planning, build and review.','Website work totals 80 hours across three stages.',
    ['Project','Planning','Build','Review'],[['Website','15','50','15'],['Mobile app','20','70','20'],['Dashboard','10','40','10']],'horizontal','Hours'),
  template(bar,'monthly-sales','Monthly sales','Compare sales totals across four months.','April has 64 sales, twice January’s 32.',
    ['Month','Sales'],[['Jan','32'],['Feb','47'],['Mar','55'],['Apr','64']],'vertical','Sales'),
  template(bar,'favorite-subjects','Favorite subjects','Show how many students chose each subject.','Math has 24 votes and Science has 18. Example counts only.',
    ['Subject','Votes'],[['Math','24'],['Science','18'],['English','15'],['Art','21']],'vertical','Votes'),
  template(bar,'product-totals','Product totals','Compare units sold for four products.','Notebooks lead with 96 units; folders have 42.',
    ['Product','Units sold'],[['Notebooks','96'],['Pens','78'],['Folders','42'],['Markers','61']],'vertical','Units sold'),
  template(grouped,'class-comparison','Two classes by subject','Start a double bar graph with two matched datasets.','Class B leads Math by 7 points; Class A leads Science by 6.',
    ['Subject','Class A','Class B'],[['Math','78','85'],['Science','86','80'],['English','82','88']],'vertical','Average score (points)'),
  template(grouped,'year-comparison','This year vs last year','Compare product sales across two periods.','Notebook sales rose from 80 to 110 units.',
    ['Product','Last year','This year'],[['Notebooks','80','110'],['Pens','65','72'],['Folders','40','58']],'vertical','Units sold'),
  template(grouped,'three-teams','Quarterly results for three teams','Use a triple bar graph for three series in the same unit.','Team C completed 44 tasks in Q4; Team A completed 40.',
    ['Quarter','Team A','Team B','Team C'],[['Q1','24','28','22'],['Q2','31','30','34'],['Q3','36','33','39'],['Q4','40','38','44']],'vertical','Completed tasks'),
  template(horizontal,'product-ranking','Product rankings','Read a largest-first ranking from top to bottom.','Headphones have 120 sales and keyboards have 95.',
    ['Product','Sales'],[['Headphones','120'],['Keyboards','95'],['Webcams','72'],['Microphones','54']],'horizontal','Sales'),
  template(horizontal,'survey-choices','Survey choices','Make longer response labels easy to read.','Public transport leads with 86 responses. Rows are already ranked.',
    ['Priority','Responses'],[['Public transport','86'],['Parks and recreation','72'],['Street maintenance','58'],['Library services','41']],'horizontal','Responses'),
  template(horizontal,'department-budgets','Department budgets','Compare named departments on one budget scale.','Customer support has a budget of 84 thousand dollars.',
    ['Department','Budget'],[['Customer support','84'],['Product development','72'],['Sales and marketing','58'],['Administration','36']],'horizontal','Budget (USD thousands)'),
];
export const barTemplatePages = [bar,grouped,horizontal,stacked];
export function templatesForBarPage(page: string): BarTemplate[] { return barTemplates.filter(t => t.page === page); }
export function cloneBarTemplateData(template: BarTemplate): TabularData {
  return { columns: template.data.columns.map(column => ({...column})), rows: template.data.rows.map(row => ({...row,cells:[...row.cells]})) };
}
