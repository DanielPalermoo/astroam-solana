import { z } from 'zod'

export const waitlistRegisterSchema = z.object({
  fullName: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  phone: z.string().trim().min(6, 'Ingresa un número de celular válido').max(30),
  email: z.string().trim().email('Ingresa un correo electrónico válido').transform((v) => v.toLowerCase()),
  countryOrigin: z.string().trim().min(2, 'Indica de dónde eres').max(100),
  nextDestination: z.string().trim().max(100).optional().nullable().or(z.literal('')),
  honeypot: z.string().optional(),
  source: z.string().optional().default('web_final_cta'),
})

export type WaitlistRegisterInput = z.infer<typeof waitlistRegisterSchema>
