import type { Metadata } from 'next';
import { Inter, Nunito_Sans, Poppins } from 'next/font/google';
import { AuthProvider } from '@/components/auth/auth-provider';
import './globals.css';

const poppins = Poppins({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-heading', display: 'swap' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body', display: 'swap' });
const nunitoSans = Nunito_Sans({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-admin', display: 'swap' });

export const metadata: Metadata = {
  title: 'Pixel Eye Blog CMS',
  description: 'Standalone administration panel for Pixel Eye Blog CMS'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${poppins.variable} ${inter.variable} ${nunitoSans.variable}`}><body className="antialiased"><AuthProvider>{children}</AuthProvider></body></html>;
}
