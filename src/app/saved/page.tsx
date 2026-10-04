import type { Metadata } from 'next';
import { SavedView } from '@/components/views/SavedView';

export const metadata: Metadata = { title: 'Saved' };

export default function Page() {
  return <SavedView />;
}
