import { JournalListSkeleton } from '../components/Loading';

export default function Loading() {
    return (
        <div style={{ padding: '24px' }}>
            <h1 style={{
                fontSize: '24px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '24px'
            }}>
                Journals
            </h1>
            <JournalListSkeleton />
        </div>
    );
}
