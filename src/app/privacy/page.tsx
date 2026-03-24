
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, Lock, Eye, Database, Fingerprint } from 'lucide-react';

export default function PrivacyPolicyPage() {
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

        <header className="mb-16 space-y-4">
          <h1 className="text-2xl sm:text-2xl font-black tracking-tighter leading-tight text-foreground">
            Privacy <br />
            <span className="text-primary">Policy.</span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium">
            A commitment to data integrity and community sovereignty.
          </p>
        </header>

        <div className="space-y-12 text-muted-foreground leading-relaxed font-medium">
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Fingerprint className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-foreground uppercase tracking-widest">Data Stewardship</h2>
            </div>
            <p>
              The em. portal is built on the principle of minimal collection. We strictly gather only the identifiers necessary 
              to facilitate community coordination: your verified email, your name, and your recipe-based avatar configuration. 
              We do not sell, rent, or trade your personal information with any third-party marketing entities.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-foreground uppercase tracking-widest">Encrypted Ecosystem</h2>
            </div>
            <p>
              Your digital presence is protected by **Firebase Authentication** and secured via granular **Firestore Security Rules**. 
              In-circle messaging is accessible only to active participants. Once a member leaves a circle, their access to 
              future transmissions is immediately revoked, and their "read by" presence is localized to their period of membership.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-foreground uppercase tracking-widest">Infrastructure</h2>
            </div>
            <p>
              Persistence is managed through **Google Cloud (Firebase)**, and delivery is powered by the **Vercel Edge Network**. 
              These providers maintain industry-leading security certifications. We utilize **Firebase Cloud Messaging (FCM)** 
              to deliver urgent community alerts directly to your device, ensuring a real-time pulse without constant background tracking.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-foreground uppercase tracking-widest">User Autonomy</h2>
            </div>
            <p>
              You maintain absolute control over your visibility. You may toggle your presence on the Community Progress leaderboard 
              at any time. For a comprehensive audit of your data or to request permanent record termination, please contact 
              a community administrator.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
