
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Rocket, 
  Zap, 
  Shield, 
  Database,
  Cloud,
  Cpu
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

function Section({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) {
  return (
    <motion.section variants={itemVariants} className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">{title}</h2>
      </div>
      <div className="pl-12 text-muted-foreground leading-relaxed font-medium">
        {children}
      </div>
    </motion.section>
  );
}

export default function FeaturesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-8 md:px-20 py-16 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-12"
        >
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="hover:bg-primary/5 -ml-4 font-bold"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-16"
        >
          <header className="space-y-4">
            <motion.h1 
              variants={itemVariants}
              className="text-2xl sm:text-2xl font-black tracking-tighter leading-tight"
            >
              Platform <br />
              <span className="text-primary">Intelligence.</span>
            </motion.h1>
            <motion.p 
              variants={itemVariants}
              className="text-xl text-muted-foreground max-w-2xl font-medium"
            >
              A deep-dive into the zero-cost architecture, high-performance rendering, and cloud constraints powering the em. portal.
            </motion.p>
          </header>

          <Section title="The Vision" icon={Rocket}>
            <p>
              The em. portal is designed as a zero-overhead centralized hub for community synchronization. 
              By leveraging modern cloud infrastructure and efficient data patterns, we maintain a high-fidelity 
              experience that scales to hundreds of members without incurring operational costs.
            </p>
          </Section>

          <Section title="Tier Analysis: Vercel Hobby" icon={Cloud}>
            <div className="space-y-4">
              <p>
                The application is deployed on the **Vercel Global Edge Network**, ensuring ultra-low latency for all community members. 
                Operating on the Hobby tier provides industry-grade hosting with specific constraints:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <li className="p-4 rounded-xl bg-muted/20 border border-border/50 text-xs">
                  <strong className="block text-foreground mb-1">Bandwidth: 100GB/mo</strong>
                  Current utilization is &lt; 1% due to text-based data fetching and optimized asset delivery.
                </li>
                <li className="p-4 rounded-xl bg-muted/20 border border-border/50 text-xs">
                  <strong className="block text-foreground mb-1">Compute: 10s Timeout</strong>
                  Serverless functions are optimized for sub-second execution to prevent execution stalls.
                </li>
                <li className="p-4 rounded-xl bg-muted/20 border border-border/50 text-xs">
                  <strong className="block text-foreground mb-1">Edge Runtime</strong>
                  Critical routes are processed at the edge, reducing TTFB (Time to First Byte) significantly.
                </li>
                <li className="p-4 rounded-xl bg-muted/20 border border-border/50 text-xs">
                  <strong className="block text-foreground mb-1">Automated CI/CD</strong>
                  Zero-downtime deployments ensure the community always has the latest security patches.
                </li>
              </ul>
            </div>
          </Section>

          <Section title="Tier Analysis: Firebase Spark" icon={Database}>
            <div className="space-y-4">
              <p>
                **Google Firebase** powers the real-time identity and persistence layer. The Spark tier is 
                generous for community use but requires disciplined data architecture:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-xl bg-muted/20 border border-border/50">
                  <p className="text-2xl font-black text-primary">50k</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest">Daily Reads</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-muted/20 border border-border/50">
                  <p className="text-2xl font-black text-primary">20k</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest">Daily Writes</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-muted/20 border border-border/50">
                  <p className="text-2xl font-black text-primary">1GB</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest">Total Storage</p>
                </div>
              </div>
              <p className="text-sm italic">
                *Strategy: We utilize denormalized member data in chat documents to minimize multi-document "join" reads, preserving our daily quota.*
              </p>
            </div>
          </Section>

          <Section title="Avatar Recipe Logic" icon={Cpu}>
            <p>
              Standard community apps store member photos as binary files (avg. 2MB each). For a 500-member community, 
              this would consume 1GB of storage instantly. 
            </p>
            <p className="mt-2">
              The em. portal uses **"Recipe-based Generative Avatars"**. We store only a tiny string of configuration data 
              (e.g., `skin:tan, hair:short`). This JSON data is &lt; 1KB, allowing us to support **over 3 million members** on the free tier 
              without ever hitting the 1GB storage ceiling.
            </p>
          </Section>

          <Section title="Rendering Optimization" icon={Zap}>
            <p>
              To maintain high **Interaction to Next Paint (INP)** scores, we utilize hardware-accelerated animations:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>GPU Promotion:</strong> Large background blurs are promoted to separate compositor layers to avoid main-thread painting bottlenecks.</li>
              <li><strong>Adaptive UI:</strong> High-cost effects like the mouse-glow follower are automatically disabled on touch devices to preserve mobile CPU cycles.</li>
              <li><strong>Optimistic UI:</strong> Bible checklist updates and chat reactions reflect instantly in the local cache before server confirmation, ensuring zero perceived latency.</li>
            </ul>
          </Section>

          <Section title="Privacy & Infrastructure" icon={Shield}>
            <p>
              Data is secured via **Firestore Security Rules**, ensuring members can only read chats they belong to and modify 
              only their own progress logs. We utilize **Firebase Cloud Messaging (FCM)** for push notifications, 
              which requires the app to be "Installed" as a PWA on iOS to bypass browser notification restrictions.
            </p>
          </Section>
        </motion.div>
      </div>
    </div>
  );
}
