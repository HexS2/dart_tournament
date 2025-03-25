'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Tournoi, Joueur, StatusTournoi } from '@/models/types';
import ParticipantForm from '@/components/admin/ParticipantForm';

export default function TournoiDetailPage() {
    const params = useParams();
    const router = useRouter();
    const tournamentId = Number(params.id);

    const [tournoi, setTournoi] = useState<Tournoi | null>(null);
    const [participants, setParticipants] = useState<Joueur[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Charger les informations du tournoi
    useEffect(() => {
        const fetchTournoiDetails = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`/api/tournois/${tournamentId}`);

                if (!response.ok) {
                    throw new Error('Erreur lors du chargement des informations du tournoi');
                }

                const data = await response.json();
                setTournoi(data.data.tournoi);
                setParticipants(data.data.participants || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Une erreur est survenue');
            } finally {
                setIsLoading(false);
            }
        };

        if (tournamentId) {
            fetchTournoiDetails();
        }
    }, [tournamentId]);

    // Fonction pour ajouter un participant
    const handleAddParticipant = async (joueurId: number) => {
        try {
            setIsActionLoading(true);
            setError(null);

            const response = await fetch(`/api/tournois/${tournamentId}/participants`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ joueur_id: joueurId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de l\'ajout du participant');
            }

            // Recharger la liste des participants
            const participantsResponse = await fetch(`/api/tournois/${tournamentId}/participants`);
            if (!participantsResponse.ok) {
                throw new Error('Erreur lors du chargement des participants');
            }

            const participantsData = await participantsResponse.json();
            setParticipants(participantsData.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
            throw err;
        } finally {
            setIsActionLoading(false);
        }
    };

    // Fonction pour démarrer le tournoi
    const handleStartTournament = async () => {
        try {
            setIsActionLoading(true);
            setError(null);

            const response = await fetch(`/api/tournois/${tournamentId}/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors du démarrage du tournoi');
            }

            // Rediriger vers la page des matchs du tournoi
            router.push(`/admin/tournois/${tournamentId}/matches`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
            throw err;
        } finally {
            setIsActionLoading(false);
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

    // Vérifier si le tournoi peut démarrer
    const canStartTournament = () => {
        if (!tournoi) return false;
        if (tournoi.status !== StatusTournoi.Planifie) return false;
        return participants.length >= 2;
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <p className="mt-4 text-gray-600">Chargement des informations du tournoi...</p>
            </div>
        );
    }

    if (!tournoi) {
        return (
            <div className="container mx-auto px-4 py-16">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                    Tournoi introuvable
                </div>
                <Link href="/admin/tournois" className="text-blue-500 hover:underline">
                    ← Retour à la liste des tournois
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* En-tête avec informations du tournoi */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <Link href="/admin/tournois" className="text-blue-500 hover:underline text-sm">
                            ← Retour à la liste des tournois
                        </Link>
                        <h1 className="text-2xl font-bold mt-2">{tournoi.nom}</h1>
                    </div>

                    {tournoi.status === StatusTournoi.EnCours && (
                        <Link
                            href={`/admin/tournois/${tournoi.id}/matches`}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                        >
                            Gérer les matchs
                        </Link>
                    )}

                    {tournoi.status === StatusTournoi.Termine && (
                        <Link
                            href={`/display/bracket?tournoi=${tournoi.id}`}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                            target="_blank"
                        >
                            Voir le bracket final
                        </Link>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Date</p>
                            <p className="font-medium">{formatDate(tournoi.date_tournoi.toString())}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Format</p>
                            <p className="font-medium">
                                {tournoi.format === 'simple_elimination' ? 'Élimination simple' :
                                    tournoi.format === 'double_elimination' ? 'Élimination double' :
                                        tournoi.format === 'poules' ? 'Poules' : tournoi.format}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Statut</p>
                            <p>
                <span className={`px-2 py-1 text-xs font-medium rounded-full border 
                  ${tournoi.status === StatusTournoi.Planifie ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                    tournoi.status === StatusTournoi.EnCours ? 'bg-green-100 text-green-800 border-green-200' :
                        'bg-gray-100 text-gray-800 border-gray-200'}`}>
                  {tournoi.status === StatusTournoi.Planifie ? 'Planifié' :
                      tournoi.status === StatusTournoi.EnCours ? 'En cours' :
                          'Terminé'}
                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Liste des participants et options */}
                <div>
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-bold mb-4">Informations du tournoi</h2>

                        {tournoi.status === StatusTournoi.Planifie ? (
                            <div className="py-4 text-gray-600">
                                <p className="mb-2">Ce tournoi est en attente de démarrage.</p>
                                <p>Utilisez le formulaire pour ajouter des participants, puis démarrez le tournoi.</p>
                            </div>
                        ) : tournoi.status === StatusTournoi.EnCours ? (
                            <div className="py-4">
                                <p className="mb-2 text-gray-600">Ce tournoi est en cours.</p>
                                <p className="mb-4 text-gray-600">Round actuel : {tournoi.round_actuel}</p>
                                <Link
                                    href={`/admin/tournois/${tournoi.id}/matches`}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded inline-block"
                                >
                                    Gérer les matchs en cours
                                </Link>
                            </div>
                        ) : (
                            <div className="py-4">
                                <p className="mb-2 text-gray-600">Ce tournoi est terminé.</p>
                                {tournoi.champion_id && (
                                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <h3 className="font-semibold text-yellow-800 mb-2">Champion du tournoi</h3>
                                        {participants.find(p => p.id === tournoi.champion_id) ? (
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-yellow-300 flex items-center justify-center">
                                                    <span className="text-yellow-800 font-bold">🏆</span>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {participants.find(p => p.id === tournoi.champion_id)?.prenom} {participants.find(p => p.id === tournoi.champion_id)?.nom}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {participants.find(p => p.id === tournoi.champion_id)?.surnom && `"${participants.find(p => p.id === tournoi.champion_id)?.surnom}"`}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-gray-600">Informations du champion non disponibles</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Formulaire de participants (seulement pour les tournois planifiés) */}
                <div>
                    {tournoi.status === StatusTournoi.Planifie ? (
                        <ParticipantForm
                            tournamentId={tournoi.id}
                            participants={participants}
                            onAddParticipant={handleAddParticipant}
                            onStartTournament={handleStartTournament}
                            isLoading={isActionLoading}
                            canStart={canStartTournament()}
                        />
                    ) : (
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-bold mb-4">Participants ({participants.length})</h2>

                            {participants.length === 0 ? (
                                <p className="text-gray-500 italic">Aucun participant inscrit</p>
                            ) : (
                                <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                                    {participants.map((participant) => (
                                        <li key={participant.id} className="py-3 flex items-center">
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {participant.prenom} {participant.nom}
                                                </p>
                                                {participant.surnom && (
                                                    <p className="text-sm text-gray-500">{participant.surnom}</p>
                                                )}
                                            </div>
                                            <div className="ml-auto">
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                          {participant.niveau}
                        </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}