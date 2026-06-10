import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'OpenRide Admin',
  description: 'Operator dispatch and compliance console',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
