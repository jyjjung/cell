export function getRouteTheme(pathname: string, isDark: boolean = true) {
    if (pathname.includes('/qt')) return { 
        headerText: 'text-emerald-500', headerBg: 'bg-emerald-500/20',
        bgPrimary: isDark ? 'bg-emerald-600' : 'bg-emerald-300',
        bgSecondary: isDark ? 'bg-teal-600' : 'bg-teal-200'
    };
    if (pathname.includes('/events')) return { 
        headerText: 'text-purple-500', headerBg: 'bg-purple-500/20',
        bgPrimary: isDark ? 'bg-purple-600' : 'bg-purple-300',
        bgSecondary: isDark ? 'bg-fuchsia-600' : 'bg-fuchsia-200'
    };
    if (pathname.includes('/cleaning')) return { 
        headerText: 'text-amber-500', headerBg: 'bg-amber-500/20',
        bgPrimary: isDark ? 'bg-amber-600' : 'bg-amber-300',
        bgSecondary: isDark ? 'bg-orange-600' : 'bg-orange-200'
    };
    if (pathname.includes('/chat')) return { 
        headerText: 'text-indigo-500', headerBg: 'bg-indigo-500/20',
        bgPrimary: isDark ? 'bg-indigo-600' : 'bg-indigo-300',
        bgSecondary: isDark ? 'bg-blue-600' : 'bg-blue-200'
    };
    if (pathname.includes('/worship') || pathname.includes('/links')) return { 
        headerText: 'text-rose-500', headerBg: 'bg-rose-500/20',
        bgPrimary: isDark ? 'bg-rose-600' : 'bg-rose-300',
        bgSecondary: isDark ? 'bg-pink-600' : 'bg-pink-200'
    };
    if (pathname.includes('/bible') || pathname.includes('/reading') || pathname.includes('/full-plan')) return { 
        headerText: 'text-sky-500', headerBg: 'bg-sky-500/20',
        bgPrimary: isDark ? 'bg-sky-600' : 'bg-sky-300',
        bgSecondary: isDark ? 'bg-cyan-600' : 'bg-cyan-200'
    };
    if (pathname.includes('/admin')) return { 
        headerText: 'text-red-500', headerBg: 'bg-red-500/20',
        bgPrimary: isDark ? 'bg-red-600' : 'bg-red-300',
        bgSecondary: isDark ? 'bg-orange-600' : 'bg-orange-200'
    };
    if (pathname.includes('/profile') || pathname.includes('/settings')) return { 
        headerText: 'text-stone-500', headerBg: 'bg-stone-500/20',
        bgPrimary: isDark ? 'bg-stone-600' : 'bg-stone-300',
        bgSecondary: isDark ? 'bg-zinc-600' : 'bg-zinc-200'
    };
    if (pathname.includes('/leaderboard')) return { 
        headerText: 'text-yellow-500', headerBg: 'bg-yellow-500/20',
        bgPrimary: isDark ? 'bg-yellow-600' : 'bg-yellow-300',
        bgSecondary: isDark ? 'bg-amber-600' : 'bg-amber-200'
    };
    if (pathname.includes('/notifications')) return { 
        headerText: 'text-orange-500', headerBg: 'bg-orange-500/20',
        bgPrimary: isDark ? 'bg-orange-600' : 'bg-orange-300',
        bgSecondary: isDark ? 'bg-red-500' : 'bg-red-300'
    };
    
    // Default fallback
    return { 
        headerText: 'text-primary', headerBg: 'bg-primary/20',
        bgPrimary: isDark ? 'bg-primary' : 'bg-blue-300',
        bgSecondary: isDark ? 'bg-indigo-500' : 'bg-sky-300'
    };
}
