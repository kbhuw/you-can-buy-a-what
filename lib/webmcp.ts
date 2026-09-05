'use client';

import {useEffect, useRef} from 'react';
import {flushSync} from 'react-dom';
import type {Property} from './catalog';
import {whimsicalPicks} from './discovery';

type Input = Record<string, unknown>;
type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: {readOnlyHint: boolean; untrustedContentHint: boolean};
  execute: (input: Input) => unknown;
};
type ModelContext = {
  registerTool: (tool: Tool, options?: {signal: AbortSignal}) => void | Promise<void>;
  unregisterTool?: (name: string) => void;
};
type State = {
  properties: Property[];
  saved: string[];
  setSaved: (update: (ids: string[]) => string[]) => void;
  showItem: (id: string) => void;
};
const schema = (properties: Input = {}, required: string[] = []) => ({type: 'object', properties, required, additionalProperties: false});
const idSchema = {type: 'string', minLength: 1, description: 'Exact item ID returned by search_items or get_whimsical_items.'};
const summary = (p: Property) => ({id:p.id, title:p.title, location:p.location, category:p.category, source:p.agency, status:p.status, price:p.price, currency:'USD', priceLabel:p.priceLabel, checkedAt:p.checkedAt, restrictions:p.disclaimer, officialUrl:p.source});

function text(input: Input, key: string, required = false): string {
  const value = input[key];
  if (value === undefined && !required) return '';
  if (typeof value !== 'string' || (required && !value.trim())) throw new Error(`${key} must be a nonempty string.`);
  return value.trim();
}
function number(input: Input, key: string, fallback?: number): number | undefined {
  const value = input[key];
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`${key} must be a nonnegative number.`);
  return value;
}

export function useCatalogWebMCP(state: State) {
  const current = useRef(state);
  useEffect(() => { current.current = state; });
  useEffect(() => {
    const modern = (document as Document & {modelContext?: ModelContext}).modelContext;
    const context = modern ?? (navigator as Navigator & {modelContext?: ModelContext}).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    const registered: string[] = [];
    const item = (input: Input) => {
      const id = text(input, 'id', true);
      const found = current.current.properties.find(p => p.id === id);
      if (!found) throw new Error(`Unknown item ID: ${id}`);
      return found;
    };
    const tool = (name: string, description: string, inputSchema: Tool['inputSchema'], readOnly: boolean, execute: Tool['execute']): Tool => ({
      name, description, inputSchema, annotations: {readOnlyHint: readOnly, untrustedContentHint: true},
      execute(input) {
        try {
          if (controller.signal.aborted) throw new Error('This page has unmounted.');
          if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Input must be an object.');
          const allowed = Object.keys(inputSchema.properties as Input);
          if (Object.keys(input).some(key => !allowed.includes(key))) throw new Error('Unknown input parameter.');
          return execute(input);
        } catch (error) { return {error: error instanceof Error ? error.message : 'Tool execution failed.'}; }
      }
    });
    const tools = [
      tool('search_items', 'Search the full government catalog, independently of visible filters. Returns a paginated snapshot; prices can be bids, not purchase prices. Does not change the page. Use show_item to open a result.', schema({
        query:{type:'string',description:'Keywords in title, location, category or description.'},
        source:{type:'string',description:'Agency name, e.g. GSA surplus, Treasury, HUD.'},
        category:{type:'string'}, location:{type:'string'},
        max_price:{type:'number',minimum:0,description:'Maximum published USD amount; excludes missing prices. May be a bid or acquisition cost, not total purchase cost.'},
        priced_only:{type:'boolean'},
        limit:{type:'integer',minimum:1,maximum:50,default:20}, offset:{type:'integer',minimum:0,default:0}
      }), true, input => {
        const query=text(input,'query').toLowerCase(), source=text(input,'source').toLowerCase(), category=text(input,'category').toLowerCase(), location=text(input,'location').toLowerCase();
        const max=number(input,'max_price'), limit=number(input,'limit',20)!, offset=number(input,'offset',0)!;
        if (!Number.isInteger(limit) || limit<1 || limit>50 || !Number.isInteger(offset)) throw new Error('limit must be an integer from 1 to 50; offset must be a nonnegative integer.');
        if (input.priced_only!==undefined && typeof input.priced_only!=='boolean') throw new Error('priced_only must be a boolean.');
        const matches=current.current.properties.filter(p =>
          `${p.title} ${p.location} ${p.category} ${p.description}`.toLowerCase().includes(query) &&
          (!source || p.agency?.toLowerCase()===source) && (!category || p.category.toLowerCase()===category) &&
          p.location.toLowerCase().includes(location) && (!input.priced_only || p.price!==null) &&
          (max===undefined || (p.price!==null && p.price<=max))
        ).sort((a,b)=>Number(b.price!==null)-Number(a.price!==null));
        return {total:matches.length,offset,nextOffset:offset+limit<matches.length?offset+limit:null,items:matches.slice(offset,offset+limit).map(summary)};
      }),
      tool('get_whimsical_items', 'Return the handpicked Most whimsical collection in editorial order. This is a curated selection, not a whimsy score.', schema(), true, () => ({items:whimsicalPicks.flatMap(pick => {
        const p=current.current.properties.find(p=>p.id===pick.id);
        return p?[{...summary(p),hook:pick.hook}]:[];
      })})),
      tool('get_item', 'Get a listing with description, restrictions, price type, checked time and official documents. Availability and eligibility must be verified with the official source.', schema({id:idSchema},['id']), true, input => {
        const p=item(input);return {...summary(p),description:p.description,spec:p.spec,address:p.address,image:p.image,documents:p.documents,bidEnd:p.bidEnd,bidCount:p.bidCount};
      }),
      tool('set_shortlist', 'Add or remove one item from the current visit’s shortlist. Updates the visible saved hearts. Idempotent; saved items reset on reload.', schema({id:idSchema,saved:{type:'boolean',description:'true to save, false to remove.'}},['id','saved']), false, input => {
        const p=item(input);
        if (typeof input.saved!=='boolean') throw new Error('saved must be a boolean.');
        flushSync(()=>current.current.setSaved(ids=>input.saved ? [...new Set([...ids,p.id])] : ids.filter(id=>id!==p.id)));
        return {id:p.id,saved:input.saved,total:current.current.saved.length};
      }),
      tool('get_shortlist', 'Return items saved during this page visit, including saves made with the website’s hearts. The shortlist resets on reload.', schema(), true, () => ({items:current.current.saved.flatMap(id=>{
        const p=current.current.properties.find(p=>p.id===id);return p?[summary(p)]:[];
      })})),
      tool('show_item', 'Open an item’s detail panel on the page for the user. Does not navigate to an auction or place bids.', schema({id:idSchema},['id']), false, input => {
        const p=item(input);flushSync(()=>current.current.showItem(p.id));return {opened:p.id,title:p.title};
      })
    ];
    // Modern browsers use AbortSignal; earlier navigator-based implementations use unregisterTool.
    void (async () => {
      for (const t of tools) {
        if (controller.signal.aborted) break;
        try {
          await context.registerTool(t, {signal:controller.signal});
          if (controller.signal.aborted) { if (!modern) context.unregisterTool?.(t.name); break; }
          registered.push(t.name);
        } catch (error) {
          if (!controller.signal.aborted) console.warn(`WebMCP: could not register ${t.name}`, error);
        }
      }
    })();
    return () => {
      controller.abort();
      if (!modern) registered.forEach(name => context.unregisterTool?.(name));
    };
  }, []);
}
