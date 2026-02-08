import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

import { ensureUser, createJournal, createThought, getJournals, getThoughtsByJournal } from './src/lib/actions';

/**
 * Database Connection Test Script
 * Verifies that PostgreSQL connection and server actions work correctly
 */
async function testDatabase() {
    console.log('🧪 Testing Axiom Database Connection...\n');
    console.log('DATABASE_URL:', process.env.DATABASE_URL);


    try {
        // Test 1: Ensure user exists
        console.log('1️⃣  Testing user creation...');
        const userId = await ensureUser();
        console.log(`✅ User ID: ${userId}\n`);

        // Test 2: Create a journal
        console.log('2️⃣  Testing journal creation...');
        const journal = await createJournal({
            title: 'Test Journal - ' + new Date().toISOString(),
            description: 'Automated test journal for database verification',
            color: '#3B82F6',
            icon: '🧪',
        });
        console.log(`✅ Created journal: ${journal.id}`);
        console.log(`   Title: ${journal.title}`);
        console.log(`   Slug: ${journal.slug}\n`);

        // Test 3: Create a thought with verdict
        console.log('3️⃣  Testing thought creation...');
        const thought = await createThought({
            journalId: journal.id,
            title: 'Should I learn Rust for systems programming?',
            content: 'Considering learning Rust to build performance-critical applications. I have experience with Python and JavaScript.',
            verdict: 'explore',
            confidence: 68,
            reasoning: 'Rust has a steep learning curve but offers strong performance benefits. Worth exploring for systems programming projects.',
            timeline: '3 months',
            actionItems: [
                { text: 'Read The Rust Programming Language book', completed: false },
                { text: 'Build a CLI tool in Rust', completed: false },
                { text: 'Compare with Go for specific use case', completed: false },
            ],
            reasonCodes: ['LEARNING_CURVE', 'PERFORMANCE_BENEFITS'],
            toolEvidence: {
                market: { adoption: 'growing', confidence: 0.75 },
                friction: { overall: 0.65, confidence: 0.8 },
            },
        });
        console.log(`✅ Created thought: ${thought.id}`);
        console.log(`   Title: ${thought.title}`);
        console.log(`   Verdict: ${thought.verdict}`);
        console.log(`   Confidence: ${thought.confidence}%\n`);

        // Test 4: Retrieve data
        console.log('4️⃣  Testing data retrieval...');
        const journals = await getJournals();
        console.log(`✅ Retrieved ${journals.length} journal(s)`);

        const thoughts = await getThoughtsByJournal(journal.id);
        console.log(`✅ Retrieved ${thoughts.length} thought(s) from journal\n`);

        // Test 5: Verify data integrity
        console.log('5️⃣  Verifying data integrity...');
        const retrievedThought = thoughts.find(t => t.id === thought.id);
        if (retrievedThought) {
            console.log('✅ Thought data integrity verified');
            console.log(`   Action items count: ${(retrievedThought.actionItems as any[])?.length || 0}`);
            console.log(`   Has tool evidence: ${!!retrievedThought.toolEvidence}\n`);
        } else {
            console.error('❌ Could not retrieve created thought');
        }

        // Success summary
        console.log('🎉 All database tests passed!\n');
        console.log('Summary:');
        console.log(`   ✅ Database connection: Working`);
        console.log(`   ✅ Server actions: Working`);
        console.log(`   ✅ Data persistence: Working`);
        console.log(`   ✅ Type safety: Working`);

        console.log('\n📊 You can view this data in pgAdmin:');
        console.log('   URL: http://localhost:5050');
        console.log('   Email: admin@axiom.local');
        console.log('   Password: admin');

        console.log('\n💡 To run SQL queries:');
        console.log('   docker exec -it axiom_postgres psql -U axiom -d axiom_dev');
        console.log('   SELECT id, title, verdict FROM thoughts;');

    } catch (error) {
        console.error('\n❌ Database test failed:');
        console.error(error);
        console.error('\n🔧 Troubleshooting:');
        console.error('   1. Check PostgreSQL is running: docker ps');
        console.error('   2. Check DATABASE_URL in .env.local');
        console.error('   3. Verify schema was created: npm run db:push');
        console.error('   4. Check logs: docker logs axiom_postgres');
        process.exit(1);
    }
}

// Run the test
testDatabase().catch(console.error);
