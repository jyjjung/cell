const fs = require('fs');
const path = require('path');

const updates = [
    {
        file: 'src/app/members/page.tsx',
        search: `      <PageHeader\n        title={t.members}\n        subtitle={t.memberCount.replace('{count}', filteredUsers.length.toString())}\n        accentColor="text-primary"\n      />`,
        replace: `      <PageHeader\n        title={t.members}\n        description={t.memberCount.replace('{count}', filteredUsers.length.toString())}\n        icon={Users}\n        accentColor="text-primary"\n        iconBgColor="bg-primary/10"\n      />`
    },
    {
        file: 'src/app/notifications/page.tsx',
        search: `      <PageHeader\n        title={t.notifications}\n        subtitle="Activity Feed"`,
        replace: `      <PageHeader\n        title={t.notifications}\n        description="Activity Feed"\n        icon={Bell}\n        iconBgColor="bg-primary/10"`
    },
    {
        file: 'src/app/qt/page.tsx',
        search: `            <PageHeader \n              title={t.qtRoster}\n              subtitle="Sharing Schedule"\n              accentColor="text-primary"\n            />`,
        replace: `            <PageHeader \n              title={t.qtRoster}\n              description="Sharing Schedule"\n              icon={BookOpenText}\n              accentColor="text-primary"\n              iconBgColor="bg-primary/10"\n            />`
    },
    {
        file: 'src/app/announcements/page.tsx',
        search: `      <PageHeader\n        title={isMounted ? t.announcements : 'Announcements'}\n        subtitle="Community Updates"\n        accentColor="text-orange-500"\n      />`,
        replace: `      <PageHeader\n        title={isMounted ? t.announcements : 'Announcements'}\n        description="Community Updates"\n        icon={Megaphone}\n        accentColor="text-orange-500"\n        iconBgColor="bg-orange-500/10"\n      />`
    },
    {
        file: 'src/app/cleaning-roster/page.tsx',
        search: `            <PageHeader \n              title={t.cleaningRoster}\n              subtitle="Duty Schedule"\n              accentColor="text-emerald-500"\n            />`,
        replace: `            <PageHeader \n              title={t.cleaningRoster}\n              description="Duty Schedule"\n              icon={ShieldCheck}\n              accentColor="text-emerald-500"\n              iconBgColor="bg-emerald-500/10"\n            />`
    },
    {
        file: 'src/app/full-plan/page.tsx',
        search: `      <PageHeader \n        title={t.fullPlan}\n        subtitle="Complete Journey"\n        accentColor="text-primary"\n        action={\n          !isGuest && (\n             <Button onClick={scrollToCurrentDate} variant="outline" size="sm" className="rounded-xl font-bold text-xs h-9">\n                <History className="mr-2 h-4 w-4" /> {t.jumpToToday}\n             </Button>\n          )\n        }\n      />`,
        replace: `      <PageHeader \n        title={t.fullPlan}\n        description="Complete Journey"\n        icon={BookOpen}\n        accentColor="text-primary"\n        iconBgColor="bg-primary/10"\n        action={\n          !isGuest && (\n             <Button onClick={scrollToCurrentDate} variant="outline" size="sm" className="rounded-xl font-bold text-xs h-9">\n                <History className="mr-2 h-4 w-4" /> {t.jumpToToday}\n             </Button>\n          )\n        }\n      />`
    },
    {
        file: 'src/app/memorize/page.tsx',
        search: `      <PageHeader title="Memory Verses" subtitle={\`\${memoryVerses.length} verse\${memoryVerses.length !== 1 ? 's' : ''}\`} accentColor="text-primary" />`,
        replace: `      <PageHeader title="Memory Verses" description={\`\${memoryVerses.length} verse\${memoryVerses.length !== 1 ? 's' : ''}\`} icon={Brain} accentColor="text-primary" iconBgColor="bg-primary/10" />`
    }
];

updates.forEach(u => {
    try {
        const fullPath = path.join(__dirname, u.file);
        let content = fs.readFileSync(fullPath, 'utf8');
        
        // Ensure imports are ready
        if (u.file.includes('qt/page.tsx') && !content.includes('BookOpenText')) {
            content = content.replace("import { Calendar days }", "import { CalendarDays, BookOpenText }").replace("import { CalendarDays, ArrowLeft, ArrowRight, UserPlus, Info } from 'lucide-react';", "import { CalendarDays, ArrowLeft, ArrowRight, UserPlus, Info, BookOpenText } from 'lucide-react';");
        }
        if (u.file.includes('announcements/page.tsx') && !content.includes('Megaphone')) {
             content = content.replace("import { Megaphone", "import { Megaphone"); // likely exists
        }
        if (u.file.includes('cleaning-roster/page.tsx') && !content.includes('ShieldCheck')) {
             content = content.replace("import { Shield", "import { ShieldCheck, Shield");
        }
        if (u.file.includes('full-plan/page.tsx') && !content.includes('BookOpen')) {
             content = content.replace("import { History", "import { History, BookOpen");
        }
        if (u.file.includes('memorize/page.tsx') && !content.includes('Brain')) {
             content = content.replace("import { Search", "import { Search, Brain");
        }

        content = content.replace(u.search, u.replace);
        fs.writeFileSync(fullPath, content);
        console.log("Updated", u.file);
    } catch (e) {
        console.log("Failed", u.file, e.message);
    }
});
