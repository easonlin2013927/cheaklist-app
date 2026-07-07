export async function onRequestGet(context) {
  const { request, env } = context

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

async function authenticate(request, env) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    const token = authHeader.slice(7)
    const { verify } = await import('hono/jwt')
    const payload = await verify(token, getJwtSecret(env), { alg: 'HS256' })
    return { sub: payload.sub }
  } catch {
    return null
  }
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
