
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, BookOpenCheck, ListChecks, Brain, BarChart3, UserCircle, ShieldCheck, Rocket } from "lucide-react";
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
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader className="flex flex-row items-center space-x-3 pb-3">
        {icon}
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">{description}</p>
        {userScope && (
          <p className="text-xs text-primary/80 mt-3 pt-2 border-t border-dashed">
            Available to: {userScope}
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
    <div className="space-y-12">
      <section className="text-center py-8 bg-card/50 rounded-lg shadow-sm">
        <Rocket className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl font-bold tracking-tight">Welcome to Cell Dates!</h1>
        <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
          Your central hub for staying connected with your cell group, tracking spiritual growth, and managing important dates.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight mb-6 text-center">Explore Our Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            title="Upcoming Dates & Events"
            icon={<CalendarCheck className="h-7 w-7 text-accent" />}
            description="Never miss a beat! View upcoming cell group meetings, special events, birthdays, and snack rotas. The homepage conveniently displays events scheduled for the next 30 days."
            userScope="All Users"
          />
          <FeatureCard
            title="Bible Reading Plan"
            icon={<BookOpenCheck className="h-7 w-7 text-green-500" />}
            description="Follow along with the community's designated Bible reading plan. Access the full schedule to see all planned readings throughout the year."
            userScope="All Users"
          />
          <FeatureCard
            title="Personal Checklist"
            icon={<ListChecks className="h-7 w-7 text-blue-500" />}
            description="Create an account to unlock your personal Bible reading checklist. Mark passages as read, filter readings by week or day, and easily track your overall progress through the plan."
            userScope="Logged-in Users"
          />
          <FeatureCard
            title="Memory Verse Hub"
            icon={<Brain className="h-7 w-7 text-purple-500" />}
            description="Strengthen your scripture memory in the 'Memorize' section. Study key Bible verses, including The Lord's Prayer, with text fetched directly or via the ESV API."
            userScope="All Users"
          />
          <FeatureCard
            title="Community Progress"
            icon={<BarChart3 className="h-7 w-7 text-orange-500" />}
            description="Get encouraged by seeing an overview of how everyone in the community is progressing through the Bible reading plan. (Progress is based on readings scheduled up to the current date)."
            userScope="Logged-in Users"
          />
          <FeatureCard
            title="Your Profile"
            icon={<UserCircle className="h-7 w-7 text-teal-500" />}
            description="Manage your account details. Update your display name and add your birthday, which will automatically appear in the events list for the community to celebrate with you!"
            userScope="Logged-in Users"
          />
          <FeatureCard
            title="Admin Dashboard"
            icon={<ShieldCheck className="h-7 w-7 text-red-500" />}
            description="A secure area for administrators to manage all aspects of the app, including events, the global Bible reading plan, and memory verses, ensuring everything runs smoothly."
            userScope="Admins Only"
          />
        </div>
      </section>

      <section className="text-center py-8">
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Ready to Dive In?</h2>
        <Link href="/" passHref legacyBehavior>
          <Button size="lg" onClick={handleGetStartedClick} className="text-base py-3 px-8">
            <Rocket className="mr-2 h-5 w-5" />
            Go to Homepage
          </Button>
        </Link>
      </section>
    </div>
  );
}
