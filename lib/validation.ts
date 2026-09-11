import { z } from 'zod';
import { roles } from './portal-model';
const detailsInput = z.object({
    firstName: z.string().trim().max(100), lastName: z.string().trim().max(100),
    gender: z.enum(['', 'Woman', 'Man', 'Non-binary', 'Self-describe', 'Prefer not to say']),
    ethnicity: z.enum(['', 'Asian', 'Black or African descent', 'Hispanic or Latino', 'Indigenous', 'Middle Eastern or North African', 'White', 'Multiracial', 'Self-describe', 'Prefer not to say']),
    birthdate: z.string().max(10), graduationYear: z.string().max(4)
});
export const roleInput = z.object({ type: z.enum(roles) });
export const applicationInput = z.object({
    type: z.enum(roles), name: z.string().trim().min(1, 'Enter your name').max(201),
    school: z.string().trim().max(200), skills: z.string().trim().max(300), motivation: z.string().trim().max(3000),
    experience: z.string().trim().max(3000), availability: z.string().trim().max(200),
    details: detailsInput, submit: z.boolean(), version: z.number().int().min(0)
}).superRefine((v, c) => {
    if (v.details.birthdate) {
        const date = new Date(v.details.birthdate + 'T00:00:00Z');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v.details.birthdate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== v.details.birthdate || v.details.birthdate > new Date().toISOString().slice(0, 10))
            c.addIssue({ code: 'custom', path: ['details', 'birthdate'], message: 'Enter a valid birthdate.' });
    }
    if (!v.submit)
        return;
    for (const k of ['school', 'skills', 'motivation', 'experience'] as const)
        if (!v[k])
            c.addIssue({ code: 'custom', path: [k], message: 'Complete all required fields before submitting.' });
    if (!v.details.firstName || !v.details.lastName || !v.details.birthdate)
        c.addIssue({ code: 'custom', path: ['details'], message: 'First name, last name, and birthdate are required.' });
    if (v.details.birthdate > '2008-10-23')
        c.addIssue({ code: 'custom', path: ['details', 'birthdate'], message: 'You must be 18 or older by October 23, 2026.' });
    if (v.type !== 'hacker' && !v.availability)
        c.addIssue({ code: 'custom', path: ['availability'], message: 'Select your availability.' });
});
export const reviewInput = z.object({ id: z.string().uuid(), motivation: z.number().int().min(1).max(5), experience: z.number().int().min(1).max(5), contribution: z.number().int().min(1).max(5), notes: z.string().trim().max(3000), status: z.enum(['under_review', 'accepted', 'waitlisted', 'rejected']) });
export const rsvpInput = z.object({ id: z.string().uuid(), response: z.enum(['confirmed', 'declined']) });
