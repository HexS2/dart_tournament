'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Tournoi, StatusTournoi } from '@/models/types';
import TournamentForm, { TournamentFormData } from '@/components/admin/TournamentForm';

export default function TournoisPage() {
    const [tournois, setTournois] = useState<Tournoi[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState<boolean>(false);
    const router = useRouter();

    // Charger les tournois au chargement de la page
    useEffect(() => {
        const fetchTournois = async () => {
            try {
                setIsLoading(true);
                const response = await fetch('/api/tournois');

                if (!response.ok) {
                    throw new Error('Erreur lors du chargement des tournois');
                }

                const data = await response.json();
                setTournois(data.data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Une erreur est survenue');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTournois();
    }, []);

    // Création d'un nouveau tournoi
    const handleCreateTournoi = async (data: TournamentFormData) => {
        try {
            setIsCreating(true);
            const response = await fetch('/api/tournois', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de la création du tournoi');
            }

            const result = await response.json();

            // Rediriger vers la page du tournoi créé
            router.push(`/admin/tournois/${result.data.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
            throw err; // Rethrow pour que le formulaire puisse gérer l'erreur
        } finally {
            setIsCreating(false);
        }
    };

    // Formater la date pour l'affichage
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(date);
    };

    // Obtenir la classe de badge en fonction du statut
    const getStatusBadgeClass = (status: StatusTournoi) => {
        switch (status) {
            case StatusTournoi.Planifie:
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case StatusTournoi.EnCours:
                return 'bg-green-100 text-green-800 border-green-200';
            case StatusTournoi.Termine:
                return 'bg-gray-100 text-gray-800 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    // Obtenir le texte en fonction du statut
    const getStatusText = (status: StatusTournoi) => {
        switch (status) {
            case StatusTournoi.Planifie:
                return 'Planifié';
            case StatusTournoi.EnCours:
                return 'En cours';
            case StatusTournoi.Termine:
                return 'Terminé';
            default:
                return status;
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">Gestion des tournois</h1>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-bold mb-4">Liste des tournois</h2>

                        {isLoading ? (
                            <div className="py-8 text-center">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                <p className="mt-2 text-gray-500">Chargement des tournois...</p>
                            </div>
                        ) : tournois.length === 0 ? (
                            <div className="py-8 text-center bg-gray-50 rounded-lg">
                                <p className="text-gray-500">Aucun tournoi n&#39;a été créé</p>
                                <p className="text-gray-500 mt-2">Utilisez le formulaire pour créer votre premier tournoi</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Nom
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Format
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Statut
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {tournois.map((tournoi) => (
                                        <tr key={tournoi.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{tournoi.nom}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">{formatDate(tournoi.date_tournoi.toString())}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">
                                                    {tournoi.format === 'simple_elimination' ? 'Élimination simple' :
                                                        tournoi.format === 'double_elimination' ? 'Élimination double' :
                                                            tournoi.format === 'poules' ? 'Poules' : tournoi.format}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadgeClass(tournoi.status)}`}>
                            {getStatusText(tournoi.status)}
                          </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <Link
                                                    href={`/admin/tournois/${tournoi.id}`}
                                                    className="text-blue-600 hover:text-blue-900 mr-4"
                                                >
                                                    {tournoi.status === StatusTournoi.Planifie ? 'Configurer' : 'Voir'}
                                                </Link>

                                                {tournoi.status === StatusTournoi.EnCours && (
                                                    <Link
                                                        href={`/admin/tournois/${tournoi.id}/matches`}
                                                        className="text-green-600 hover:text-green-900"
                                                    >
                                                        Matchs
                                                    </Link>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <TournamentForm
                        onSubmit={handleCreateTournoi}
                        isLoading={isCreating}
                    />
                </div>
            </div>
        </div>
    );
}