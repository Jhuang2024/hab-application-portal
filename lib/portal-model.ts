export const roles = ['hacker', 'judge', 'mentor', 'volunteer'] as const;
export type Kind = typeof roles[number];
export const roleName: Record<Kind, string> = { hacker: 'Hacker', judge: 'Judge', mentor: 'Mentor', volunteer: 'Volunteer' };
export const labels: Record<string, string> = { draft: 'Draft', submitted: 'Submitted', under_review: 'In review', accepted: 'Accepted', waitlisted: 'Waitlisted', rejected: 'Not selected', confirmed: 'Confirmed', declined: 'Declined' };
export type Details = {
    firstName: string;
    lastName: string;
    gender: string;
    ethnicity: string;
    birthdate: string;
    graduationYear: string;
};
export const emptyDetails: Details = { firstName: '', lastName: '', gender: '', ethnicity: '', birthdate: '', graduationYear: '' };
export type Application = {
    id: string;
    type: Kind;
    status: string;
    name?: string;
    school?: string;
    skills: string;
    motivation: string;
    experience: string;
    availability: string;
    version: number;
    updated_at: string;
    submitted_at?: string;
    score: number | null;
    review_count: number;
    details_json?: string;
};
export type Me = {
    userId: string;
    displayName: string;
    email: string;
    organizer: boolean;
    accountType: Kind | null;
};
export type Review = {
    application_id: string;
    motivation: number;
    experience: number;
    contribution: number;
    notes: string;
};
export type Activity = {
    application_id: string;
    status: string;
    created_at: string;
};
export type PortalData = {
    me: Me | null;
    applications: Application[];
    reviews: Review[];
    events: Activity[];
    error?: string;
};
export const event = { name: 'Cal Hacks 13.0', start: '2026-10-23T17:00:00-07:00', end: '2026-10-26T00:00:00-07:00', priority: '2026-09-13T23:59:00-07:00', regular: '2026-09-20T23:59:00-07:00' };
export const prompts: Record<Kind, {
    school: string;
    skills: string;
    motivation: string;
    motivationHint: string;
    experience: string;
    experienceHint: string;
}> = {
    hacker: { school: 'What school do you attend?', skills: 'What skills or topics are you interested in?', motivation: 'Why do you want to attend Cal Hacks?', motivationHint: 'Tell us what you hope to learn, explore, or build.', experience: 'Tell us about a project or a problem you have worked on.', experienceHint: 'Class projects, side projects, and first attempts all count. Explain your contribution.' },
    judge: { school: 'What is your organization and current role?', skills: 'What areas can you evaluate?', motivation: 'Why would you like to judge?', motivationHint: 'Tell us what interests you about reviewing hackathon projects.', experience: 'What experience would inform your judging, and how would you evaluate a promising but unfinished project?', experienceHint: 'Describe your technical or industry background and how you would apply a fair rubric.' },
    mentor: { school: 'What is your organization and current role?', skills: 'What topics can you mentor teams in?', motivation: 'Why would you like to mentor?', motivationHint: 'What do you enjoy about helping people learn and build?', experience: 'Describe your relevant experience and how you would help a team that is stuck.', experienceHint: 'Use a concrete example of technical, design, product, or teamwork support.' },
    volunteer: { school: 'What is your school or organization?', skills: 'Which volunteer areas interest you?', motivation: 'Why would you like to volunteer?', motivationHint: 'Tell us what you would enjoy contributing to the event.', experience: 'Tell us about a time you helped a team or handled an unexpected problem.', experienceHint: 'Event experience is welcome but not required. Explain what you did and what you learned.' }
};
