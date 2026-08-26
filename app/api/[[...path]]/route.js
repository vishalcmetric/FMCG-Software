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
  let segments = []
  try {
    const p = await context.params
    segments = p?.path || []
  } catch {
    segments = []
  }
  const path = Array.isArray(segments) ? segments.join('/') : String(segments)

  // Reconstruct query string from the incoming request URL
  const incoming = new URL(request.url)
  const search = incoming.search

  const targetUrl = `${BACKEND}/api/${path}${search}`

  // Forward Authorization and Content-Type headers (including multipart boundary)
  const contentType = request.headers.get('content-type') || ''
  const forwardHeaders = {}
  const auth = request.headers.get('authorization')
  if (auth) forwardHeaders['Authorization'] = auth
  if (contentType) forwardHeaders['Content-Type'] = contentType

  const method = request.method.toUpperCase()

  // For body-carrying methods, read raw bytes to avoid re-encoding
  let body = undefined
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    try {
      const bytes = await request.arrayBuffer()
      if (bytes.byteLength > 0) body = bytes
    } catch {
      // body already consumed or empty — leave undefined
    }
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
    console.error(`[proxy] Backend unreachable at ${targetUrl}:`, err.message)
    return NextResponse.json(
      { detail: `Backend unreachable: ${err.message}. Is FastAPI running on ${BACKEND}?` },
      { status: 503, headers: corsHeaders() }
    )
  }

  // Read response body
  let responseBody
  try {
    responseBody = await backendRes.arrayBuffer()
  } catch (err) {
    console.error(`[proxy] Failed to read backend response body:`, err.message)
    return NextResponse.json(
      { detail: `Failed to read backend response: ${err.message}` },
      { status: 502, headers: corsHeaders() }
    )
  }

  const responseHeaders = new Headers(corsHeaders())

  const ct = backendRes.headers.get('content-type')
  if (ct) responseHeaders.set('content-type', ct)

  const cd = backendRes.headers.get('content-disposition')
  if (cd) responseHeaders.set('content-disposition', cd)

  // Log errors for debugging
  if (backendRes.status >= 400) {
    const preview = new TextDecoder().decode(responseBody.slice(0, 500))
    console.error(`[proxy] Backend returned ${backendRes.status} for ${method} ${targetUrl}: ${preview}`)
  }

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
