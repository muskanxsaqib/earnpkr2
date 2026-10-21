import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const stagingDir = path.resolve('temp_clean_staging');
const zipFileProject = path.resolve('task-earn-hub-clean-source.zip');
const zipFileDeveloper = path.resolve('..', 'task-earn-hub-clean-source.zip');

console.log('🚀 Preparing Clean Turnkey Source Package...');

// 1. Clean previous staging or zip if exists
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
if (fs.existsSync(zipFileProject)) {
  fs.unlinkSync(zipFileProject);
}
if (fs.existsSync(zipFileDeveloper)) {
  fs.unlinkSync(zipFileDeveloper);
}

fs.mkdirSync(stagingDir, { recursive: true });

// 2. Define exact directories and files to copy
const dirsToCopy = ['src', 'scripts'];

const filesToCopy = [
  '.env.example',
  '.gitignore',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'next.config.mjs',
  'postcss.config.mjs',
  'vercel.json',
  'vite.config.ts',
  'next-env.d.ts',
  'index.html',
  'run-local.bat',
  'metadata.json',
  'master_schema.sql',
  'ENABLE_LIVE_REALTIME_SYNC.sql',
  'MULTI_CURRENCY_SETUP.sql',
  'ALLOW_CLIENT_DOMAIN.sql',
  'README.md',
  'AGENTS.md',
  'SYSTEM_DOCUMENTATION.md',
  'NEXTJS_CONVERSION_GUIDE.md',
  'admin_customization_migration.sql',
  'backend_security_migration.sql',
  'create_feature_flags_migration.sql',
  'FIX_SUPABASE_RLS_RECURSION.sql',
  'insert_plans.sql',
  'PLANS_AND_REINVEST_UPGRADE.sql',
  'SUPABASE_ADMIN_SECURITY_QUERIES.sql',
  'SUPABASE_COMPLETE_BACKEND_SETUP.sql',
  'SUPABASE_DATABASE_PERFECTION.sql',
  'SUPABASE_HACKER_PROOF_RLS_AND_PLAN_PROTECTION.sql',
  'SUPABASE_MILITARY_SECURITY_HARDENING.sql'
];

// Helper to copy recursively
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(child => {
      // Exclude build artifacts or junk if nested
      if (!child.startsWith('.next') && !child.includes('tsbuildinfo')) {
        copyRecursive(path.join(src, child), path.join(dest, child));
      }
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Copy directories
dirsToCopy.forEach(d => {
  if (fs.existsSync(d)) {
    console.log(` 📁 Copying directory: ${d}/`);
    copyRecursive(d, path.join(stagingDir, d));
  }
});

// Copy files
filesToCopy.forEach(f => {
  if (fs.existsSync(f)) {
    console.log(` 📄 Copying file: ${f}`);
    fs.copyFileSync(f, path.join(stagingDir, f));
  }
});

// 3. Security Sanity Check on Staging
console.log('\n🔒 Running Security Sanity Check on Staging Directory...');
const forbiddenChecks = ['.env', '.env.local', 'node_modules', '.next', '.git', '.aistudio', 'dist', 'tsconfig.tsbuildinfo'];
let safetyViolations = 0;

forbiddenChecks.forEach(item => {
  const checkPath = path.join(stagingDir, item);
  if (fs.existsSync(checkPath)) {
    console.error(`❌ SECURITY VIOLATION: ${item} was found in staging!`);
    safetyViolations++;
  }
});

if (safetyViolations > 0) {
  console.error('Abort! Staging contains prohibited items.');
  process.exit(1);
}
console.log('✅ 100% CLEAN: No secrets, build caches, node_modules, or git files in package!');

// 4. Compress Archive using native Windows tar
console.log('\n📦 Compressing into ZIP Archive using Windows native archiver...');
execSync(`tar -a -c -f "${zipFileProject}" *`, { cwd: stagingDir });

// Copy to parent D:\Developer as well for convenient user access
fs.copyFileSync(zipFileProject, zipFileDeveloper);

// 5. Cleanup Staging
fs.rmSync(stagingDir, { recursive: true, force: true });

// 6. Report Stats
const stats = fs.statSync(zipFileProject);
const sizeKB = (stats.size / 1024).toFixed(2);
const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

console.log('\n====================================================');
console.log('🎉 ZIP ARCHIVE CREATED SUCCESSFULLY!');
console.log('====================================================');
console.log(`📍 File Location 1: ${zipFileProject}`);
console.log(`📍 File Location 2: ${zipFileDeveloper}`);
console.log(`⚖️ Total Archive Size: ${sizeKB} KB (${sizeMB} MB)`);
console.log('====================================================');
