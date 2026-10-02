import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from '@/lib/platform/session-context';

export const metadata: Metadata = {
  title: 'Whispr - Say it without saying who you are',
  description: 'A decentralized forum community powered by Dash Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}