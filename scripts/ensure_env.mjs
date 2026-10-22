import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const envLocalPath = path.join(projectRoot, '.env.local');
const envPath = path.join(projectRoot, '.env');
const envExamplePath = path.join(projectRoot, '.env.example');

// 1. If neither .env.local nor .env exists, auto-create .env.local from .env.example
if (!fs.existsSync(envLocalPath) && !fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envLocalPath);
    console.log('\n========================================================================');
    console.log('🎉 TASK EARN HUB: AUTO TURNKEY INITIALIZATION');
    console.log('========================================================================');
    console.log('✅ Created `.env.local` automatically from `.env.example`!');
    console.log('👉 Open `.env.local` and paste your Supabase Project credentials:');
    console.log('   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"');
    console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"');
    console.log('   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
    console.log('========================================================================\n');
  }
}

// 2. Read the active env file to give helpful status feedback
const targetEnv = fs.existsSync(envLocalPath) ? envLocalPath : (fs.existsSync(envPath) ? envPath : null);

if (targetEnv) {
  const content = fs.readFileSync(targetEnv, 'utf8');
  const hasUrl = /NEXT_PUBLIC_SUPABASE_URL=["']?https:\/\/([^."'\s]+)\.supabase\.co/i.test(content) ||
                 /VITE_SUPABASE_URL=["']?https:\/\/([^."'\s]+)\.supabase\.co/i.test(content) ||
                 /SUPABASE_URL=["']?https:\/\/([^."'\s]+)\.supabase\.co/i.test(content);

  const match = content.match(/https:\/\/([^."'\s]+)\.supabase\.co/i);
  const projectRef = match && match[1] && !match[1].includes('your-project') ? match[1] : null;

  if (projectRef) {
    console.log(`\n🚀 [Supabase Auto-Sync] Connected Project: https://${projectRef}.supabase.co`);
  } else {
    console.log('\n⚠️  [Supabase Notice] No active Supabase URL in `.env.local`. Running in offline preview mode.');
    console.log('👉 To connect live database, paste your Supabase keys in `.env.local` or `.env`.\n');
  }
}
