import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Zap, BookOpen, Layout, MessageCircle, Cloud } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface LandingPageProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

export default function LandingPage({ onSignIn, onSignUp }: LandingPageProps) {
  return (
    <div className="relative w-full overflow-hidden">
        <section className="relative flex flex-col items-center justify-center min-h-[90vh] text-center pt-20">
            <div className="max-w-7xl mx-auto space-y-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-4"
                >
                    Community Reimagined
                </motion.div>
                
                <motion.h1 
                    initial={false}
                    className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.85] text-foreground select-none"
                >
                    em. <br />
                    <span className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-gradient bg-clip-text text-transparent italic">
                        portal.
                    </span>
                </motion.h1>
                
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.7 }}
                    transition={{ delay: 0.4, duration: 1 }}
                    className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-tight font-medium"
                >
                    The unified digital core for our community. Sync your journey, share your path, and stay connected through every season of faith.
                </motion.p>
                
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.8, type: "spring" }}
                    className="flex flex-col sm:flex-row justify-center gap-4 pt-6"
                >
                    <Button 
                        size="lg" 
                        className="h-16 px-12 text-lg font-black rounded-full shadow-2xl shadow-primary/20 transition-all active:scale-95 group" 
                        onClick={onSignUp}
                    >
                        Get Started
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button 
                        size="lg" 
                        variant="outline" 
                        className="h-16 px-12 text-lg font-black rounded-full backdrop-blur-2xl border-2 border-primary/10 hover:bg-primary/5 transition-all active:scale-95" 
                        onClick={onSignIn}
                    >
                        Sign In
                    </Button>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="pt-12"
                >
                    <Link 
                        href="/features" 
                        className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-3 group"
                    >
                        <span className="w-8 h-px bg-border group-hover:w-12 group-hover:bg-primary transition-all" />
                        How It Works
                        <span className="w-8 h-px bg-border group-hover:w-12 group-hover:bg-primary transition-all" />
                    </Link>
                </motion.div>
            </div>
        </section>

        <section className="py-24 bg-muted/10">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-black tracking-tight">Reading Plan</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed font-medium">Track your spiritual growth with our community Bible plan. Real-time progress syncs across all your devices.</p>
                </div>
                <div className="space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                        <MessageCircle className="h-6 w-6 text-accent" />
                    </div>
                    <h3 className="text-xl font-black tracking-tight">Active Circles</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed font-medium">Encrypted, real-time messaging for ministry groups and private fellowship. Stay in the loop with ease.</p>
                </div>
                <div className="space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-success/10 flex items-center justify-center">
                        <Shield className="h-6 w-6 text-success" />
                    </div>
                    <h3 className="text-xl font-black tracking-tight">Community Rosters</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed font-medium">Clear schedules for cleaning, service, and QT sharing. Never miss your moment to serve the community.</p>
                </div>
            </div>
        </section>

        <section className="py-24 border-t border-border/50 bg-background">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Layout className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight uppercase tracking-[0.1em]">Built for our Community</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Core Functionalities</h3>
                        <ul className="text-sm text-muted-foreground space-y-2 font-medium">
                            <li>• Real-time spiritual journey and checklist synchronization.</li>
                            <li>• Secure community-wide and role-specific messaging (FCM).</li>
                            <li>• Dynamic roster generation for service and QT sharing.</li>
                            <li>• Storage-neutral, recipe-based generative avatar system.</li>
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold flex items-center gap-2"><Cloud className="h-4 w-4 text-primary" /> Deployment & Hosting</h3>
                        <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                            The em. portal is globally distributed via <strong>Vercel</strong> for ultra-low latency. It utilizes 
                            <strong> Firebase (Google Cloud)</strong> for real-time data persistence and authentication.
                        </p>
                        <p className="text-xs text-muted-foreground italic">
                            By leveraging standard Hobby and Spark plans, the portal operates at zero cost while maintaining high reliability for the community.
                        </p>
                        <Link href="/features" className="inline-flex items-center text-primary text-[10px] font-black uppercase tracking-[0.2em] hover:underline pt-2">
                            Learn More <ArrowRight className="ml-2 h-3 w-3" />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    </div>
  );
}
