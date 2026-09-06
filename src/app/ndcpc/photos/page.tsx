'use client';

import { PhotoGallery } from '@/components/ndcpc/PhotoGallery';
import { PageHeader, PageShell } from '@/components/ui/page-layout';

export default function NdcpcPhotosPage() {
  return (
    <PageShell>
      <PageHeader title="Photos" />
      <PhotoGallery />
    </PageShell>
  );
}
