import { z } from 'zod';

export const loginSchema = z.object({
  loginIdentifier: z.string().trim().min(1).max(320),
  password: z.string().min(1).max(1024),
});
