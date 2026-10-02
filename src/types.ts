/** All timestamps are integer UTC epoch milliseconds. Labels never contain HTML. */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export interface Lane { id: string; label: string; groupId?: string; metadata?: Json }
export interface LaneGroup { id: string; label: string }
export interface EventGroup { id: string; label: string; description?: string; color?: string; metadata?: Json }
export interface Transfer { from: string; to: string; itemId?: string; label?: string }
export interface TemporalEvent {
  id: string; time: number; endTime?: number; label: string; laneIds: string[];
  groupIds?: string[]; transfers?: Transfer[]; kind?: string; color?: string;
  description?: string; metadata?: Json;
}
export type RelationKind = 'causes' | 'enables' | 'correlates' | 'supersedes';
export interface Relationship { id: string; source: string; target: string; kind: RelationKind; label?: string; metadata?: Json }
export interface TimelineData {
  schemaVersion: 1; lanes: Lane[]; events: TemporalEvent[];
  laneGroups?: LaneGroup[]; eventGroups?: EventGroup[]; relationships?: Relationship[];
}
export interface TimeRange { start: number; end: number }
export interface TimelineFilter { laneIds?: string[]; groupIds?: string[]; kinds?: string[]; query?: string }
export interface TraceOptions { direction?: 'upstream' | 'downstream' | 'both'; kinds?: RelationKind[]; maxDepth?: number }
export interface TraceResult { roots: string[]; upstream: string[]; downstream: string[]; relationshipIds: string[] }
export interface LanePresentation { query: string; order: string[]; pinned: string[] }
export interface SavedTraceOptions { direction: 'upstream'|'downstream'|'both'; kinds: RelationKind[]; maxDepth: number|null }
export interface TraceExplanation {eventId:string;rootId:string;direction:'root'|'upstream'|'downstream';path:Relationship[]}
export interface SelectionDetail { eventIds: string[]; groupIds: string[]; trace: TraceResult; source: 'user' | 'api' | 'data' }
export interface ViewState { schemaVersion: 1; viewport: TimeRange; selectedEventIds: string[]; filter: TimelineFilter; collapsedLaneGroupIds: string[]; lanePresentation?: LanePresentation; trace?: SavedTraceOptions; scrollTop?: number }
export interface TimelineOptions {
  height?: number; rowHeight?: number; labelWidth?: number; timeZone?: string;
  selectionMode?: 'event' | 'group'; densityThreshold?: number; showRelationships?: boolean;
  trace?: TraceOptions; ariaLabel?: string;
}
export interface TimelineEvents {
  selection: SelectionDetail;
  view: ViewState;
  viewport: TimeRange & { source: 'user' | 'api' };
  hover: { eventIds: string[] };
  activate: { eventIds: string[] };
}
