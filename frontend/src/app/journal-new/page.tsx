import { getJournals, getThoughtsByJournal, getRecentThoughts } from '@/lib/actions';
import JournalClient from './JournalClient';

export default async function JournalPage() {
    // Load journals and recent thoughts from database
    const journals = await getJournals();
    const recentThoughts = await getRecentThoughts(20);

    return <JournalClient journals={journals} initialThoughts={recentThoughts} />;
}
