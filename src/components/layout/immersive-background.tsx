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
                isDark ? 'bg-[#030712]' : 'bg-slate-50'
            }`}
        >

            <style jsx>{`
                @keyframes force-drift {
                    0%, 100% { transform: translate(-10%, -10%); opacity: 0.15; }
                    50% { transform: translate(5%, 5%); opacity: 0.08; }
                }
                @keyframes force-drift-alt {
                    0%, 100% { transform: translate(10%, 10%); opacity: 0.1; }
                    50% { transform: translate(-5%, -5%); opacity: 0.04; }
                }
                .force-move { animation: force-drift 15s ease-in-out infinite; }
                .force-move-alt { animation: force-drift-alt 20s ease-in-out infinite; }
            `}</style>

            <div
                className="absolute inset-0 transition-opacity duration-1000"
                style={{
                    background: isDark
                        ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(2, 6, 23, 0.8) 100%)'
                        : 'linear-gradient(135deg, rgba(248, 250, 252, 0.5) 0%, rgba(226, 232, 240, 0.5) 100%)',
                }}
            />

            <div className="absolute inset-0 overflow-hidden transition-colors duration-1000 mix-blend-screen">
                <div
                    className={`absolute inset-0 -top-[20%] -left-[20%] w-[140vw] h-[140vw] rounded-full blur-[160px] force-move transition-colors duration-1000 ${theme.bgPrimary}`}
                />
                <div
                    className={`absolute inset-0 -bottom-[20%] -right-[20%] w-[120vw] h-[120vw] rounded-full blur-[140px] force-move-alt transition-colors duration-1000 ${theme.bgSecondary}`}
                />
            </div>

            <div
                className={`absolute inset-0 transition-opacity duration-1000 ${
                    isDark 
                        ? 'bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.85)_100%)]' 
                        : 'bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(203,213,225,0.4)_100%)]'
                }`}
            />
        </div>
    );
}

