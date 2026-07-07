export async function onRequestPost(context) {
  const { request, env } = context

  try {
    const { email, password } = await request.json()
    if (!email || !password) return json({ error: 'Email and password required' }, 400)
    if (password.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400)

    const emailLower = email.toLowerCase().trim()
    const userKey = `user:${emailLower}`
    const existing = await env.CHECKLIST_KV.get(userKey)
    if (existing) return json({ error: 'Email already registered' }, 409)

    const hashedPassword = await hashPassword(password)
    const userId = crypto.randomUUID()
    const userData = JSON.stringify({ userId, email: emailLower, createdAt: Date.now() })

    await env.CHECKLIST_KV.put(userKey, hashedPassword)
    await env.CHECKLIST_KV.put(`uid:${userId}`, userData)
    await env.CHECKLIST_KV.put(`email:${emailLower}`, userId)

    const { sign } = await import('hono/jwt')
    const token = await sign({ sub: userId, iat: Date.now() }, getJwtSecret(env), 'HS256')
    return json({ token, userId, email: emailLower })
  } catch (err) {
    console.error('Register error:', err)
    return json({ error: 'Registration failed' }, 500)
  }
}

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const salt = crypto.randomUUID()
  const derivedKey = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const key = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 10000, hash: 'SHA-256' },
    derivedKey, 256
  )
  const hash = btoa(String.fromCharCode(...new Uint8Array(key)))
  return `${salt}:${hash}`
}

function getJwtSecret(env) {
  return env?.JWT_SECRET || 'checklist-app-dev-secret-change-in-production'
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
