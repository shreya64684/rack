import type { Metadata } from 'next';
import { MissingView } from '@/components/views/MissingView';

export const metadata: Metadata = { title: 'Missing piece' };

export default function Page() {
  return <MissingView />;
}
