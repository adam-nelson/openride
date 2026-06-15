import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SignOutButton } from '@/components/SignOutButton';
import { getSupabaseServer } from '@/lib/supabase-server';

const nav = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dispatch', label: 'Dispatch' },
  { href: '/drivers', label: 'Drivers' },
  { href: '/vehicles', label: 'Vehicles' },
  { href: '/fares', label: 'Fares' },
  { href: '/payments', label: 'Payments' },
  { href: '/compliance', label: 'Compliance' },
  { href: '/incidents', label: 'Incidents' },
  { href: '/audit', label: 'Audit log' },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-white border-r p-4 flex flex-col">
        <div className="text-lg font-semibold text-brand mb-6">OpenRide</div>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="px-3 py-2 rounded text-sm hover:bg-gray-100"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t">
          <div className="text-xs text-gray-500 truncate mb-1" title={user.email ?? ''}>
            {user.email}
          </div>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
