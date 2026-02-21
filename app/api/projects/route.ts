import { NextResponse } from 'next/server';
import { listProjects } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const projects = listProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('List projects error:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}
