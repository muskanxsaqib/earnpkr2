# 🚀 Next.js Conversion & Local Setup Guide (Task Earn Hub)

Agar aap is project ko apne local system (VS Code) mein Next.js par chalana chahte hain, to yeh simple steps follow karein:

---

## 1. Local Machine par Direct Run karne ka Tareeqa (Vite - Super Fast)

Agar aap Vite ke sath hi local par chalana chahein:
```bash
# 1. Dependencies install karein
npm install

# 2. .env file banayein
cp .env.example .env
# Aur apni Supabase URL aur Anon Key daal dein:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key

# 3. Start dev server
npm run dev
```

---

## 2. Next.js 14/15 App Router mein Convert karne ke Steps

Jab aap is project ko Next.js project mein shift karein:

### Step 1: Environment Variables Rename karein
Next.js mein `import.meta.env` ki jagah `process.env.NEXT_PUBLIC_` use hota hai:
- `VITE_SUPABASE_URL` ➡️ `NEXT_PUBLIC_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` ➡️ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

`src/lib/supabase.ts` mein:
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
```

### Step 2: Client Component Directive ('use client')
Kyunke is app mein state, local storage, audio sound effects, aur Supabase realtime channels hain, Next.js App Router mein:
`app/page.tsx` ke sab se upar yeh line likhein:
```tsx
'use client';

import dynamic from 'next/dynamic';

// SSR disable karein taake window / localStorage error na aaye:
const App = dynamic(() => import('../src/App').then((mod) => mod.App), {
  ssr: false,
});

export default function HomePage() {
  return <App />;
}
```

### Step 3: Tailwind CSS Setup (Tailwind v4)
`app/globals.css` mein:
```css
@import "tailwindcss";
```

### Step 4: Lucide Icons & Packages
Next.js project mein yeh packages install kar lein:
```bash
npm install @supabase/supabase-js lucide-react crypto-js motion
```

---

## 3. Vercel Par 1-Click Deploy
Agar aap Next.js sirf Vercel par live karne ke liye chahte the, to yeh Vite app bhi direct Vercel par deploy ho sakti hai:
- GitHub par push karein
- Vercel par "New Project" select karein
- Root directory select karein (Vercel khud detect kar lega)
- `VITE_SUPABASE_URL` aur `VITE_SUPABASE_ANON_KEY` Environment Variables add karein
- Deploy dabayein!
