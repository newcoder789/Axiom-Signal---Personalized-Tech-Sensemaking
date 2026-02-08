# Phase 2: Backend Integration - Implementation Guide

## ✅ Completed So Far

### 1. Project Structure Updated
- ✅ Added Drizzle ORM, PostgreSQL dependencies
- ✅ Created `lib/db.ts` - Database connection
- ✅ Created `lib/schema.ts` - Complete database schema
- ✅ Created `lib/actions.ts` - Server actions for data operations
- ✅ Added `drizzle.config.ts` - Drizzle Kit configuration
- ✅ Created `docker-compose.yml` - Local PostgreSQL setup
- ✅ Created `.env.local` - Environment variables

### 2. Database Schema Designed
Tables created:
- `users` - User accounts
- `journals` - User journals/notebooks
- `thoughts` - Decision entries with Axiom analysis
- `beliefs` - Extracted beliefs from thoughts
- `tags` - Categorization tags
- `thought_tags` - Many-to-many relationship
- `focus_sessions` - Pomodoro-style focus tracking

## 🚀 Next Steps (Do This Now)

### Step 1: Start PostgreSQL Database
```bash
# In project root directory
docker-compose up -d postgres

# Check if running
docker ps
```

### Step 2: Install Dependencies (Running)
```bash
cd frontend
npm install
# This is currently running...
```

### Step 3: Push Schema to Database
```bash
# After npm install completes
cd frontend
npm run db:push
```

This will create all tables in your PostgreSQL database.

### Step 4: (Optional) Open Database Studio
```bash
npm run db:studio
```

Visit `https://local.drizzle.studio` to browse your database visually.

## 📊 Test the Integration

### Option A: Quick Test via API
Create a test file: `frontend/test-db.ts`

```typescript
import { createJournal, createThought } from './src/lib/actions';

async function test() {
  // Create a journal
  const journal = await createJournal({
    title: 'My First Journal',
    description: 'Testing database integration',
    color: '#3B82F6',
    icon: '📝'
  });
  
  console.log(' Created journal:', journal);
  
  // Create a thought with Axiom verdict
  const thought = await createThought({
    journalId: journal.id,
    title: 'Should I learn Rust?',
    content: 'Thinking about learning Rust for systems programming...',
    verdict: 'explore',
    confidence: 65,
    reasoning: 'Good potential but needs more research',
    timeline: '3 months',
    actionItems: [
      { text: 'Read Rust book chapter 1', completed: false },
      { text: 'Build a CLI tool', completed: false }
    ],
    reasonCodes: ['MIXED_SIGNALS', 'MEDIUM_FRICTION'],
  });
  
  console.log('✅ Created thought:', thought);
}

test().catch(console.error);
```

Run it:
```bash
npx tsx frontend/test-db.ts
```

### Option B: Connect Decision API to Database

Update `frontend/src/app/api/verdict/route.ts` to save verdicts:

```typescript
import { createThought } from '@/lib/actions';

export async function POST(request: NextRequest) {
  // ... existing verdict logic ...
  
  const verdictData = await fetch(`${BACKEND_URL}/api/verdict`, ...);
  
  // Save to database
  if (body.saveToJournal && body.journalId) {
    await createThought({
      journalId: body.journalId,
      title: body.topic,
      content: body.context || '',
      verdict: verdictData.verdict,
      confidence: verdictData.confidence,
      reasoning: verdictData.reasoning,
      timeline: verdictData.timeline,
      actionItems: verdictData.actionItems,
      toolEvidence: verdictData.toolEvidence,
    });
  }
  
  return NextResponse.json(verdictData);
}
```

## 🔄 Update Frontend Pages

### 1. Update Journal Page
Replace mock data with real data:

```typescript
// app/journal/page.tsx
import { getJournals, getThoughtsByJournal } from '@/lib/actions';

export default async function JournalPage() {
  const journals = await getJournals();
  const thoughts = journals.length > 0 
    ? await getThoughtsByJournal(journals[0].id)
    : [];
  
  return <JournalUI journals={journals} thoughts={thoughts} />;
}
```

### 2. Update Dashboard
```typescript
// app/page.tsx
import { getDashboardStats, getActiveDecisions } from '@/lib/actions';

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const activeDecisions = await getActiveDecisions();
  
  return <DashboardUI stats={stats} decisions={activeDecisions} />;
}
```

### 3. Update History
```typescript
// app/history/page.tsx
import { getRecentThoughts } from '@/lib/actions';

export default async function HistoryPage() {
  const thoughts = await getRecentThoughts(50);
  
  return <HistoryTimeline thoughts={thoughts} />;
}
```

## 🎯 Phase 2 Completion Checklist

- [ ] PostgreSQL running (docker-compose up)
- [ ] Dependencies installed (npm install)
- [ ] Database schema pushed (npm run db:push)
- [ ] Test basic CRUD operations
- [ ] Connect Decide API to save verdicts
- [ ] Update Journal page with real data
- [ ] Update Dashboard with real stats
- [ ] Update History with real timeline
- [ ] Test end-to-end flow: Decide → Save → View in Journal

## 🐛 Troubleshooting

### Error: "DATABASE_URL not found"
- Check `.env.local` exists in `frontend/`
- Restart Next.js dev server: `npm run dev`

### Error: "Cannot connect to database"
- Check PostgreSQL is running: `docker ps`
- Check connection string in `.env.local`
- Try: `docker-compose restart postgres`

### Error: "Table does not exist"
- Run: `npm run db:push` to create tables
- Check Drizzle Studio: `npm run db:studio`

## 📚 Resources

- Drizzle ORM Docs: https://orm.drizzle.team/
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Next.js Server Actions: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions

## 🎉 Success Criteria

You've completed Phase 2 when:

✅ PostgreSQL is running locally
✅  All tables exist in database
✅ You can create a journal via server action
✅ You can create a thought via server action
✅ Dashboard shows real data from DB
✅ Journal page displays saved thoughts
✅ History shows thought evolution

**Next**: Phase 3 - Full Axiom Pipeline Integration
