export type JwtPayload = {
  exp: number
  name?: string
  role?: string
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    let payload = token.split('.')[1]
    payload = payload.replace(/-/g, '+').replace(/_/g, '/')
    while (payload.length % 4) payload += '='
    const binaryString = atob(payload)
    const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes))
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