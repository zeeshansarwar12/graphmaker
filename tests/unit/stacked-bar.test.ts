import { describe, expect, it } from 'vitest';
import { createBarChartView } from '../../src/graph/configs/barChart';
import { createDefaultGraphSettings, graphSettingsReducer } from '../../src/graph/configs/graphSettings';
import { stackedBarToolPageConfig } from '../../src/content/stackedBarPage';
import { createProjectSnapshot, parseGraphProject } from '../../src/lib/storage/graphProject';

describe('stacked bar chart', () => {
  it('stacks raw component values with signed stacks and internal labels in either orientation', () => {
    for (const orientation of ['vertical','horizontal'] as const) {
      const settings={...createDefaultGraphSettings(),barLayout:'stacked' as const,orientation};
      const view=createBarChartView(stackedBarToolPageConfig.editor.sampleData!, settings);
      if(view.status!=='ready')throw new Error('Expected ready');
      expect(view.series.map(s=>s.values[0])).toEqual([60,25,15]);
      expect(view.options.series).toMatchObject([
        {stack:'total',stackStrategy:'samesign',label:{position:'inside'}},
        {stack:'total',stackStrategy:'samesign'},
        {stack:'total',stackStrategy:'samesign'},
      ]);
      expect(view.summary).toContain(`${orientation} stacked bar graph`);
      const grouped=createBarChartView(stackedBarToolPageConfig.editor.sampleData!,graphSettingsReducer(settings,{type:'set-bar-layout',value:'grouped'}));
      if(grouped.status!=='ready')throw new Error('Expected ready');
      expect(grouped.series).toEqual(view.series);
      expect(grouped.options.series).not.toMatchObject([{stack:'total'}]);
    }
  });
  it('persists stacking and rejects unsupported modes while legacy projects stay grouped', () => {
    const project=createProjectSnapshot({data:stackedBarToolPageConfig.editor.sampleData!,graphType:'bar',settings:{...createDefaultGraphSettings(),barLayout:'stacked'}});
    const parsed=parseGraphProject(project);
    expect(parsed.ok).toBe(true);
    if(parsed.ok)expect(parsed.project.settings.barLayout).toBe('stacked');
    expect(parseGraphProject({...project,settings:{...project.settings,barLayout:'unknown'}}).ok).toBe(false);
    const legacy={...project,settings:{...project.settings}};delete legacy.settings.barLayout;
    const restored=parseGraphProject(legacy);
    if(!restored.ok)throw new Error('Legacy project rejected');
    expect(restored.project.settings.barLayout).toBe('grouped');
  });
});
