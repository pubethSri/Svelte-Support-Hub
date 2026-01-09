export type JwtPayload = {
  exp: number
  name?: string
  role?: string
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

export function isExpired(token: string): boolean {
  const decoded = decodeJwt(token)
  if (!decoded?.exp) return true

  const now = Math.floor(Date.now() / 1000)
  return now >= decoded.exp
}