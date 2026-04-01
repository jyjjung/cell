"use client";

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';

import { getRouteTheme } from '@/lib/theme-colors';
export function ImmersiveBackground() {
    const { resolvedTheme } = useTheme();
    const pathname = usePathname() || '';
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const isDark = resolvedTheme === 'dark';
    const theme = getRouteTheme(pathname, isDark);

    return (
        <div 
            className={`fixed inset-0 pointer-events-none z-0 overflow-hidden transition-colors duration-1000 ${
                isDark ? 'bg-slate-950' : 'bg-slate-50'
            }`}
        >

            <style jsx>{`
                @keyframes force-drift {
                    0%, 100% { top: -20%; left: -20%; opacity: 0.2; }
                    50% { top: 0%; left: 10%; opacity: 0.1; }
                }
                @keyframes force-drift-alt {
                    0%, 100% { bottom: -20%; right: -20%; opacity: 0.15; }
                    50% { bottom: 0%; right: 10%; opacity: 0.05; }
                }
                .force-move { animation: force-drift 4s ease-in-out infinite; }
                .force-move-alt { animation: force-drift-alt 6s ease-in-out infinite; }
            `}</style>

            <div
                className="absolute inset-0 transition-opacity duration-1000"
                style={{
                    background: isDark
                        ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.4) 0%, rgba(2, 6, 23, 0.4) 100%)'
                        : 'linear-gradient(135deg, rgba(248, 250, 252, 0.3) 0%, rgba(226, 232, 240, 0.3) 100%)',
                }}
            />

            <div className="absolute inset-0 overflow-hidden transition-colors duration-1000">
                <div
                    className={`absolute w-[70vw] h-[70vw] rounded-full blur-[140px] force-move transition-colors duration-1000 ${theme.bgPrimary}`}
                />
                <div
                    className={`absolute w-[60vw] h-[60vw] rounded-full blur-[120px] force-move-alt transition-colors duration-1000 ${theme.bgSecondary}`}
                />
            </div>

            <div
                className={`absolute inset-0 transition-opacity duration-1000 ${
                    isDark 
                        ? 'bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]' 
                        : 'bg-[radial-gradient(circle_at_center,transparent_0%,rgba(203,213,225,0.4)_100%)]'
                }`}
            />
        </div>
    );
}

