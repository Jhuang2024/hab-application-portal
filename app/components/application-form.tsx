'use client';
import { useEffect, useState } from 'react';
import { Save, Send, CheckCircle2, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Application, Details, emptyDetails, event, Kind, Me, prompts, roleName } from '@/lib/portal-model';
import { Choice, displayDate, post, Status } from './portal-ui';
function Question({ title, hint, required = false, children }: {
    title: string;
    hint?: string;
    required?: boolean;
    children: React.ReactNode;
}) { return <section className="question-card"><div className="question-title">{title}{required && <span aria-label="required"> *</span>}</div>{hint && <p className="question-hint">{hint}</p>}{children}</section>; }
export default function ApplicationForm({ type, app, me, onSubmitted, back }: {
    type: Kind;
    app?: Application;
    me: Me;
    onSubmitted: () => Promise<void>;
    back: () => void;
}) {
    const [details, setDetails] = useState<Details>(() => { try {
        return { ...emptyDetails, ...JSON.parse(app?.details_json || '{}') };
    }
    catch {
        return { ...emptyDetails };
    } });
    const [form, setForm] = useState({ school: app?.school || '', skills: app?.skills || '', motivation: app?.motivation || '', experience: app?.experience || '', availability: app?.availability || '' });
    const [version, setVersion] = useState(app?.version || 0), [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirm, setConfirm] = useState(false), [lastSaved, setLastSaved] = useState(app?.updated_at || '');
    const locked = !!app && app.status !== 'draft';
    const copy = prompts[type];
    const required = [details.firstName, details.lastName, details.birthdate, form.school, form.skills, form.motivation, form.experience, ...(type === 'hacker' ? [] : [form.availability])];
    const completed = required.filter(v => v.trim()).length;
    const [now] = useState(() => Date.now());
    const deadline = now <= new Date(event.priority).getTime() ? event.priority : event.regular;
    useEffect(() => { const guard = (e: BeforeUnloadEvent) => { if (dirty) {
        e.preventDefault();
        e.returnValue = '';
    } }; window.addEventListener('beforeunload', guard); const changed = () => window.dispatchEvent(new CustomEvent('portal-dirty', { detail: dirty })); changed(); return () => { window.removeEventListener('beforeunload', guard); window.dispatchEvent(new CustomEvent('portal-dirty', { detail: false })); }; }, [dirty]);
    function field(k: keyof typeof form, v: string) { setForm(s => ({ ...s, [k]: v })); setDirty(true); }
    function detail(k: keyof Details, v: string) { setDetails(s => ({ ...s, [k]: v })); setDirty(true); }
    async function save(submit: boolean) { setBusy(true); setError(''); try {
        const d = await post({ action: 'save', type, ...form, details, name: `${details.firstName} ${details.lastName}`.trim() || app?.name || me.displayName, version, submit });
        setVersion(d.version);
        setLastSaved(d.updated_at);
        setDirty(false);
        window.dispatchEvent(new CustomEvent('portal-dirty', { detail: false }));
        toast.success(submit ? 'Application submitted' : 'Draft saved');
        if (submit)
            await onSubmitted();
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
        setConfirm(false);
    } }
    return <div className="application-page"><button className="back-link" onClick={back}><ChevronLeft size={16}/> Overview</button><header className="application-heading white-card"><div className="heading-meta"><span className="deadline">Deadline: {displayDate(deadline)}, 11:59 PM PT</span>{app && <Status status={app.status}/>}</div><h1>{roleName[type]} Application</h1>{locked && <p>Your application is submitted. Your answers are available below.</p>}</header>
 <form onSubmit={e => { e.preventDefault(); setConfirm(true); }}>
 <fieldset disabled={locked || busy} className="form-fieldset"><h2 className="section-title">General Questions</h2>
 <Question title="What is your first name (as it appears on your ID)?" required><Input aria-label="First name" autoComplete="given-name" value={details.firstName} onChange={e => detail('firstName', e.target.value)} placeholder="Your answer" required maxLength={100}/></Question>
 <Question title="What is your last name (as it appears on your ID)?" required><Input aria-label="Last name" autoComplete="family-name" value={details.lastName} onChange={e => detail('lastName', e.target.value)} placeholder="Your answer" required maxLength={100}/></Question>
 <Question title="What is your gender?" hint="Optional. Not shared with application reviewers."><Choice label="Gender" value={details.gender} onChange={v => detail('gender', v)} disabled={locked || busy} items={['Woman', 'Man', 'Non-binary', 'Self-describe', 'Prefer not to say'].map(v => [v, v])}/></Question>
 <Question title="What is your race/ethnicity?" hint="Optional. Not shared with application reviewers."><Choice label="Race or ethnicity" value={details.ethnicity} onChange={v => detail('ethnicity', v)} disabled={locked || busy} items={['Asian', 'Black or African descent', 'Hispanic or Latino', 'Indigenous', 'Middle Eastern or North African', 'White', 'Multiracial', 'Self-describe', 'Prefer not to say'].map(v => [v, v])}/></Question>
 <Question title="What is your birthdate?" required hint="You must be 18 or older by October 23, 2026. Your birthdate is not shown to application reviewers."><Input aria-label="Birthdate" type="date" required max="2008-10-23" min="1900-01-01" value={details.birthdate} onChange={e => detail('birthdate', e.target.value)}/></Question>
 <Question title="What is your email address?" hint="This is the verified email associated with your account."><Input aria-label="Email address" type="email" readOnly value={me.email}/></Question>
 <h2 className="section-title">{type === 'hacker' ? 'Education & Interests' : 'Background & Expertise'}</h2>
 <Question title={copy.school} required><Input aria-label="School or organization" placeholder="Your answer" required maxLength={200} value={form.school} onChange={e => field('school', e.target.value)}/></Question>
 {type === 'hacker' && <Question title="What is your expected graduation year?" hint="Optional."><Input aria-label="Graduation year" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" placeholder="e.g. 2030" value={details.graduationYear} onChange={e => detail('graduationYear', e.target.value)}/></Question>}
 <Question title={copy.skills} required><Input aria-label="Skills and interests" placeholder={type === 'volunteer' ? 'e.g. Check-in, logistics, attendee support' : 'e.g. Python, product design, machine learning'} required maxLength={300} value={form.skills} onChange={e => field('skills', e.target.value)}/></Question>
 <h2 className="section-title">{roleName[type]} Questions</h2>
 <Question title={copy.motivation} required hint={copy.motivationHint}><Textarea aria-label="Motivation" value={form.motivation} onChange={e => field('motivation', e.target.value)} placeholder="Your answer" required maxLength={3000} rows={6}/><span className="character-count">{form.motivation.length} / 3,000 characters</span></Question>
 <Question title={copy.experience} required hint={copy.experienceHint}><Textarea aria-label="Experience" value={form.experience} onChange={e => field('experience', e.target.value)} placeholder="Your answer" required maxLength={3000} rows={7}/><span className="character-count">{form.experience.length} / 3,000 characters</span></Question>
 {type !== 'hacker' && <><h2 className="section-title">Availability</h2><Question title="How much time can you commit during the event?" required><Choice label="Availability" value={form.availability} onChange={v => field('availability', v)} disabled={locked || busy} items={['2–4 hours', '4–8 hours', 'Full weekend', 'Flexible'].map(v => [v, v])}/></Question></>}
 </fieldset>
 {error && <div className="error-box" role="alert">{error}</div>}
 <div className="form-bottom white-card"><div><div className="save-label"><CheckCircle2 size={16}/>{locked ? 'Application submitted' : dirty ? 'Unsaved changes' : lastSaved ? `Saved ${displayDate(lastSaved)}` : 'Draft not saved yet'}</div><div className="form-progress"><Progress value={completed / required.length * 100}/><span>{completed}/{required.length} required fields</span></div></div>{!locked && <div className="form-actions"><Button type="button" variant="outline" disabled={busy} onClick={() => save(false)}><Save size={16}/> Save draft</Button><Button type="submit" disabled={busy || completed < required.length}>{busy ? 'Saving…' : 'Submit application'}<Send size={16}/></Button></div>}</div>
 </form><p className="privacy-note">Profile demographics are stored separately from written responses and excluded from organizer review data. Do not include identifying details in answers if you want them to remain anonymous during blind review.</p>
 <AlertDialog open={confirm} onOpenChange={setConfirm}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Submit your {type} application?</AlertDialogTitle><AlertDialogDescription>You will not be able to edit your answers after submission. You can follow your application status from the overview.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={() => save(true)} disabled={busy}>Submit application</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </div>;
}
