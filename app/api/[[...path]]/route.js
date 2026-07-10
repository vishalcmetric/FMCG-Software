import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

let client
async function getDb() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
  }
  return client.db(process.env.DB_NAME || 'zydus_wellness')
}

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
    if (path === 'health') return NextResponse.json({ status: 'ok', service: 'zydus-wellness' }, { headers: corsHeaders() })
    if (path === '' || path === 'root') return NextResponse.json({ message: 'Zydus Wellness API' }, { headers: corsHeaders() })
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
