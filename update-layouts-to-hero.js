const fs = require('fs');
const path = require('path');

const files = [
    'src/app/events/page.tsx',
    'src/app/members/page.tsx',
    'src/app/notifications/page.tsx',
    'src/app/qt/page.tsx',
    'src/app/announcements/page.tsx',
    'src/app/leaderboard/page.tsx',
    'src/app/cleaning-roster/page.tsx',
    'src/app/full-plan/page.tsx',
    'src/app/bible-checklist/page.tsx',
    'src/app/memorize/page.tsx'
];

const newLayoutClass = 'relative space-y-8 pb-32 max-w-5xl mx-auto px-4 md:px-8 mt-12';

files.forEach(f => {
    try {
        const fullPath = path.join(__dirname, f);
        let content = fs.readFileSync(fullPath, 'utf8');
        
        // Regex to match the container div that wraps the page. 
        // It usually looks like: <div className="max-w-2xl mx-auto space-y-8 pb-24">
        content = content.replace(/<div className="max-w-[2,4]xl mx-auto space-y-8 pb-24">/, `<div className="${newLayoutClass}">`);

        fs.writeFileSync(fullPath, content);
        console.log("Updated layout for:", f);
    } catch (e) {
        console.log("Failed", f, e.message);
    }
});
