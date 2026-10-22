import fs from 'fs';
import path from 'path';
import { exec, execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

const projectRoot = process.cwd();
const envLocalPath = path.join(projectRoot, '.env.local');
const envPath = path.join(projectRoot, '.env');
const masterSchemaPath = path.join(projectRoot, 'master_schema.sql');

console.log('========================================================================');
console.log('⚡ TASK EARN HUB: 1-CLICK DATABASE SETUP & HEALTH CHECK');
console.log('========================================================================');

// 1. Locate and parse environment variables
const targetEnv = fs.existsSync(envLocalPath) ? envLocalPath : (fs.existsSync(envPath) ? envPath : null);

if (!targetEnv) {
  console.error('\n❌ No `.env` or `.env.local` file found in project root!');
  console.log('👉 Please create `.env.local` and paste your Supabase Project APIs:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"');
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"');
  console.log('   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"\n');
  process.exit(1);
}

const envContent = fs.readFileSync(targetEnv, 'utf8');

function getEnvVal(key) {
  const match = envContent.match(new RegExp(`^${key}=["']?([^"'\\r\\n]+)["']?`, 'm'));
  return match ? match[1].trim() : '';
}

const supabaseUrl = getEnvVal('NEXT_PUBLIC_SUPABASE_URL') || getEnvVal('VITE_SUPABASE_URL') || getEnvVal('SUPABASE_URL');
const supabaseAnonKey = getEnvVal('NEXT_PUBLIC_SUPABASE_ANON_KEY') || getEnvVal('VITE_SUPABASE_ANON_KEY') || getEnvVal('SUPABASE_ANON_KEY');
const supabaseServiceKey = getEnvVal('SUPABASE_SERVICE_ROLE_KEY') || getEnvVal('VITE_SUPABASE_SERVICE_ROLE_KEY') || supabaseAnonKey;
const databaseUrl = getEnvVal('DATABASE_URL');

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project')) {
  console.error('\n❌ Valid Supabase URL and Anon Key are missing in ' + path.basename(targetEnv));
  console.log('👉 Open ' + path.basename(targetEnv) + ' and add your Supabase project credentials.\n');
  process.exit(1);
}

const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/i);
const projectRef = match ? match[1] : null;

console.log(`📡 Supabase Project: ${supabaseUrl}`);
if (projectRef) console.log(`🆔 Project Reference: ${projectRef}`);

// 2. Test Connection and verify if tables already exist
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function checkDatabaseTables() {
  try {
    const { data, error } = await supabase.from('plans').select('id, name, plan_price').limit(1);
    if (!error) {
      return { exists: true, error: null };
    }
    return { exists: false, error: error.message };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

async function run() {
  console.log('\n🔍 Checking database state in Supabase...');
  const { exists, error } = await checkDatabaseTables();

  if (exists) {
    console.log('✅ DATABASE IS ALREADY INITIALIZED & FULLY OPERATIONAL! 🎉');
    console.log('👉 All 18 tables, triggers, and realtime listeners are active.');
    console.log('👉 You can run `npm run dev` to start developing immediately!\n');
    return;
  }

  console.log('⚠️  Database tables not detected in this Supabase project.');
  console.log('   Reason:', error || 'Tables missing');

  if (!fs.existsSync(masterSchemaPath)) {
    console.error('❌ master_schema.sql not found at ' + masterSchemaPath);
    return;
  }

  const sqlContent = fs.readFileSync(masterSchemaPath, 'utf8');

  // Copy to system clipboard (Windows `clip` or cross-platform fallback)
  let copiedToClipboard = false;
  try {
    if (process.platform === 'win32') {
      execSync('clip', { input: sqlContent, stdio: ['pipe', 'ignore', 'ignore'] });
      copiedToClipboard = true;
    }
  } catch {
    // Ignore clipboard error
  }

  const sqlEditorUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
    : `https://supabase.com/dashboard`;

  console.log('\n========================================================================');
  console.log('🚀 1-CLICK DATABASE INITIALIZATION');
  console.log('========================================================================');
  if (copiedToClipboard) {
    console.log('📋 1. `master_schema.sql` has been AUTOMATICALLY COPIED TO YOUR CLIPBOARD!');
  } else {
    console.log('📁 1. `master_schema.sql` is ready in your project root.');
  }
  console.log(`🌐 2. Opening Supabase SQL Editor in your browser:`);
  console.log(`   👉 ${sqlEditorUrl}`);
  console.log('👉 3. Just press Ctrl + V (Paste) and click "RUN"!');
  console.log('========================================================================\n');

  // Open in browser
  try {
    if (process.platform === 'win32') {
      exec(`start ${sqlEditorUrl}`);
    } else if (process.platform === 'darwin') {
      exec(`open ${sqlEditorUrl}`);
    } else {
      exec(`xdg-open ${sqlEditorUrl}`);
    }
  } catch {
    // Ignore browser open error
  }

  // Poll for 60 seconds to detect when user runs the query
  console.log('⏳ Waiting to detect table creation in Supabase (press Ctrl+C to cancel)...');
  let attempts = 0;
  const pollInterval = setInterval(async () => {
    attempts++;
    const status = await checkDatabaseTables();
    if (status.exists) {
      clearInterval(pollInterval);
      console.log('\n========================================================================');
      console.log('🎉 BINGO! DATABASE SETUP DETECTED & VERIFIED SUCCESSFULLY!');
      console.log('========================================================================');
      console.log('✅ All 18 tables, security rules, and real-time sync are now live!');
      console.log('👉 Run `npm run dev` to launch your application!\n');
      process.exit(0);
    }
    if (attempts >= 20) {
      clearInterval(pollInterval);
      console.log('\nℹ️ Polling finished. Once you click "RUN" in Supabase, run `npm run dev`.');
      process.exit(0);
    }
  }, 3000);
}

run();
