import { NextResponse } from 'next/server'

// Backend FastAPI URL — must be reachable from the Next.js server process
const BACKEND = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001').replace(/\/$/, '')

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

async function proxy(request, context) {
  // Next.js 15: params is a Promise — must be awaited
  const { path: segments = [] } = await context.params
  const path = Array.isArray(segments) ? segments.join('/') : segments

  // Reconstruct query string from the incoming request URL
  const incoming = new URL(request.url)
  const search = incoming.search   // e.g. "?ppd_id=PPD-01&status=all"

  const targetUrl = `${BACKEND}/api/${path}${search}`

  // Forward Authorization and Content-Type headers (including multipart boundary)
  const contentType = request.headers.get('content-type') || ''
  const forwardHeaders = {}
  const auth = request.headers.get('authorization')
  if (auth) forwardHeaders['Authorization'] = auth
  // Forward Content-Type as-is — for multipart/form-data this includes the boundary string
  if (contentType) forwardHeaders['Content-Type'] = contentType

  const method = request.method.toUpperCase()

  // For body-carrying methods, read raw bytes to avoid re-encoding
  let body = undefined
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const bytes = await request.arrayBuffer()
    if (bytes.byteLength > 0) body = bytes
  }

  let backendRes
  try {
    backendRes = await fetch(targetUrl, {
      method,
      headers: forwardHeaders,
      body,
      redirect: 'manual',
    })
  } catch (err) {
    return NextResponse.json(
      { detail: `Backend unreachable: ${err.message}. Make sure FastAPI is running on ${BACKEND}` },
      { status: 503, headers: corsHeaders() }
    )
  }

  // Stream the response back — preserve status code, content-type, etc.
  const responseBody = await backendRes.arrayBuffer()
  const responseHeaders = new Headers(corsHeaders())

  const ct = backendRes.headers.get('content-type')
  if (ct) responseHeaders.set('content-type', ct)

  const cd = backendRes.headers.get('content-disposition')
  if (cd) responseHeaders.set('content-disposition', cd)

  return new NextResponse(responseBody, {
    status: backendRes.status,
    headers: responseHeaders,
  })
}

export const GET    = proxy
export const POST   = proxy
export const PUT    = proxy
export const PATCH  = proxy
export const DELETE = proxy
