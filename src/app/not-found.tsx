import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-xl py-16">
      <h1 className="display text-5xl">Not on the rail</h1>
      <p className="mt-4 text-lg">This page doesn&apos;t exist.</p>
      <Link href="/" className="btn btn-solid mt-6">
        Back to today&apos;s look
      </Link>
    </div>
  );
}
