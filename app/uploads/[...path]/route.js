// Serves uploaded files (/uploads/...) through the frontend origin, so links in comments,
// reports and documents open on the same host (preview in <iframe>/<img> works everywhere).
const BACKEND = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001').replace(/\/$/, '')

export async function GET(request, context) {
  const p = await context.params
  const path = (p?.path || []).map(encodeURIComponent).join('/')
  try {
    const res = await fetch(`${BACKEND}/uploads/${path}`)
    const headers = new Headers()
    for (const h of ['content-type', 'content-length', 'cache-control']) {
      const v = res.headers.get(h)
      if (v) headers.set(h, v)
    }
    headers.set('content-disposition', 'inline')
    return new Response(res.body, { status: res.status, headers })
  } catch (err) {
    return new Response(`File server unreachable: ${err.message}`, { status: 503 })
  }
}
