import { useEffect, useRef } from 'react';
import { templatesForBarPage } from '../../content/barTemplates';
import type { BarTemplate } from '../../content/barTemplates';
import type { BarDraft } from '../../lib/storage/barDrafts';

interface Props {
  page: string; ready: boolean; drafts: BarDraft[]; activeId: string; title: string;
  onApply: (template: BarTemplate) => void; onOpen: (id: string) => void; onDelete: () => void;
}
export default function BarTemplateControls({ page, ready, drafts, activeId, title, onApply, onOpen, onDelete }: Props) {
  const templates=templatesForBarPage(page);
  const initialHandled=useRef(false);
  useEffect(()=>{
    if(!ready)return;
    const applyHash=()=>{
      const template=templatesForBarPage(page).find(t=>`#bar-template-${t.id}`===window.location.hash);
      if(template)onApply(template);
    };
    if(!initialHandled.current){initialHandled.current=true;applyHash();}
    const onClick=(event: MouseEvent)=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const link=event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#bar-template-"]') : null;
      if(!link)return;
      const template=templatesForBarPage(page).find(t=>link.hash===`#bar-template-${t.id}`);
      if(!template)return;
      event.preventDefault();window.history.replaceState(null,'',link.hash);onApply(template);
    };
    window.addEventListener('hashchange',applyHash);document.addEventListener('click',onClick);
    return ()=>{window.removeEventListener('hashchange',applyHash);document.removeEventListener('click',onClick);};
  },[ready,page,onApply]);
  return <div className="border-border bg-surface-subtle mb-4 rounded-md border p-3">
    <label className="block text-sm font-semibold">Bar template
      <select aria-label="Bar template" className="border-border mt-1 min-h-11 w-full rounded-md border bg-white px-3" value="" disabled={!ready} onChange={event=>{
        const template=templates.find(t=>t.id===event.target.value);if(template)onApply(template);
      }}><option value="">Choose a starting example</option>{templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
    </label>
    <label className="mt-3 block text-sm font-semibold">My graphs
      <select aria-label="My graphs" className="border-border mt-1 min-h-11 w-full rounded-md border bg-white px-3" value={activeId} disabled={!ready} onChange={event=>onOpen(event.target.value)}>
        {!drafts.length&&<option value={activeId}>{title}</option>}
        {drafts.map((draft,index)=><option key={draft.id} value={draft.id}>{draft.id===activeId?title:draft.project.settings.title} · {index+1}</option>)}
      </select>
    </label>
    <p className="text-text-muted mt-2 text-xs leading-5">Templates open new graphs and keep your current work. Up to 20 per page, saved in this browser.</p>
    {drafts.length>1&&<button className="text-text-muted mt-2 min-h-10 text-sm underline" type="button" onClick={onDelete}>Delete current graph</button>}
  </div>;
}
