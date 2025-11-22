
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import BiblePlanAdminForm from '@/components/admin/bible-plan-admin-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BookOpen } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import { motion } from 'framer-motion';


export default function AdminBiblePlanPage() {
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
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Manage Bible Plan</h1>
        </div>

        <Card>
            <CardHeader>
            <CardTitle className="text-xl">Generate New Global Plan</CardTitle>
            <CardDescription>This will replace the existing Bible reading plan for all users.</CardDescription>
            </CardHeader>
            <CardContent>
            <BiblePlanAdminForm />
            </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
