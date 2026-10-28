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
          ? 'Demasiadas solicitudes. Por favor intenta más tarde.'
          : 'No se pudo unir a la lista de espera. Verifica tus datos e intenta de nuevo.')
      return {
        status: 'error',
        message,
      }
    }

    return {
      status: 'ok',
      alreadyRegistered: Boolean(result?.alreadyRegistered),
      message: result?.message || '¡Te has unido a la lista de espera con éxito!',
    }
  } catch (err) {
    return {
      status: 'error',
      message:
        err instanceof Error
          ? err.message
          : 'Error de conexión. Asegúrate de tener conexión e intenta de nuevo.',
    }
  }
}
