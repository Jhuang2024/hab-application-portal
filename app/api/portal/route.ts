import { getSupabaseUser } from "../../supabase-server";
import { database, organizerEmails } from "@/lib/db";
import { applicationInput, reviewInput, roleInput, rsvpInput } from "@/lib/validation";
export const dynamic = "force-dynamic";
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function identity(request: Request) {
    const user = await getSupabaseUser(request);
    if (!user)
        return null;
    const db = database();
    const organizer = organizerEmails().includes(user.email.toLowerCase()) ? 1 : 0;
    await db.prepare("INSERT INTO profiles (id,email,name,organizer,created_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,name=excluded.name,organizer=excluded.organizer").bind(user.userId, user.email, user.displayName, organizer, new Date().toISOString()).run();
    const profile = await db.prepare("SELECT account_type FROM profiles WHERE id=?").bind(user.userId).first<{
        account_type: string | null;
    }>();
    return { ...user, organizer: !!organizer, accountType: profile?.account_type || null };
}
export async function GET(request: Request) {
    try {
        const me = await identity(request);
        if (!me)
            return reply({ me: null, applications: [] });
        const db = database(), url = new URL(request.url), organizer = url.searchParams.get("view") === "organizer", blind = url.searchParams.get("blind") !== "false";
        if (organizer && !me.organizer)
            return reply({ error: "Organizer access required." }, 403);
        const reviewFields = "a.id,a.type,a.status,a.skills,a.motivation,a.experience,a.availability,a.created_at,a.updated_at,a.submitted_at,a.version";
        const fields = organizer ? reviewFields + (blind ? "" : ",a.name,a.school") : "a.*";
        const applications = await db.prepare(`SELECT ${fields}, (SELECT ROUND(AVG(r.motivation+r.experience+r.contribution),1) FROM reviews r WHERE r.application_id=a.id) AS score, (SELECT COUNT(*) FROM reviews r WHERE r.application_id=a.id) AS review_count FROM applications a ${organizer ? "WHERE a.status != 'draft'" : "WHERE a.user_id = ?"} ORDER BY a.updated_at DESC LIMIT 1000`).bind(...(organizer ? [] : [me.userId])).all();
        const data = applications.results;
        const events = organizer ? [] : (await db.prepare("SELECT e.application_id,e.status,e.created_at FROM events e JOIN applications a ON a.id=e.application_id WHERE a.user_id=? ORDER BY e.created_at").bind(me.userId).all()).results;
        const reviews = organizer ? (await db.prepare("SELECT application_id,motivation,experience,contribution,notes FROM reviews WHERE reviewer_id=?").bind(me.userId).all()).results : [];
        return reply({ me, applications: data, events, reviews, blind });
    }
    catch (e) {
        console.error("portal GET", e);
        return reply({ error: "The portal could not load. Please retry." }, 503);
    }
}
export async function POST(request: Request) {
    try {
        if (request.headers.get("origin") !== new URL(request.url).origin)
            return reply({ error: "Invalid request origin." }, 403);
        const me = await identity(request);
        if (!me)
            return reply({ error: "Sign in to continue." }, 401);
        const raw = await request.text();
        if (raw.length > 20000)
            return reply({ error: "Request is too large." }, 413);
        let body;
        try {
            body = JSON.parse(raw);
        }
        catch {
            return reply({ error: "Invalid request." }, 400);
        }
        const db = database(), now = new Date().toISOString();
        if (body.action === "role") {
            const parsed = roleInput.safeParse(body);
            if (!parsed.success)
                return reply({ error: "Choose a valid applicant role." }, 400);
            await db.prepare("UPDATE profiles SET account_type=? WHERE id=?").bind(parsed.data.type, me.userId).run();
            return reply({ ok: true });
        }
        if (body.action === "rsvp") {
            const parsed = rsvpInput.safeParse(body);
            if (!parsed.success)
                return reply({ error: "Choose a valid attendance response." }, 400);
            const v = parsed.data;
            const results = await db.batch([
                db.prepare("UPDATE applications SET status=?,updated_at=?,version=version+1 WHERE id=? AND user_id=? AND status='accepted'").bind(v.response, now, v.id, me.userId),
                db.prepare("INSERT INTO events (id,application_id,actor_id,status,created_at) SELECT ?,?,?,?,? WHERE changes()=1").bind(crypto.randomUUID(), v.id, me.userId, v.response, now)
            ]);
            if (!results[0].meta.changes)
                return reply({ error: "Only your accepted application can receive an attendance response." }, 409);
            return reply({ ok: true });
        }
        if (body.action === "seed") {
            if (!me.organizer)
                return reply({ error: "Organizer access required." }, 403);
            const samples = [
                ["00000000-0000-4000-8000-000000000001", "hacker", "Sample · Maya Chen", "Example University", "Python, accessibility, React", "I want to make campus information easier to navigate for students using screen readers. I hope to learn how to test an idea with people who would actually use it.", "I built a small timetable parser for a class project. I handled the parser and tests, and learned why messy input needs explicit validation.", ""],
                ["00000000-0000-4000-8000-000000000002", "mentor", "Sample · Alex Rivera", "Example Studio", "Product design, prototyping, user research", "I enjoy helping teams make the smallest useful version of an ambitious idea. I want to make first-time participants feel comfortable showing unfinished work.", "I have led prototype reviews for three student teams. When a team was stuck choosing features, I helped them interview two potential users and choose one workflow to test.", "4–8 hours"],
                ["00000000-0000-4000-8000-000000000003", "hacker", "Sample · Jordan Lee", "Independent learner", "JavaScript, mapping, climate", "I am new to hackathons and want to learn how to collaborate under time constraints. I am interested in making local climate data understandable.", "I made a map of public drinking fountains using an open dataset. My first version had missing coordinates, so I added validation and a list view for entries that could not be mapped.", ""]
            ];
            const statements = [];
            for (const [id, type, name, school, skills, motivation, experience, availability] of samples) {
                const uid = "sample-" + id;
                statements.push(db.prepare("INSERT OR IGNORE INTO profiles (id,email,name,organizer,created_at) VALUES (?,?,?,0,?)").bind(uid, uid + "@example.invalid", name, now));
                statements.push(db.prepare("INSERT OR IGNORE INTO applications (id,user_id,type,status,name,school,skills,motivation,experience,availability,created_at,updated_at,submitted_at,version) VALUES (?,?,?,'submitted',?,?,?,?,?,?,?,?,?,1)").bind(id, uid, type, name, school, skills, motivation, experience, availability, now, now, now));
            }
            await db.batch(statements);
            return reply({ ok: true });
        }
        if (body.action === "review") {
            if (!me.organizer)
                return reply({ error: "Organizer access required." }, 403);
            const parsed = reviewInput.safeParse(body);
            if (!parsed.success)
                return reply({ error: parsed.error.issues[0].message }, 400);
            const v = parsed.data;
            const app = await db.prepare("SELECT user_id,status FROM applications WHERE id=?").bind(v.id).first<{
                user_id: string;
                status: string;
            }>();
            if (!app || app.status === "draft")
                return reply({ error: "Submitted application not found." }, 404);
            if (["confirmed", "declined"].includes(app.status))
                return reply({ error: "The applicant has already responded to this decision." }, 409);
            if (app.user_id === me.userId)
                return reply({ error: "You cannot review your own application." }, 403);
            await db.batch([
                db.prepare("INSERT INTO reviews (id,application_id,reviewer_id,motivation,experience,contribution,notes,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(application_id,reviewer_id) DO UPDATE SET motivation=excluded.motivation,experience=excluded.experience,contribution=excluded.contribution,notes=excluded.notes,updated_at=excluded.updated_at").bind(crypto.randomUUID(), v.id, me.userId, v.motivation, v.experience, v.contribution, v.notes, now),
                db.prepare("UPDATE applications SET status=?,updated_at=?,version=version+1 WHERE id=?").bind(v.status, now, v.id),
                db.prepare("INSERT INTO events (id,application_id,actor_id,status,created_at) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(), v.id, me.userId, v.status, now)
            ]);
            return reply({ ok: true });
        }
        if (body.action !== "save")
            return reply({ error: "Unknown action." }, 400);
        const parsed = applicationInput.safeParse(body);
        if (!parsed.success)
            return reply({ error: parsed.error.issues[0].message }, 400);
        const v = parsed.data;
        const old = await db.prepare("SELECT id,status,version FROM applications WHERE user_id=? AND type=?").bind(me.userId, v.type).first<{
            id: string;
            status: string;
            version: number;
        }>();
        if (old && old.status !== "draft")
            return reply({ error: "Submitted applications are locked for review." }, 409);
        if ((old?.version || 0) !== v.version)
            return reply({ error: "This application changed in another tab. Reload before saving." }, 409);
        const id = old?.id || crypto.randomUUID(), status = v.submit ? "submitted" : "draft";
        if (old) {
            const result = await db.prepare("UPDATE applications SET name=?,school=?,skills=?,motivation=?,experience=?,availability=?,details_json=?,status=?,updated_at=?,submitted_at=?,version=version+1 WHERE id=? AND user_id=? AND version=? AND status='draft'").bind(v.name, v.school, v.skills, v.motivation, v.experience, v.availability, JSON.stringify(v.details), status, now, v.submit ? now : null, id, me.userId, v.version).run();
            if (!result.meta.changes)
                return reply({ error: "Application changed. Reload before saving." }, 409);
        }
        else {
            try {
                await db.prepare("INSERT INTO applications (id,user_id,type,status,name,school,skills,motivation,experience,availability,details_json,created_at,updated_at,submitted_at,version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)").bind(id, me.userId, v.type, status, v.name, v.school, v.skills, v.motivation, v.experience, v.availability, JSON.stringify(v.details), now, now, v.submit ? now : null).run();
            }
            catch (e) {
                if (String(e).includes("UNIQUE"))
                    return reply({ error: "Application already exists. Reload before saving." }, 409);
                throw e;
            }
        }
        return reply({ ok: true, id, version: v.version + 1, status, updated_at: now });
    }
    catch (e) {
        console.error("portal POST", e);
        return reply({ error: "Your changes could not be saved. Your form is still here; please retry." }, 503);
    }
}
