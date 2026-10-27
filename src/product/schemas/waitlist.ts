import { z } from 'zod'

export const waitlistRegisterSchema = z.object({
  email: z.string().trim().email(),
  honeypot: z.string().optional(),
  source: z.string().optional().default('landing_final_cta'),
})

export type WaitlistRegisterInput = z.infer<typeof waitlistRegisterSchema>
