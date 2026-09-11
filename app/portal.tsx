'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Send, LogOut, ChevronDown, Check, FileText, Users, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import ApplicationForm from './components/application-form';
import Organizer from './components/organizer';
import { Application, event, Kind, labels, PortalData, roleName, roles } from '@/lib/portal-model';
import { displayDate, post, Status } from './components/portal-ui';
import { authenticatedFetch, supabase } from './supabase-client';
type Screen = 'welcome' | 'overview' | 'apply' | 'organizer';
const empty: PortalData = { me: null, applications: [], events: [], reviews: [] };
export default function Portal({ screen = 'overview' }: {
    screen?: Screen;
}) {
    const router = useRouter();
    const [data, setData] = useState<PortalData>(empty), [loading, setLoading] = useState(true), [error, setError] = useState(''), [blind, setBlind] = useState(true);
    const dirty = useRef(false);
    const reload = useCallback(async () => { setError(''); try {
        const r = await authenticatedFetch(`/api/portal?view=${screen === 'organizer' ? 'organizer' : 'applicant'}&blind=${blind}`, { cache: 'no-store' });
        const d = await r.json() as PortalData;
        if (!r.ok)
            throw Error(d.error || 'The portal could not load.');
        setData(d);
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setLoading(false);
    } }, [screen, blind]);
    useEffect(() => { setLoading(true); void reload(); }, [reload]);
    useEffect(() => { const { data: listener } = supabase.auth.onAuthStateChange(() => { void reload(); }); return () => listener.subscription.unsubscribe(); }, [reload]);
    useEffect(() => { const listener = (e: Event) => { dirty.current = (e as CustomEvent<boolean>).detail; }; window.addEventListener('portal-dirty', listener); return () => window.removeEventListener('portal-dirty', listener); }, []);
    useEffect(() => { const context = (document as unknown as {
        modelContext?: {
            registerTool: (tool: unknown, options: unknown) => unknown;
        };
    }).modelContext; if (!context)
        return; const lifecycle = new AbortController(); try {
        void Promise.resolve(context.registerTool({ name: 'read_application_statuses', description: 'Read application statuses visible to the signed-in user without changing them.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute(input: unknown) { if (!input || typeof input !== 'object' || Object.keys(input).length)
                throw Error('Expected an empty object.'); return { loading, applications: data.applications.map(a => ({ id: a.id, type: a.type, status: a.status })), error: error || null }; } }, { signal: lifecycle.signal })).catch(() => { });
    }
    catch { } return () => lifecycle.abort(); }, [data.applications, loading, error]);
    const me = data.me;
    const type = me?.accountType;
    const app = data.applications.find(a => a.type === type);
    function navigate(next: Screen) { if (dirty.current && !window.confirm('Leave this page? Unsaved answers will be lost.'))
        return; dirty.current = false; router.push('/' + next); }
    return <div className="portal-shell"><Toaster richColors/><header className="topbar"><nav aria-label="Main navigation">{me && type ? <><button onClick={() => navigate('overview')} className={screen === 'overview' ? 'nav-link current' : 'nav-link'}><Home size={18}/> Overview</button><button onClick={() => navigate('apply')} className={screen === 'apply' ? 'nav-link current' : 'nav-link'}><Send size={18}/> Apply</button>{me.organizer && <button className={screen === 'organizer' ? 'nav-link current' : 'nav-link'} onClick={() => navigate('organizer')}><ShieldCheck size={18}/> Review</button>}</> : <span className="nav-label"><Home size={17}/> Assembly</span>}</nav>{me ? <DropdownMenu><DropdownMenuTrigger asChild><button className="account-menu" aria-label="Account menu"><span>{me.displayName.split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase()}</span><ChevronDown size={14}/></button></DropdownMenuTrigger><DropdownMenuContent align="end"><div className="account-details"><strong>{me.displayName}</strong><small>{me.email}</small></div><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => navigate('welcome')}>Change applicant role</DropdownMenuItem>{me.organizer && <DropdownMenuItem onSelect={() => navigate('organizer')}>Organizer review</DropdownMenuItem>}<DropdownMenuItem onSelect={() => { if (!dirty.current || window.confirm('Sign out and discard unsaved changes?'))
        void supabase.auth.signOut().then(() => { setData(empty); router.push('/'); }); }}>Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu> : <span className="project-label">H@B application project</span>}</header>
 <div className="portal-backdrop" aria-hidden="true"/>
 <main>{loading ? <div className="center-stage"><div className="white-card loading-card" role="status">Loading your portal…</div></div> : error ? <div className="center-stage"><div className="white-card error-card" role="alert"><h1>Unable to load this page</h1><p>{error}</p><Button onClick={reload}>Retry</Button><Button variant="outline" onClick={() => navigate('overview')}>Overview</Button></div></div> : !me ? <Login /> : screen === 'organizer' ? <Organizer data={data} blind={blind} setBlind={v => { setData(s => ({ ...s, applications: [] })); setLoading(true); setBlind(v); }} reload={reload}/> : !type || screen === 'welcome' ? <Welcome selected={type} onSelect={async (role) => { await post({ action: 'role', type: role }); await reload(); router.push('/overview'); }}/> : screen === 'apply' ? <ApplicationForm key={type} type={type} app={app} me={me} back={() => navigate('overview')} onSubmitted={async () => { await reload(); navigate('overview'); }}/> : <Overview data={data} type={type} app={app} apply={() => navigate('apply')} reload={reload}/>}
 </main><footer className="site-footer">Assembly · Independent H@B application project · Not the official event portal</footer></div>;
}
function Login() {
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    async function signIn() {
        setBusy(true); setError('');
        const { error: authError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/welcome` } });
        if (authError) { setError(authError.message); setBusy(false); }
    }
    return <div className="center-stage"><div className="white-card welcome-card"><h1>Sign in to Assembly</h1><p>Your application, updates, and event details in one place.</p><Button className="login-button google-login" onClick={signIn} disabled={busy}><GoogleMark />{busy ? 'Opening Google…' : 'Continue with Google'}</Button>{error && <p className="error-box" role="alert">{error}</p>}</div></div>;
}
function GoogleMark() { return <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.19-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.07 12c0-.67.11-1.32.32-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.62.39 3.15 1.04 4.55l3.35-2.62Z"/><path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"/></svg>; }
function Welcome({ selected, onSelect }: {
    selected: Kind | null | undefined;
    onSelect: (role: Kind) => Promise<void>;
}) {
    const [group, setGroup] = useState(selected ? (selected === 'hacker' ? 'hacker' : 'non-hacker') : ''), [nonHacker, setNonHacker] = useState<Kind | null>(selected && selected !== 'hacker' ? selected : null), [step, setStep] = useState(1), [busy, setBusy] = useState(false), [error, setError] = useState('');
    async function choose() { if (group === 'non-hacker' && step === 1) {
        setStep(2);
        return;
    } const role = group === 'hacker' ? 'hacker' : nonHacker; if (!role)
        return; setBusy(true); setError(''); try {
        await onSelect(role);
    }
    catch (e) {
        setError((e as Error).message);
        setBusy(false);
    } }
    return <div className="center-stage"><section className="white-card welcome-card"><h1>{step === 1 ? 'Welcome' : 'How would you like to contribute?'}</h1><p>{step === 1 ? 'Choose your role to get started.' : 'Choose a non-hacker role for your application.'}</p><RadioGroup aria-label={step === 1 ? 'Applicant category' : 'Non-hacker role'} value={step === 1 ? group : nonHacker || ''} onValueChange={v => step === 1 ? setGroup(v) : setNonHacker(v as Kind)} className="role-options">{(step === 1 ? [['hacker', 'Hacker'], ['non-hacker', 'Non-Hacker (Judge, Mentor, or Volunteer)']] : [['judge', 'Judge'], ['mentor', 'Mentor'], ['volunteer', 'Volunteer']]).map(([value, label]) => <label className="role-option" key={value}><RadioGroupItem value={value} disabled={busy}/><span>{label}</span></label>)}</RadioGroup>{error && <p className="error-box" role="alert">{error}</p>}<Button className="full-width continue-button" onClick={choose} disabled={busy || !group || (step === 2 && !nonHacker)}>{busy ? 'Saving…' : 'Continue'}</Button>{step === 2 && <Button className="full-width" variant="ghost" onClick={() => setStep(1)}>Back</Button>}</section></div>;
}
function Overview({ data, type, app, apply, reload }: {
    data: PortalData;
    type: Kind;
    app?: Application;
    apply: () => void;
    reload: () => Promise<void>;
}) {
    const [busy, setBusy] = useState(false);
    const [time, setTime] = useState<number | null>(null);
    useEffect(() => { setTime(Date.now()); const timer = setInterval(() => setTime(Date.now()), 1000); return () => clearInterval(timer); }, []);
    const seconds = time === null ? null : Math.max(0, Math.floor((new Date(event.start).getTime() - time) / 1000));
    const parts = seconds === null ? ['--', '--', '--', '--'] : [Math.floor(seconds / 86400), Math.floor(seconds % 86400 / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map(n => String(n).padStart(2, '0'));
    const milestones = [{ title: 'Applications open', date: 'Aug 23', at: '2026-08-23T00:00:00-07:00', note: '' }, { title: 'Priority deadline', date: 'Sep 13 · 11:59 PM PT', at: event.priority, note: 'Decisions released Sep 17–20' }, { title: 'Regular deadline', date: 'Sep 20 · 11:59 PM PT', at: event.regular, note: 'Decisions released Sep 25–27' }, { title: 'Cal Hacks 13.0', date: 'Oct 23–25', at: event.start, note: '' }];
    const next = time === null ? 0 : milestones.findIndex(m => new Date(m.at).getTime() > time);
    async function rsvp(response: 'confirmed' | 'declined') { if (!app)
        return; if (response === 'declined' && !window.confirm('Decline this invitation? Your response will be final.'))
        return; setBusy(true); try {
        await post({ action: 'rsvp', id: app.id, response });
        toast.success(response === 'confirmed' ? 'Attendance confirmed' : 'Invitation declined');
        await reload();
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    return <div className="overview-page"><section className="white-card welcome-banner"><p className="eyebrow">WELCOME, {data.me!.displayName.split(' ')[0]}</p><h1>You're signed in as a {roleName[type]}</h1><p>Use the navigation above to get to your application.</p></section><section className="white-card event-panel"><ol className="milestones">{milestones.map((m, i) => { const done = time !== null && new Date(m.at).getTime() <= time; return <li className={done ? 'done' : i === next ? 'upcoming' : ''} key={m.title}><span className="milestone-marker">{done ? <Check size={13}/> : <span />}</span><strong>{m.title}</strong><p>{m.date}</p>{m.note && <small>{m.note}</small>}</li>; })}</ol><div className="countdown-row"><div className="countdown" aria-label="Countdown to Cal Hacks">{parts.map((n, i) => <div className="countdown-unit" key={i}><strong>{n}</strong><span>{['DAYS', 'HOURS', 'MINUTES', 'SECONDS'][i]}</span></div>)}</div><span className="until">{seconds === 0 ? 'EVENT STARTED' : 'UNTIL'}</span><div className="event-wordmark"><em>Cal</em><b>HACKS</b><span>13.0</span></div></div></section><section className="white-card application-summary"><div className="summary-top"><div><p className="eyebrow">YOUR APPLICATION</p><h2>{roleName[type]} Application</h2></div>{app ? <Status status={app.status}/> : <span className="status">Not started</span>}</div><p>{!app ? 'Start your application when you are ready. You can save a draft and return anytime.' : app.status === 'draft' ? `Last saved ${displayDate(app.updated_at)}. Continue where you left off.` : app.status === 'accepted' ? 'You have been accepted. Confirm your attendance to secure your place.' : app.status === 'confirmed' ? 'Your attendance is confirmed. We look forward to seeing you.' : app.status === 'declined' ? 'You have declined this invitation.' : app.status === 'rejected' ? 'Thank you for applying. Your application was not selected for this event.' : `Submitted ${displayDate(app.submitted_at)}. Your latest status will appear here.`}</p><div className="summary-actions"><Button onClick={apply}><Send size={16}/>{!app ? 'Apply' : app.status === 'draft' ? 'Continue application' : 'View application'}</Button>{app?.status === 'accepted' && <><Button disabled={busy} onClick={() => rsvp('confirmed')}>Confirm attendance</Button><Button variant="outline" disabled={busy} onClick={() => rsvp('declined')}>Decline invitation</Button></>}</div>{app && data.events.some(e => e.application_id === app.id) && <div className="activity-list">{data.events.filter(e => e.application_id === app.id).slice(-4).map((e, i) => <div key={i}><span>{displayDate(e.created_at)}</span><strong>{labels[e.status]}</strong></div>)}</div>}</section></div>;
}
