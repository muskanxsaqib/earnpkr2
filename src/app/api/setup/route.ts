import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { serverAdminSupabase } from '@/src/lib/serverSupabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabaseUrl = (
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      ''
    ).trim();

    const isConfigured = Boolean(
      supabaseUrl &&
      !supabaseUrl.includes('your-project') &&
      !supabaseUrl.includes('placeholder')
    );

    const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/i);
    const projectRef = match ? match[1] : null;

    let isTablesReady = false;
    let tableError = null;

    if (isConfigured) {
      const { data, error } = await serverAdminSupabase
        .from('plans')
        .select('id')
        .limit(1);

      if (!error) {
        isTablesReady = true;
      } else {
        tableError = error.message;
      }
    }

    const sqlEditorUrl = projectRef
      ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
      : 'https://supabase.com/dashboard';

    return NextResponse.json({
      ok: true,
      isConfigured,
      isTablesReady,
      tableError,
      projectRef,
      sqlEditorUrl,
      supabaseUrl,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err.message,
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    // Return full master_schema.sql text so UI can copy it with 1-click
    const schemaPath = path.join(process.cwd(), 'master_schema.sql');
    if (!fs.existsSync(schemaPath)) {
      return NextResponse.json({ ok: false, error: 'master_schema.sql not found on server' }, { status: 404 });
    }
    const sql = fs.readFileSync(schemaPath, 'utf8');
    return NextResponse.json({ ok: true, sql });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
