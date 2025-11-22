
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import MemoryVerseAdmin from '@/components/admin/memory-verse-admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BookMarked } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import { motion } from 'framer-motion';

export default function AdminMemoryVersesPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const { setIsPageLoading } = usePageLoading(); 

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isAdmin) { 
      setIsPageLoading(true); 
      router.push('/admin');
    }
  }, [isAdmin, router, isMounted, setIsPageLoading]);

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  };

  if (!isMounted || !isAdmin) { 
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
       <motion.div
        className="space-y-8 max-w-2xl mx-auto"
        initial="hidden"
        animate="visible"
        variants={itemVariants}
      >
        <div className="flex items-center space-x-3">
          <BookMarked className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Manage Memory Verses</h1>
        </div>

        <Card>
            <CardHeader>
            <CardTitle className="text-xl">Add & Remove Verses</CardTitle>
            <CardDescription>Manage the list of memory verses available to all users.</CardDescription>
            </CardHeader>
            <CardContent>
                <MemoryVerseAdmin />
            </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
