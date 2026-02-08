import { getThoughtsByJournal } from '@/lib/actions';
import JournalDetailClient from './JournalDetailClient';
interface JournalPageProps {
    params: Promise<{ id: string }>;
}

export default async function JournalDetailPage({ params }: JournalPageProps) {
    const { id } = await params;
    const thoughts = await getThoughtsByJournal(id);
    console.log(thoughts)
    return <JournalDetailClient journalId={id} initialThoughts={thoughts} />;
}
