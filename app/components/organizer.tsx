'use client';
import { useState } from 'react';
import { ArrowUpRight, ChevronLeft, EyeOff, FileText, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import { Application, Review, PortalData, labels, roleName, roles, prompts } from '@/lib/portal-model';
import { Choice, displayDate, post, Status } from './portal-ui';
export default function Organizer({ data, blind, setBlind, reload }: {
    data: PortalData;
    blind: boolean;
    setBlind: (v: boolean) => void;
    reload: () => Promise<void>;
}) {
    const [selected, setSelected] = useState<string | null>(null), [query, setQuery] = useState(''), [status, setStatus] = useState('all'), [type, setType] = useState('all'), [seeding, setSeeding] = useState(false);
    const app = data.applications.find(a => a.id === selected);
    const visible = data.applications.filter(a => (status === 'all' || a.status === status) && (type === 'all' || a.type === type) && `${a.id} ${a.name || ''} ${a.school || ''} ${a.skills}`.toLowerCase().includes(query.toLowerCase()));
    if (app)
        return <ReviewForm key={app.id + String(blind)} app={app} review={data.reviews.find(r => r.application_id === app.id)} blind={blind} back={() => setSelected(null)} saved={async () => { setSelected(null); await reload(); }}/>;
    return <div className="organizer-page"><header className="white-card organizer-heading"><div><p className="eyebrow">ORGANIZER WORKSPACE</p><h1>Application review</h1><p>Review submissions, score responses, and publish decisions.</p></div><Button variant="outline" onClick={reload}><RefreshCw size={16}/> Refresh</Button></header><div className="stats-grid">{[['Applications', data.applications.length], ['Awaiting review', data.applications.filter(a => a.status === 'submitted').length], ['Accepted', data.applications.filter(a => ['accepted', 'confirmed'].includes(a.status)).length], ['Confirmed', data.applications.filter(a => a.status === 'confirmed').length]].map(([label, n]) => <div className="white-card stat" key={label}><span>{label}</span><strong>{n}</strong></div>)}</div><div className="white-card blind-bar"><div><EyeOff size={20}/><div><strong>Blind review</strong><p>Hide names and affiliations. Demographics are always excluded.</p></div></div><Switch aria-label="Blind review" checked={blind} onCheckedChange={v => { setQuery(''); setBlind(v); }}/></div><section className="white-card queue"><div className="queue-head"><h2>All applications <span>{data.applications.length}</span></h2><div className="filters"><div className="search"><Search size={17}/><Input aria-label="Search applications" value={query} onChange={e => setQuery(e.target.value)} placeholder={blind ? 'Search ID or skills' : 'Search applicants'}/></div><Choice label="Filter by role" value={type} onChange={setType} items={[["all", "All roles"], ...roles.map(r => [r, roleName[r]] as [
            string,
            string
        ])]}/><Choice label="Filter by status" value={status} onChange={setStatus} items={[["all", "All statuses"], ...Object.entries(labels).filter(([k]) => k !== 'draft')]}/></div></div><Table><TableHeader><TableRow><TableHead>Applicant</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Score</TableHead><TableHead>Submitted</TableHead><TableHead><span className="sr-only">Action</span></TableHead></TableRow></TableHeader><TableBody>{visible.map(a => <TableRow key={a.id}><TableCell><strong>{blind ? `Applicant ${a.id.slice(-8)}` : a.name}</strong><small>{blind ? a.skills : a.school}</small></TableCell><TableCell>{roleName[a.type]}</TableCell><TableCell><Status status={a.status}/></TableCell><TableCell>{a.score === null ? 'Unscored' : `${a.score} / 15`}<small>{a.review_count ? `${a.review_count} review${a.review_count > 1 ? 's' : ''}` : ''}</small></TableCell><TableCell>{displayDate(a.submitted_at)}</TableCell><TableCell><Button variant="ghost" onClick={() => setSelected(a.id)}>Review <ArrowUpRight size={16}/></Button></TableCell></TableRow>)}</TableBody></Table>{!visible.length && <div className="queue-empty"><FileText size={30}/><h3>{data.applications.length ? 'No matching applications' : 'No submitted applications yet'}</h3><p>{data.applications.length ? 'Try another search or filter.' : 'Applicants’ drafts remain private until they submit.'}</p>{!data.applications.length && <Button disabled={seeding} variant="outline" onClick={async () => { setSeeding(true); try {
        await post({ action: 'seed' });
        toast.success('Fictional sample applications added');
        await reload();
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setSeeding(false);
    } }}>{seeding ? 'Adding…' : 'Add sample applications'}</Button>}</div>}<footer className="queue-footer">Showing {visible.length} of {data.applications.length} applications{data.applications.length === 1000 ? ' · Latest 1,000 submissions' : ''}</footer></section></div>;
}
function ReviewForm({ app, review, blind, back, saved }: {
    app: Application;
    review?: Review;
    blind: boolean;
    back: () => void;
    saved: () => Promise<void>;
}) {
    const [scores, setScores] = useState({ motivation: review?.motivation || 0, experience: review?.experience || 0, contribution: review?.contribution || 0 }), [notes, setNotes] = useState(review?.notes || ''), [status, setStatus] = useState(app.status === 'submitted' ? 'under_review' : app.status), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const closed = ['confirmed', 'declined'].includes(app.status);
    async function save() { setBusy(true); setError(''); try {
        await post({ action: 'review', id: app.id, ...scores, notes, status });
        toast.success('Review and decision saved');
        await saved();
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    return <div className="organizer-page"><button className="back-link" onClick={back}><ChevronLeft size={16}/> All applications</button><header className="white-card organizer-heading"><div><p className="eyebrow">{roleName[app.type]} · {app.id.slice(-8)}</p><h1>{blind ? `Applicant ${app.id.slice(-8)}` : app.name}</h1><p>{blind ? 'Identifying profile fields are hidden.' : app.school} · Submitted {displayDate(app.submitted_at)}</p></div><Status status={app.status}/></header><div className="review-layout"><section className="white-card responses"><h2>Application responses</h2>{[['Skills and interests', app.skills], [prompts[app.type].motivation, app.motivation], [prompts[app.type].experience, app.experience], ...(app.type === 'hacker' ? [] : [['Availability', app.availability]])].map(([title, answer]) => <article key={title}><h3>{title}</h3><p>{answer}</p></article>)}</section><form className="white-card rubric" onSubmit={e => { e.preventDefault(); void save(); }}><h2>Your review</h2><p>Score from 1 (limited evidence) to 5 (exceptional evidence).</p><fieldset disabled={busy || closed}>{(['motivation', 'experience', 'contribution'] as const).map(k => <div className="criterion" key={k}><h3>{k[0].toUpperCase() + k.slice(1)}</h3><div className="score-buttons">{[1, 2, 3, 4, 5].map(n => <Button type="button" key={n} variant={scores[k] === n ? 'default' : 'outline'} aria-label={`${k}: ${n} out of 5`} aria-pressed={scores[k] === n} onClick={() => setScores(s => ({ ...s, [k]: n }))}>{n}</Button>)}</div></div>)}<div className="total-score"><span>Total score</span><strong>{scores.motivation + scores.experience + scores.contribution} <small>/ 15</small></strong></div><label>Private review notes<Textarea aria-label="Private review notes" value={notes} onChange={e => setNotes(e.target.value)} maxLength={3000} rows={4}/><small>Only visible to you.</small></label>{!closed && <label>Application decision<Choice label="Application decision" disabled={busy} value={status} onChange={setStatus} items={['under_review', 'accepted', 'waitlisted', 'rejected'].map(k => [k, labels[k]])}/><small>Applicants see the status as soon as you save.</small></label>}</fieldset>{error && <p className="error-box" role="alert">{error}</p>}{closed ? <p>The applicant has {app.status === 'confirmed' ? 'confirmed attendance' : 'declined the offer'}. This decision is locked.</p> : <Button className="full-width" type="submit" disabled={busy || Object.values(scores).some(n => n === 0)}>{busy ? 'Saving…' : 'Save review & decision'}</Button>}</form></div></div>;
}
