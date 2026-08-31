import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rewards Platform',
  description: 'Rewards, tasks, offers and cashout'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
