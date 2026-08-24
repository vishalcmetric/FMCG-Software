import { NextResponse } from 'next/server'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders() })
}

export async function GET(request, { params }) {
  const path = (params?.path || []).join('/')
  try {
    if (path === 'health') return NextResponse.json({ status: 'ok', service: 'fmcg-software' }, { headers: corsHeaders() })
    if (path === '' || path === 'root') return NextResponse.json({ message: 'FMCG Software API' }, { headers: corsHeaders() })
    return NextResponse.json({ path, method: 'GET', message: 'Endpoint reachable — backend logic to be implemented' }, { headers: corsHeaders() })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: corsHeaders() })
  }
}

export async function POST(request, { params }) {
  const path = (params?.path || []).join('/')
  try {
    const body = await request.json().catch(() => ({}))
    return NextResponse.json({ path, method: 'POST', received: body, ok: true }, { headers: corsHeaders() })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: corsHeaders() })
  }
}

export async function PUT(request, { params }) {
  const path = (params?.path || []).join('/')
  const body = await request.json().catch(() => ({}))
  return NextResponse.json({ path, method: 'PUT', received: body, ok: true }, { headers: corsHeaders() })
}

export async function DELETE(request, { params }) {
  const path = (params?.path || []).join('/')
  return NextResponse.json({ path, method: 'DELETE', ok: true }, { headers: corsHeaders() })
}
