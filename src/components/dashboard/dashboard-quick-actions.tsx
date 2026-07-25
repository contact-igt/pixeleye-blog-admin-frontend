'use client';

import React from 'react';
import Link from 'next/link';
import { FilePlus, ImagePlus, LayoutGrid } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function DashboardQuickActions() {
  return (
    <Card className="p-5 space-y-3">
      <h3 className="font-semibold text-slate-900 text-sm">Quick Workspace Actions</h3>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/blogs/create">
          <Button variant="primary" size="sm" className="gap-2">
            <FilePlus size={15} />
            <span>New Article</span>
          </Button>
        </Link>

        <Link href="/media">
          <Button variant="outline" size="sm" className="gap-2">
            <ImagePlus size={15} />
            <span>Upload Media</span>
          </Button>
        </Link>

        <Link href="/templates/custom/new/builder">
          <Button variant="outline" size="sm" className="gap-2">
            <LayoutGrid size={15} />
            <span>New Custom Template</span>
          </Button>
        </Link>
      </div>
    </Card>
  );
}
