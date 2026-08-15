'use client';

import { PhotoGallery } from '@/components/ndcpc/PhotoGallery';
import { PageHeader } from '@/components/ui/page-layout';

export default function NdcpcPhotosPage() {
  return (
    <div className="page-container">
      <PageHeader title="Photos" />
      <PhotoGallery />
    </div>
  );
}
