'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function AdminLayout({
                                        children,
                                    }: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navLinks = [
        { name: 'Tableau de bord', href: '/admin' },
        { name: 'Tournois', href: '/admin/tournois' },
        { name: 'Joueurs', href: '/admin/joueurs' },
    ];

    return (
        <div className="flex flex-col min-h-screen">
            {/* Header */}
            <header className="bg-blue-700 text-white shadow-md">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <Link href="/admin" className="text-xl font-bold">
                            Tournoi Fléchettes
                        </Link>

                        {/* Desktop navigation */}
                        <nav className="hidden md:flex space-x-6 ml-6">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`py-2 text-sm font-medium hover:text-blue-200 transition ${
                                        pathname === link.href || pathname.startsWith(`${link.href}/`)
                                            ? 'text-white border-b-2 border-white'
                                            : 'text-blue-100'
                                    }`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    {/* Mode affichage */}
                    <div className="hidden md:block">
                        <Link
                            href="/display"
                            target="_blank"
                            className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition"
                        >
                            Mode Affichage
                        </Link>
                    </div>

                    {/* Mobile menu button */}
                    <button
                        type="button"
                        className="md:hidden text-blue-100 hover:text-white"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d={isMobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                            />
                        </svg>
                    </button>
                </div>

                {/* Mobile menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-blue-800 px-4 py-2">
                        <nav className="flex flex-col space-y-2">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`py-2 text-sm font-medium hover:text-blue-200 transition ${
                                        pathname === link.href ? 'text-white' : 'text-blue-100'
                                    }`}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <Link
                                href="/display"
                                target="_blank"
                                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition text-center"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Mode Affichage
                            </Link>
                        </nav>
                    </div>
                )}
            </header>

            {/* Main content */}
            <main className="flex-grow py-8">
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-gray-100 border-t border-gray-200 py-4">
                <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
                    <p>Système de Tournoi de Fléchettes &copy; {new Date().getFullYear()}</p>
                </div>
            </footer>
        </div>
    );
}