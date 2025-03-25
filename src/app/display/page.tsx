'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tournoi } from '@/models/types';

// Component that uses useSearchParams
function DisplayContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [tournoisEnCours, setTournoisEnCours] = useState<Tournoi[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTournois = async () => {
            try {
                setIsLoading(true);
                const response = await fetch('/api/tournois?status=en_cours');
                if (!response.ok) {
                    throw new Error('Erreur lors du chargement des tournois en cours');
                }
                const data = await response.json();
                setTournoisEnCours(data.data);

                // Si un tournoi est en cours et qu'aucun tournoi n'est spécifié dans l'URL, rediriger vers le bracket
                if (data.data.length === 1 && !searchParams.get('tournoi')) {
                    router.push(`/display/bracket?tournoi=${data.data[0].id}`);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Une erreur est survenue');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTournois();
    }, [router, searchParams]);

    // Formater la date pour l'affichage
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(date);
    };

    return (
        <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-4xl font-bold mb-8">Tournois de Fléchettes</h1>

            {error && (
                <div className="bg-red-800 text-white px-4 py-3 rounded mb-6 max-w-lg mx-auto">
                    {error}
                </div>
            )}

            {isLoading ? (
                <div className="py-8">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                    <p className="mt-4 text-gray-300">Chargement des tournois...</p>
                </div>
            ) : tournoisEnCours.length === 0 ? (
                <div>
                    <div className="bg-gray-800 rounded-lg p-8 max-w-2xl mx-auto mb-8">
                        <h2 className="text-2xl font-bold mb-4">Aucun tournoi en cours</h2>
                        <p className="text-gray-300 mb-6">
                            Il n y a pas de tournoi actif pour le moment. Veuillez contacter le barman pour plus d informations.
                        </p>
                        <Link
                            href="/"
                            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                        >
                            Retour à l accueil
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid gap-8 max-w-4xl mx-auto">
                    {tournoisEnCours.map((tournoi) => (
                        <div key={tournoi.id} className="bg-gray-800 rounded-lg p-8 shadow-lg">
                            <h2 className="text-3xl font-bold mb-2">{tournoi.nom}</h2>
                            <p className="text-xl text-gray-300 mb-6">
                                {formatDate(tournoi.date_tournoi.toString())}
                            </p>

                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <Link
                                    href={`/display/bracket?tournoi=${tournoi.id}`}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
                                >
                                    Voir le Bracket
                                </Link>
                                <Link
                                    href={`/display/matches?tournoi=${tournoi.id}`}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
                                >
                                    Matchs en cours
                                </Link>
                            </div>
                        </div>
                    ))}

                    <Link
                        href="/"
                        className="text-gray-400 hover:text-white mt-8 inline-block"
                    >
                        Retour à l accueil
                    </Link>
                </div>
            )}
        </div>
    );
}

// Wrapper component with Suspense boundary
export default function DisplayPage() {
    return (
        <Suspense fallback={
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="text-4xl font-bold mb-8">Tournois de Fléchettes</h1>
                <div className="py-8">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                    <p className="mt-4 text-gray-300">Chargement...</p>
                </div>
            </div>
        }>
            <DisplayContent />
        </Suspense>
    );
}