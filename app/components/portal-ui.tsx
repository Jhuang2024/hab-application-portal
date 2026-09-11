'use client';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { labels } from '@/lib/portal-model';
import { authenticatedFetch } from '../supabase-client';
export function Status({ status }: {
    status: string;
}) { return <span className={`status status-${status}`}>{labels[status] || status}</span>; }
export function Choice({ value, onChange, items, label, disabled = false }: {
    value: string;
    onChange: (v: string) => void;
    items: [
        string,
        string
    ][];
    label: string;
    disabled?: boolean;
}) { return <Select value={value} onValueChange={onChange} disabled={disabled}><SelectTrigger aria-label={label}><SelectValue placeholder="Select an option…"/></SelectTrigger><SelectContent>{items.map(([v, t]) => <SelectItem value={v} key={v}>{t}</SelectItem>)}</SelectContent></Select>; }
export const displayDate = (value?: string) => value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' }) : '—';
export async function post(body: unknown) { const r = await authenticatedFetch('/api/portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const d = await r.json() as {
    error?: string;
    version: number;
    updated_at: string;
}; if (!r.ok)
    throw Error(d.error || 'Unable to save. Please retry.'); return d; }
