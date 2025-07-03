
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, BookOpenCheck, ListChecks, Brain, BarChart3, UserCircle, ShieldCheck, Rocket, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePageLoading } from "@/contexts/page-loading-context";

interface FeatureCardProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  userScope?: "All Users" | "Logged-in Users" | "Admins Only";
}

function FeatureCard({ title, icon, description, userScope }: FeatureCardProps) {
  return (
    <Card className="h-full flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <CardHeader className="flex flex-row items-center space-x-4 pb-4">
        <div className="p-3 bg-primary/10 rounded-lg text-primary">{icon}</div>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">{description}</p>
        {userScope && (
          <p className="text-xs text-primary/80 mt-4 pt-3 border-t border-dashed">
            Available to: <span className="font-semibold">{userScope}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function IntroductionPage() {
  const { setIsPageLoading } = usePageLoading();

  const handleGetStartedClick = () => {
    setIsPageLoading(true);
  };

  return (
    <div className="space-y-16">
      <section className="text-center py-12 md:py-16 bg-card/50 rounded-xl">
        <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Welcome to Cell Dates!</h1>
            <p className="mt-4 text-lg text-muted-foreground">
            Your central hub for staying connected with your cell group, tracking spiritual growth, and managing important dates.
            </p>
        </div>
      </section>

      <section>
        <h2 className="text-3xl font-bold tracking-tight mb-8 text-center">Explore Our Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            title="Upcoming Dates"
            icon={<CalendarCheck className="h-8 w-8" />}
            description="Never miss a beat! View upcoming cell group meetings, special events, birthdays, and snack rotas on the homepage."
            userScope="All Users"
          />
          <FeatureCard
            title="Bible Reading Plan"
            icon={<BookOpenCheck className="h-8 w-8" />}
            description="Follow along with the community's Bible reading plan. Access the full schedule to see all planned readings for the year."
            userScope="All Users"
          />
          <FeatureCard
            title="Personal Checklist"
            icon={<ListChecks className="h-8 w-8" />}
            description="Create an account to unlock your personal Bible reading checklist. Mark passages as read and easily track your progress."
            userScope="Logged-in Users"
          />
          <FeatureCard
            title="Memory Verse Hub"
            icon={<Brain className="h-8 w-8" />}
            description="Strengthen your scripture memory in the 'Memorize' section. Study key Bible verses fetched directly from the ESV API."
            userScope="All Users"
          />
          <FeatureCard
            title="Community Progress"
            icon={<BarChart3 className="h-8 w-8" />}
            description="Get encouraged by seeing an overview of how everyone in the community is progressing through the Bible reading plan."
            userScope="Logged-in Users"
          />
          <FeatureCard
            title="Your Profile"
            icon={<UserCircle className="h-8 w-8" />}
            description="Manage your account details. Update your display name and add your birthday, which will appear in the events list!"
            userScope="Logged-in Users"
          />
           <FeatureCard
            title="Admin Dashboard"
            icon={<ShieldCheck className="h-8 w-8" />}
            description="A secure area for administrators to manage all aspects of the app, from events to the global Bible reading plan."
            userScope="Admins Only"
          />
        </div>
      </section>

      <section className="text-center py-12">
        <h2 className="text-3xl font-bold tracking-tight mb-4">Ready to Dive In?</h2>
        <Link href="/" passHref legacyBehavior>
          <Button size="lg" onClick={handleGetStartedClick} className="text-lg py-7 px-10 group">
            Go to Homepage
            <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </Link>
      </section>
    </div>
  );
}
