import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog | Pixel Eye',
  description: 'Read our latest blog posts'
};

export default function PublicLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Pixel Eye Blog</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12">
        {children}
      </main>
    </div>
  );
}
