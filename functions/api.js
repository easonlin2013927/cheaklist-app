import { Hono } from 'hono'
import { jwt, sign, verify } from 'hono/jwt'

const app = new Hono()

const getJwtSecret = () => globalThis.env?.JWT_SECRET || 'checklist-app-dev-secret-change-in-production'
const HASH_ROUNDS = 10

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

function generateToken(userId) {
  return sign({ sub: userId, iat: Date.now() }, getJwtSecret(), 'HS256')
}

function authenticate(c) {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return Promise.resolve(null)
    const token = authHeader.slice(7)
    const payload = verify(token, getJwtSecret())
    return Promise.resolve({ sub: payload.sub })
  } catch {
    return Promise.resolve(null)
  }
}

// ── Auth routes ───────────────────────────────────────────────

app.post('/api/auth/register', async (c) => {
  try {
    const { email, password } = await c.req.json()
    if (!email || !password) return c.json({ error: 'Email and password required' }, 400)
    if (password.length < 6) return c.json({ error: 'Password must be at least 6 characters' }, 400)

    const emailLower = email.toLowerCase().trim()
    const userKey = `user:${emailLower}`
    const existing = await CHECKLIST_KV.get(userKey)
    if (existing) return c.json({ error: 'Email already registered' }, 409)

    const hashedPassword = await hashPassword(password)
    const userId = crypto.randomUUID()
    const userData = JSON.stringify({ userId, email: emailLower, createdAt: Date.now() })

    await CHECKLIST_KV.put(userKey, hashedPassword)
    await CHECKLIST_KV.put(`uid:${userId}`, userData)
    await CHECKLIST_KV.put(`email:${emailLower}`, userId)

    const token = await generateToken(userId)
    return c.json({ token, userId, email: emailLower })
  } catch (err) {
    console.error('Register error:', err)
    return c.json({ error: 'Registration failed' }, 500)
  }
})

app.post('/api/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    if (!email || !password) return c.json({ error: 'Email and password required' }, 400)

    const emailLower = email.toLowerCase().trim()
    const userId = await CHECKLIST_KV.get(`email:${emailLower}`)
    if (!userId) return c.json({ error: 'Invalid credentials' }, 401)

    const storedHash = await CHECKLIST_KV.get(`user:${emailLower}`)
    if (!storedHash) return c.json({ error: 'Invalid credentials' }, 401)

    const valid = await verifyPassword(password, storedHash)
    if (!valid) return c.json({ error: 'Invalid credentials' }, 401)

    const userData = await CHECKLIST_KV.get(`uid:${userId}`)
    if (!userData) return c.json({ error: 'Invalid credentials' }, 401)

    const token = await generateToken(userId)
    return c.json({ token, userId, email: emailLower, data: JSON.parse(userData) })
  } catch (err) {
    console.error('Login error:', err)
    return c.json({ error: 'Login failed' }, 500)
  }
})

app.post('/api/auth/change-password', async (c) => {
  try {
    const auth = await authenticate(c)
    if (!auth) return c.json({ error: 'Unauthorized' }, 401)

    const { password } = await c.req.json()
    if (!password || password.length < 6) return c.json({ error: 'Password must be at least 6 characters' }, 400)

    const userData = await CHECKLIST_KV.get(`uid:${auth.userId}`)
    if (!userData) return c.json({ error: 'User not found' }, 404)

    const user = JSON.parse(userData)
    const hashedPassword = await hashPassword(password)
    await CHECKLIST_KV.put(`user:${user.email}`, hashedPassword)

    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: 'Failed' }, 500)
  }
})

// ── Data routes ───────────────────────────────────────────────

app.get('/api/data', async (c) => {
  try {
    const auth = await authenticate(c)
    if (!auth) return c.json({ error: 'Unauthorized' }, 401)

    const data = await CHECKLIST_KV.get(`data:${auth.userId}`)
    if (!data) return c.json({ categories: [{ id: 1, title: '清單', items: [] }] })
    return c.json(JSON.parse(data))
  } catch (err) {
    return c.json({ error: 'Failed to fetch data' }, 500)
  }
})

app.put('/api/data', async (c) => {
  try {
    const auth = await authenticate(c)
    if (!auth) return c.json({ error: 'Unauthorized' }, 401)

    const data = await c.req.json()
    await CHECKLIST_KV.put(`data:${auth.userId}`, JSON.stringify(data))
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: 'Failed to save data' }, 500)
  }
})

app.delete('/api/data', async (c) => {
  try {
    const auth = await authenticate(c)
    if (!auth) return c.json({ error: 'Unauthorized' }, 401)
    await CHECKLIST_KV.delete(`data:${auth.userId}`)
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: 'Failed to delete data' }, 500)
  }
})

// ── User info route ───────────────────────────────────────────

app.get('/api/me', async (c) => {
  try {
    const auth = await authenticate(c)
    if (!auth) return c.json({ error: 'Unauthorized' }, 401)

    const userData = await CHECKLIST_KV.get(`uid:${auth.userId}`)
    if (!userData) return c.json({ error: 'User not found' }, 404)

    return c.json(JSON.parse(userData))
  } catch {
    return c.json({ error: 'Failed' }, 500)
  }
})

export default app
