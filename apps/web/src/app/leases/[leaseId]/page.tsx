import Link from "next/link";

export default function Page() {
  return <main className="mx-auto max-w-4xl p-6">
    <h1 className="text-2xl font-semibold">Lease details</h1>
    <p className="my-4">This page is not available yet.</p>
    <Link className="underline" href="/leases">Back to leases</Link>
  </main>;
}
