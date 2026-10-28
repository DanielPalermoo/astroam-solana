import { envConfig } from '../config/env'

export interface WaitlistJoinRequest {
  fullName: string
  phone: string
  email: string
  countryOrigin: string
  nextDestination?: string
  honeypot?: string
  source?: string
}

export interface WaitlistJoinResponse {
  status: 'ok' | 'error'
  alreadyRegistered?: boolean
  message: string
}

/**
 * Register for the AstroAm private beta waitlist.
 */
export async function joinWaitlist(data: WaitlistJoinRequest): Promise<WaitlistJoinResponse> {
  try {
    const res = await fetch(`${envConfig.apiBaseUrl}/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await res.json().catch(() => null)

    if (!res.ok) {
      const message =
        result?.message ||
        (res.status === 429
          ? 'Too many requests. Please try again later.'
          : 'Could not join the waitlist. Please check your details and try again.')
      return {
        status: 'error',
        message,
      }
    }

    return {
      status: 'ok',
      alreadyRegistered: Boolean(result?.alreadyRegistered),
      message: result?.message || 'You have successfully joined the waitlist!',
    }
  } catch (err) {
    return {
      status: 'error',
      message:
        err instanceof Error
          ? err.message
          : 'Connection error. Please check your connection and try again.',
    }
  }
}
