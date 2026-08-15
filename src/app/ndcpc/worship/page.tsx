'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, Edit, Library, ListMusic, Mic, Music, Plus, Trash2, Users, X } from 'lucide-react';
import { SetlistManager } from '@/components/ndcpc/SetlistManager';
import { ScheduleManager } from '@/components/ndcpc/ScheduleManager';
import { WorshipFormatManager } from '@/components/ndcpc/WorshipFormatManager';
import { ResourceList } from '@/components/ndcpc/ResourceList';
import { AddResourceForm } from '@/components/ndcpc/AddResourceForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/page-layout';
import { useAdmin } from '@/context/AuthProvider';
import { useClientSearchParams } from '@/hooks/use-client-search-params';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';
import { cn } from '@/lib/utils';
import { doc, writeBatch } from 'firebase/firestore';

type WorshipTab = 'roster' | 'setlist' | 'resources' | 'order';

const VALID_TABS = new Set<WorshipTab>(['roster', 'setlist', 'resources', 'order']);

function ResourcesPanel() {
  const [activeTab, setActiveTab] = useState('songs');
  const [isManageMode, setIsManageMode] = useState(false);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleSelectionChange = (resourceId: string, isSelected: boolean) => {
    setSelectedResources((prev) =>
      isSelected ? [...prev, resourceId] : prev.filter((id) => id !== resourceId),
    );
  };

  const handleDeleteSelected = async () => {
    if (!firestore || selectedResources.length === 0) return;
    const batch = writeBatch(firestore);
    selectedResources.forEach((id) => {
      batch.delete(doc(firestore, NDCPc_COLLECTIONS.resources, id));
    });
    try {
      await batch.commit();
      toast({ title: 'Deleted' });
      setSelectedResources([]);
      setIsManageMode(false);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Could not delete' });
    }
  };

  return (
    <Tabs defaultValue="songs" className="w-full" onValueChange={setActiveTab}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <TabsList className="h-auto gap-4 bg-transparent p-0">
          <TabsTrigger value="songs" className="gap-1.5">
            <Music className="h-4 w-4" /> Songs
          </TabsTrigger>
          <TabsTrigger value="chants" className="gap-1.5">
            <Mic className="h-4 w-4" /> Chants
          </TabsTrigger>
        </TabsList>
        <div className="flex flex-wrap gap-1">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add resource</DialogTitle>
              </DialogHeader>
              <AddResourceForm
                initialCategory={activeTab as 'songs' | 'chants'}
                onSuccess={() => setIsAddOpen(false)}
              />
            </DialogContent>
          </Dialog>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsManageMode((v) => !v);
              setSelectedResources([]);
            }}
          >
            {isManageMode ? (
              <>
                <X className="mr-1.5 h-4 w-4" /> Done
              </>
            ) : (
              <>
                <Trash2 className="mr-1.5 h-4 w-4" /> Manage
              </>
            )}
          </Button>
          {isManageMode && selectedResources.length > 0 && (
            <Button variant="destructive" size="sm" onClick={() => void handleDeleteSelected()}>
              Delete ({selectedResources.length})
            </Button>
          )}
        </div>
      </div>
      <TabsContent value="songs">
        <ResourceList
          category="songs"
          isManageMode={isManageMode}
          selectedResources={selectedResources}
          onSelectionChange={handleSelectionChange}
        />
      </TabsContent>
      <TabsContent value="chants">
        <ResourceList
          category="chants"
          isManageMode={isManageMode}
          selectedResources={selectedResources}
          onSelectionChange={handleSelectionChange}
        />
      </TabsContent>
    </Tabs>
  );
}

export default function NdcpcWorshipPage() {
  const router = useRouter();
  const searchParams = useClientSearchParams();
  const { isAdmin } = useAdmin();
  const tabParam = searchParams.get('tab');
  const initialTab: WorshipTab =
    tabParam && VALID_TABS.has(tabParam as WorshipTab) ? (tabParam as WorshipTab) : 'roster';
  const [tab, setTab] = useState<WorshipTab>(initialTab);
  const [createSetlistOpen, setCreateSetlistOpen] = useState(false);
  const [createRosterOpen, setCreateRosterOpen] = useState(false);
  const [editOrderOpen, setEditOrderOpen] = useState(false);

  useEffect(() => {
    const next = searchParams.get('tab');
    if (next && VALID_TABS.has(next as WorshipTab)) {
      setTab(next as WorshipTab);
    }
  }, [searchParams]);

  const selectTab = (next: WorshipTab) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`/ndcpc/worship?${params.toString()}`, { scroll: false });
  };

  const title =
    tab === 'roster'
      ? 'Rosters'
      : tab === 'setlist'
        ? 'Setlists'
        : tab === 'resources'
          ? 'Resources'
          : 'Worship order';

  return (
    <div className="page-container-wide">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <PageHeader title={title} />
          {tab === 'roster' && isAdmin ? (
            <Button size="sm" className="h-8 rounded-lg gap-1.5 px-3 text-sm" onClick={() => setCreateRosterOpen(true)}>
              <Plus className="h-4 w-4" /> New
            </Button>
          ) : null}
          {tab === 'setlist' ? (
            <Button size="sm" className="h-8 rounded-lg gap-1.5 px-3 text-sm" onClick={() => setCreateSetlistOpen(true)}>
              <Plus className="h-4 w-4" /> New
            </Button>
          ) : null}
          {tab === 'order' && isAdmin ? (
            <Button size="sm" variant="outline" onClick={() => setEditOrderOpen(true)}>
              <Edit className="mr-1.5 h-4 w-4" /> Edit
            </Button>
          ) : null}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <AnimatePresence mode="wait">
          {tab === 'roster' ? (
            <motion.div
              key="roster"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <ScheduleManager
                createOpen={createRosterOpen}
                onCreateOpenChange={setCreateRosterOpen}
              />
            </motion.div>
          ) : null}
          {tab === 'setlist' ? (
            <motion.div
              key="setlist"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <SetlistManager
                createOpen={createSetlistOpen}
                onCreateOpenChange={setCreateSetlistOpen}
              />
            </motion.div>
          ) : null}
          {tab === 'resources' ? (
            <motion.div
              key="resources"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <ResourcesPanel />
            </motion.div>
          ) : null}
          {tab === 'order' ? (
            <motion.div
              key="order"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <WorshipFormatManager editOpen={editOrderOpen} onEditOpenChange={setEditOrderOpen} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>

      <div className="h-16 md:h-0" />
      <div className="fixed bottom-3 left-1/2 z-40 w-[min(720px,calc(100vw-16px))] -translate-x-1/2 md:bottom-4 md:left-[calc(50%+8rem)] md:w-[min(760px,calc(100vw-16rem-32px))]">
        <div className="glass-elevated rounded-xl border-transparent px-2 py-1.5">
          <div className="grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={() => selectTab('roster')}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-xs transition-colors',
                tab === 'roster'
                  ? 'bg-background/40 font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Users className={cn('h-4 w-4', tab === 'roster' ? 'text-primary' : 'text-muted-foreground')} />
              <span>Rosters</span>
            </button>
            <button
              type="button"
              onClick={() => selectTab('setlist')}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-xs transition-colors',
                tab === 'setlist'
                  ? 'bg-background/40 font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <ListMusic className={cn('h-4 w-4', tab === 'setlist' ? 'text-primary' : 'text-muted-foreground')} />
              <span>Setlists</span>
            </button>
            <button
              type="button"
              onClick={() => selectTab('resources')}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-xs transition-colors',
                tab === 'resources'
                  ? 'bg-background/40 font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Library className={cn('h-4 w-4', tab === 'resources' ? 'text-primary' : 'text-muted-foreground')} />
              <span>Resources</span>
            </button>
            <button
              type="button"
              onClick={() => selectTab('order')}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-xs transition-colors',
                tab === 'order'
                  ? 'bg-background/40 font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Calendar className={cn('h-4 w-4', tab === 'order' ? 'text-primary' : 'text-muted-foreground')} />
              <span>Order</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
