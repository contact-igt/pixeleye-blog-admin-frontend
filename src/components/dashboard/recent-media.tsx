'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Eye, Image as ImageIcon } from 'lucide-react';
import type { RecentMediaSummary } from '@/types/dashboard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Skeleton, EmptyState } from '@/components/ui/empty-state';
import { Alert } from '@/components/ui/alert';

interface RecentMediaProps {
  media: RecentMediaSummary[];
  loading: boolean;
  error: string | null;
  onRetry(): void;
}

export function RecentMedia({ media, loading, error, onRetry }: RecentMediaProps) {
  const [selectedAsset, setSelectedAsset] = useState<RecentMediaSummary | null>(null);

  return (
    <Card className="flex flex-col h-full p-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <ImageIcon size={17} className="text-emerald-600" />
            Recent Media Uploads
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Quick access to recent eye-care media assets</p>
        </div>
        <Link href="/media">
          <Button variant="outline" size="sm">
            Media Library
            <ArrowRight size={13} />
          </Button>
        </Link>
      </div>

      <div className="flex-1 mt-4">
        {error && (
          <Alert variant="error" action={<Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>}>
            Failed to load recent media uploads.
          </Alert>
        )}

        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : media.length === 0 ? (
          <EmptyState
            title="No media uploaded"
            description="Upload clinical assets to use in your articles."
            action={{ label: 'Upload Media', onClick: () => { window.location.href = '/media'; } }}
          />
        ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {media.map((asset) => {
            const imgUrl = asset.variants.thumbnail?.url || asset.original_url || '';
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => setSelectedAsset(asset)}
                className="group relative aspect-square overflow-hidden rounded-xl border border-slate-100 bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                aria-label={`Preview ${asset.original_file_name}`}
              >
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={asset.alt_text || asset.original_file_name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <ImageIcon size={20} />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Eye size={16} className="text-white" />
                </div>
                <span className="absolute bottom-1.5 left-1.5 right-1.5 truncate rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {asset.original_file_name}
                </span>
              </button>
            );
          })}
        </div>
      )}
      </div>

      {/* Quick View Modal */}
      {selectedAsset && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAsset(null)}
          title={selectedAsset.original_file_name}
          description={`Purpose: ${selectedAsset.purpose} | Alt text: ${selectedAsset.alt_text || 'None provided'}`}
          footer={
            <div className="flex justify-between items-center w-full">
              <Link href="/media">
                <Button variant="outline" size="sm">
                  Go to Media Library
                </Button>
              </Link>
              <Button variant="primary" size="sm" onClick={() => setSelectedAsset(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="rounded-xl border border-slate-200 bg-slate-900/5 p-4 flex items-center justify-center">
            <img
              src={selectedAsset.original_url || selectedAsset.variants.thumbnail?.url || ''}
              alt={selectedAsset.alt_text || selectedAsset.original_file_name}
              className="max-h-64 rounded-lg object-contain"
            />
          </div>
        </Modal>
      )}
    </Card>
  );
}
