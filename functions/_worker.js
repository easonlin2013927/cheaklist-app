export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  // Route: /api/auth/register
  if (path === '/api/auth/register' && method === 'POST') {
    return handleRegister(request, env)
  }

  // Route: /api/auth/login
  if (path === '/api/auth/login' && method === 'POST') {
    return handleLogin(request, env)
  }

  // Route: /api/auth/change-password
  if (path === '/api/auth/change-password' && method === 'POST') {
    return handleChangePassword(request, env)
  }

  // Route: /api/data
  if (path === '/api/data' && method === 'GET') {
    return handleGetData(request, env)
  }
  if (path === '/api/data' && method === 'PUT') {
    return handleSaveData(request, env)
  }
  if (path === '/api/data' && method === 'DELETE') {
    return handleDeleteData(request, env)
  }

  // Route: /api/me
  if (path === '/api/me' && method === 'GET') {
    return handleMe(request, env)
  }

  return context.next()
}

// ── Helpers ───────────────────────────────────────────────────

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

async function authenticate(request, env) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    const token = authHeader.slice(7)
    const { verify } = await import('hono/jwt')
    const payload = verify(token, getJwtSecret(env))
    return { sub: payload.sub }
  } catch {
    return null
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

// ── Auth routes ───────────────────────────────────────────────

async function handleRegister(request, env) {
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
    const token = sign({ sub: userId, iat: Date.now() }, getJwtSecret(env), 'HS256')
    return json({ token, userId, email: emailLower })
  } catch (err) {
    console.error('Register error:', err)
    return json({ error: 'Registration failed' }, 500)
  }
}

async function handleLogin(request, env) {
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
    const token = sign({ sub: userId, iat: Date.now() }, getJwtSecret(env), 'HS256')
    return json({ token, userId, email: emailLower, data: JSON.parse(userData) })
  } catch (err) {
    console.error('Login error:', err)
    return json({ error: 'Login failed' }, 500)
  }
}

async function handleChangePassword(request, env) {
  try {
    const auth = await authenticate(request, env)
    if (!auth) return json({ error: 'Unauthorized' }, 401)

    const { password } = await request.json()
    if (!password || password.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400)

    const userData = await env.CHECKLIST_KV.get(`uid:${auth.sub}`)
    if (!userData) return json({ error: 'User not found' }, 404)

    const user = JSON.parse(userData)
    const hashedPassword = await hashPassword(password)
    await env.CHECKLIST_KV.put(`user:${user.email}`, hashedPassword)

    return json({ success: true })
  } catch (err) {
    return json({ error: 'Failed' }, 500)
  }
}

// ── Data routes ───────────────────────────────────────────────

async function handleGetData(request, env) {
  try {
    const auth = await authenticate(request, env)
    if (!auth) return json({ error: 'Unauthorized' }, 401)

    const data = await env.CHECKLIST_KV.get(`data:${auth.sub}`)
    if (!data) return json({ categories: [{ id: 1, title: '清單', items: [] }] })
    return json(JSON.parse(data))
  } catch (err) {
    return json({ error: 'Failed to fetch data' }, 500)
  }
}

async function handleSaveData(request, env) {
  try {
    const auth = await authenticate(request, env)
    if (!auth) return json({ error: 'Unauthorized' }, 401)

    const data = await request.json()
    await env.CHECKLIST_KV.put(`data:${auth.sub}`, JSON.stringify(data))
    return json({ success: true })
  } catch (err) {
    return json({ error: 'Failed to save data' }, 500)
  }
}

async function handleDeleteData(request, env) {
  try {
    const auth = await authenticate(request, env)
    if (!auth) return json({ error: 'Unauthorized' }, 401)
    await env.CHECKLIST_KV.delete(`data:${auth.sub}`)
    return json({ success: true })
  } catch (err) {
    return json({ error: 'Failed to delete data' }, 500)
  }
}

// ── User info route ───────────────────────────────────────────

async function handleMe(request, env) {
  try {
    const auth = await authenticate(request, env)
    if (!auth) return json({ error: 'Unauthorized' }, 401)

    const userData = await env.CHECKLIST_KV.get(`uid:${auth.sub}`)
    if (!userData) return json({ error: 'User not found' }, 404)

    return json(JSON.parse(userData))
  } catch {
    return json({ error: 'Failed' }, 500)
  }
}
