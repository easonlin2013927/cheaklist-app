export async function onRequestPost(context) {
  const { request, env } = context

  try {
    const { email, password } = await request.json()
    if (!email || !password) return json({ error: 'Email and password required' }, 400)

    const emailLower = email.toLowerCase().trim()
    const userId = await env.CHECKLIST_KV.get(`email:${emailLower}`)
    if (!userId) return json({ error: 'Invalid credentials' }, 401)

    const storedHash = await env.CHECKLIST_KV.get(`user:${emailLower}`)
    if (!storedHash) return json({ error: 'Invalid credentials' }, 401)

    const valid = await verifyPassword(password, storedHash)
    if (!valid) return json({ error: 'Invalid credentials' }, 401)

    const userData = await env.CHECKLIST_KV.get(`uid:${userId}`)
    if (!userData) return json({ error: 'Invalid credentials' }, 401)

    const { sign } = await import('hono/jwt')
    const token = await sign({ sub: userId, iat: Date.now() }, getJwtSecret(env), 'HS256')
    return json({ token, userId, email: emailLower, data: JSON.parse(userData) })
  } catch (err) {
    console.error('Login error:', err)
    return json({ error: 'Login failed' }, 500)
  }
}

async function verifyPassword(password, stored) {
  const [salt, _] = stored.split(':')
  const hash = await hashPasswordWithSalt(password, salt)
  return hash === stored
}

async function hashPasswordWithSalt(password, salt) {
  const encoder = new TextEncoder()
  const derivedKey = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const key = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 10000, hash: 'SHA-256' },
    derivedKey, 256
  )
  return `:${btoa(String.fromCharCode(...new Uint8Array(key)))}`
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
