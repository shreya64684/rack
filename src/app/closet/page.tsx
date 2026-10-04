import type { Metadata } from 'next';
import { ClosetView } from '@/components/views/ClosetView';

export const metadata: Metadata = { title: 'Closet' };

export default function Page() {
  return <ClosetView />;
}
