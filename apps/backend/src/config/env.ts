import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const schema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().url(),
    SESSION_SECRET: z.string().min(32),
    LEASE_INTELLIGENCE_URL: z.string().url(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
    console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;