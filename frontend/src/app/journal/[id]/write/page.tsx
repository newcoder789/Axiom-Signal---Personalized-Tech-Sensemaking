// journal/[id]/write/page.tsx
import JournalWriteClient from './JournalWriteClient';
import { getJournal, getThoughtsByJournal } from '@/lib/actions';
import { notFound } from 'next/navigation';

export default async function JournalWritePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    console.log(id)

    const journal = await getJournal(id);
    if (!journal) {
        notFound();
    }

    const thoughts = await getThoughtsByJournal(id);

    return <JournalWriteClient journal={journal} initialThoughts={thoughts} />;
}
