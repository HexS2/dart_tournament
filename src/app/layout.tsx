import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Tournoi de Fléchettes',
    description: 'Application de gestion de tournois de fléchettes',
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="fr">
        <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
            {children}
        </div>
        </body>
        </html>
    );
}