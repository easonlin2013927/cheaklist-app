export async function onRequestGet(context) {
  const { request, env } = context

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

export async function onRequestPut(context) {
  const { request, env } = context

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

export async function onRequestDelete(context) {
  const { request, env } = context

  try {
    const auth = await authenticate(request, env)
    if (!auth) return json({ error: 'Unauthorized' }, 401)
    await env.CHECKLIST_KV.delete(`data:${auth.sub}`)
    return json({ success: true })
  } catch (err) {
    return json({ error: 'Failed to delete data' }, 500)
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
