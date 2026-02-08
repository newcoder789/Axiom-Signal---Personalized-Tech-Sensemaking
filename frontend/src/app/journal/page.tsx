import { getJournals } from '@/lib/actions';
import { JournalList } from '../components/journal/JournalList';

export default async function JournalsPage() {
    const journals = await getJournals();

    return <JournalList journals={journals} />;
}
