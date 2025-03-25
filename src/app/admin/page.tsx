'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Tournoi, StatusTournoi } from '@/models/types';

export default function AdminDashboard() {
    const [tournoisEnCours, setTournoisEnCours] = useState<Tournoi[]>([]);
    const [tournoisAVenir, setTournoisAVenir] = useState<Tournoi[]>([]);
    const [tournoisRecents, setTournoisRecents] = useState<Tournoi[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);

                // Charger les tournois en cours
                const enCoursResponse = await fetch('/api/tournois?status=en_cours');
                if (!enCoursResponse.ok) {
                    throw new Error('Erreur lors du chargement des tournois en cours');
                }
                const enCoursData = await enCoursResponse.json();
                setTournoisEnCours(enCoursData.data);

                // Charger les tournois à venir
                const aVenirResponse = await fetch('/api/tournois?status=a_venir');
                if (!aVenirResponse.ok) {
                    throw new Error('Erreur lors du chargement des tournois à venir');
                }
                const aVenirData = await aVenirResponse.json();
                setTournoisAVenir(aVenirData.data);

                // Charger tous les tournois et filtrer les plus récents terminés
                const tousResponse = await fetch('/api/tournois');
                if (!tousResponse.ok) {
                    throw new Error('Erreur lors du chargement des tournois');
                }
                const tousData = await tousResponse.json();

                const recents = tousData.data
                    .filter((t: Tournoi) => t.status === StatusTournoi.Termine)
                    .sort((a: Tournoi, b: Tournoi) =>
                        new Date(b.date_modification).getTime() - new Date(a.date_modification).getTime()
                    )
                    .slice(0, 3);

                setTournoisRecents(recents);

            } catch (err) {
                setError(err instanceof Error ? err.message : 'Une erreur est survenue');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

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
        <div className="container mx-auto px-4">
            <h1 className="text-2xl font-bold mb-8">Tableau de bord</h1>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                    {error}
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="mt-2 text-gray-500">Chargement des données...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Tournoi en cours */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-lg font-semibold mb-4">Tournoi en cours</h2>

                        {tournoisEnCours.length > 0 ? (
                            <div>
                                {tournoisEnCours.map((tournoi) => (
                                    <div key={tournoi.id} className="mb-4 border-l-4 border-green-500 pl-4">
                                        <h3 className="font-medium">{tournoi.nom}</h3>
                                        <p className="text-sm text-gray-500 mb-2">
                                            {formatDate(tournoi.date_tournoi.toString())}
                                        </p>
                                        <Link
                                            href={`/admin/tournois/${tournoi.id}/matches`}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                        >
                                            Gérer les matchs →
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-500 text-center py-4">
                                <p>Aucun tournoi en cours</p>
                                <Link
                                    href="/admin/tournois"
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium block mt-2"
                                >
                                    Créer un tournoi →
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Tournois à venir */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-lg font-semibold mb-4">Tournois à venir</h2>

                        {tournoisAVenir.length > 0 ? (
                            <div>
                                {tournoisAVenir.map((tournoi) => (
                                    <div key={tournoi.id} className="mb-4 border-l-4 border-yellow-500 pl-4">
                                        <h3 className="font-medium">{tournoi.nom}</h3>
                                        <p className="text-sm text-gray-500 mb-2">
                                            {formatDate(tournoi.date_tournoi.toString())}
                                        </p>
                                        <Link
                                            href={`/admin/tournois/${tournoi.id}`}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                        >
                                            Configurer →
                                        </Link>
                                    </div>
                                ))}
                                <Link
                                    href="/admin/tournois"
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-4 block"
                                >
                                    Voir tous les tournois →
                                </Link>
                            </div>
                        ) : (
                            <div className="text-gray-500 text-center py-4">
                                <p>Aucun tournoi à venir</p>
                                <Link
                                    href="/admin/tournois"
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium block mt-2"
                                >
                                    Planifier un tournoi →
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Tournois récents */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-lg font-semibold mb-4">Tournois récents</h2>

                        {tournoisRecents.length > 0 ? (
                            <div>
                                {tournoisRecents.map((tournoi) => (
                                    <div key={tournoi.id} className="mb-4 border-l-4 border-gray-400 pl-4">
                                        <h3 className="font-medium">{tournoi.nom}</h3>
                                        <p className="text-sm text-gray-500 mb-2">
                                            {formatDate(tournoi.date_tournoi.toString())}
                                        </p>
                                        <Link
                                            href={`/admin/tournois/${tournoi.id}`}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                        >
                                            Voir les résultats →
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-500 text-center py-4">
                                <p>Aucun tournoi terminé récemment</p>
                            </div>
                        )}
                    </div>

                    {/* Accès rapides */}
                    <div className="bg-white rounded-lg shadow-md p-6 md:col-span-2 lg:col-span-3">
                        <h2 className="text-lg font-semibold mb-4">Accès rapides</h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Link
                                href="/admin/tournois"
                                className="bg-blue-600 text-white p-4 rounded-lg text-center hover:bg-blue-700 transition"
                            >
                                <h3 className="font-medium mb-1">Gérer les tournois</h3>
                                <p className="text-sm">Créer, configurer et suivre les tournois</p>
                            </Link>

                            <Link
                                href="/admin/joueurs"
                                className="bg-green-600 text-white p-4 rounded-lg text-center hover:bg-green-700 transition"
                            >
                                <h3 className="font-medium mb-1">Gérer les joueurs</h3>
                                <p className="text-sm">Ajouter, modifier ou consulter les joueurs</p>
                            </Link>

                            <Link
                                href="/display"
                                target="_blank"
                                className="bg-purple-600 text-white p-4 rounded-lg text-center hover:bg-purple-700 transition"
                            >
                                <h3 className="font-medium mb-1">Mode Affichage</h3>
                                <p className="text-sm">Ouvrir l&#39;affichage pour écran géant</p>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}