'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Match, Joueur, StatusMatch, Tournoi } from '@/models/types';

interface MatchWithPlayers extends Match {
    joueur1?: Joueur | null;
    joueur2?: Joueur | null;
    gagnant?: Joueur | null;
}

interface RoundData {
    round: number;
    title: string;
    matches: MatchWithPlayers[];
}

// Content component that uses useSearchParams
function BracketContent() {
    const searchParams = useSearchParams();
    const tournoiId = searchParams.get('tournoi');

    const [tournoi, setTournoi] = useState<Tournoi | null>(null);
    const [rounds, setRounds] = useState<RoundData[]>([]);
    const [setJoueurs] = useState<Record<number, Joueur>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastFetch, setLastFetch] = useState<number>(Date.now());

    // Charger les données du tournoi et des matchs
    useEffect(() => {
        const fetchData = async () => {
            if (!tournoiId) return;

            try {
                // Charger les informations du tournoi
                const tournoiResponse = await fetch(`/api/tournois/${tournoiId}`);
                if (!tournoiResponse.ok) {
                    throw new Error('Erreur lors du chargement des informations du tournoi');
                }
                const tournoiData = await tournoiResponse.json();
                const tournoi = tournoiData.data.tournoi;
                const participants = tournoiData.data.participants;

                setTournoi(tournoi);

                // Créer un dictionnaire des joueurs pour un accès rapide
                const joueursDict: Record<number, Joueur> = {};
                participants.forEach((joueur: Joueur) => {
                    joueursDict[joueur.id] = joueur;
                });
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                setJoueurs(joueursDict);

                // Charger les matchs
                const matchesResponse = await fetch(`/api/tournois/${tournoiId}/matches`);
                if (!matchesResponse.ok) {
                    throw new Error('Erreur lors du chargement des matchs');
                }
                const matchesData = await matchesResponse.json();

                // Enrichir les matchs avec les informations des joueurs
                const matches: MatchWithPlayers[] = matchesData.data.map((match: Match) => ({
                    ...match,
                    joueur1: match.joueur1_id ? joueursDict[match.joueur1_id] : null,
                    joueur2: match.joueur2_id ? joueursDict[match.joueur2_id] : null,
                    gagnant: match.gagnant_id ? joueursDict[match.gagnant_id] : null,
                }));

                // Organiser les matchs par tour
                const roundsObj: Record<number, MatchWithPlayers[]> = {};

                matches.forEach(match => {
                    if (!roundsObj[match.round]) {
                        roundsObj[match.round] = [];
                    }
                    roundsObj[match.round].push(match);
                });

                // Convertir en array et trier
                const totalRounds = Object.keys(roundsObj).length;
                const roundsArray: RoundData[] = Object.keys(roundsObj).map(roundKey => {
                    const round = parseInt(roundKey);
                    const reverseRound = totalRounds - round + 1; // Pour le titre
                    const title =
                        reverseRound === 1 ? 'Finale' :
                            reverseRound === 2 ? 'Demi-finales' :
                                reverseRound === 3 ? 'Quarts de finale' :
                                    `Tour ${round}`;

                    return {
                        round,
                        title,
                        matches: roundsObj[round].sort((a, b) => a.position - b.position)
                    };
                }).sort((a, b) => a.round - b.round);

                setRounds(roundsArray);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Une erreur est survenue');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

        // Configurer une actualisation périodique
        const intervalId = setInterval(() => {
            setLastFetch(Date.now());
        }, 15000); // Rafraîchir toutes les 15 secondes

        return () => clearInterval(intervalId);
    }, [tournoiId, lastFetch]);

    // Formater l'heure pour l'affichage
    const formatTime = (timeString: string) => {
        if (!timeString) return '';
        // Format HH:MM:SS to HH:MM
        return timeString.substring(0, 5);
    };

    // Obtenir la classe CSS pour un match
    const getMatchClass = (match: MatchWithPlayers) => {
        if (match.status === StatusMatch.EnCours) return 'match-active';
        if (match.status === StatusMatch.Termine) return 'match-complete';
        return 'match-waiting';
    };

    // Obtenir la hauteur des connecteurs en fonction de la position du match
    const getConnectorHeight = (roundIndex: number): string => {
        const baseHeight = 60; // hauteur de base en pixels
        const multiplier = Math.pow(2, roundIndex);

        return `${baseHeight * multiplier}px`;
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
            </div>
        );
    }

    if (error || !tournoi) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <div className="bg-red-800 text-white px-6 py-4 rounded-lg shadow-lg inline-block mb-6">
                    <p>{error || "Tournoi introuvable"}</p>
                </div>
                <Link
                    href="/display"
                    className="text-blue-400 hover:text-blue-300 mt-4 inline-block"
                >
                    ← Retour à la liste des tournois
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 overflow-x-auto min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <Link href="/display" className="text-blue-400 hover:text-blue-300 text-sm">
                        ← Retour
                    </Link>
                    <h1 className="text-3xl font-bold mt-2 text-white">{tournoi.nom}</h1>
                </div>

                <div className="flex items-center">
                    <div className="mr-4">
                        <span className="text-gray-400">Actualisé automatiquement</span>
                    </div>
                    <Link
                        href={`/display/matches?tournoi=${tournoiId}`}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition"
                    >
                        Voir les matchs en cours
                    </Link>
                </div>
            </div>

            <div className="bracket-container overflow-x-auto pb-12">
                <div className="flex space-x-8 min-w-max">
                    {rounds.map((round, roundIndex) => (
                        <div key={round.round} className="bracket-round min-w-[280px]">
                            <h2 className="text-xl font-bold mb-6 text-center text-blue-300">{round.title}</h2>

                            <div className="flex flex-col" style={{
                                gap: `${Math.pow(2, roundIndex) * 30}px`
                            }}>
                                {round.matches.map((match, matchIndex) => (
                                    <div key={match.id} className="relative">
                                        <motion.div
                                            className={`bracket-match p-3 rounded-md ${getMatchClass(match)} relative z-10 border border-gray-700 bg-gray-800 w-64`}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.3, delay: matchIndex * 0.1 }}
                                        >
                                            {/* Heure du match */}
                                            <div className="text-xs text-gray-400 mb-1">
                                                {formatTime(match.horaire)}
                                            </div>

                                            {/* Joueur 1 */}
                                            <div className={`p-2 rounded ${match.gagnant_id === match.joueur1_id ? 'bg-green-900 bg-opacity-30' : ''}`}>
                                                <div className="flex justify-between items-center">
                                                    <div className="truncate max-w-[160px]">
                                                        {match.joueur1 ? (
                                                            <span className="font-medium text-sm">
                                {match.joueur1.prenom} {match.joueur1.surnom ? `"${match.joueur1.surnom}"` : ''} {match.joueur1.nom}
                              </span>
                                                        ) : (
                                                            <span className="text-gray-500 text-sm">À déterminer</span>
                                                        )}
                                                    </div>
                                                    <div className="font-bold text-lg">
                                                        {match.score_joueur1}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Joueur 2 */}
                                            <div className={`p-2 rounded mt-1 ${match.gagnant_id === match.joueur2_id ? 'bg-green-900 bg-opacity-30' : ''}`}>
                                                <div className="flex justify-between items-center">
                                                    <div className="truncate max-w-[160px]">
                                                        {match.joueur2 ? (
                                                            <span className="font-medium text-sm">
                                {match.joueur2.prenom} {match.joueur2.surnom ? `"${match.joueur2.surnom}"` : ''} {match.joueur2.nom}
                              </span>
                                                        ) : (
                                                            <span className="text-gray-500 text-sm">À déterminer</span>
                                                        )}
                                                    </div>
                                                    <div className="font-bold text-lg">
                                                        {match.score_joueur2}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Statut du match */}
                                            {match.status === StatusMatch.EnCours && (
                                                <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                                                    EN COURS
                                                </div>
                                            )}
                                        </motion.div>

                                        {/* Connecteurs pour le prochain tour */}
                                        {roundIndex < rounds.length - 1 && (
                                            <div className="absolute top-1/2 right-0 transform translate-x-full -translate-y-1/2 z-0">
                                                <div className="h-px w-8 bg-gray-600"></div>
                                            </div>
                                        )}

                                        {/* Lignes verticales pour connecter les matches */}
                                        {roundIndex > 0 && matchIndex % 2 === 0 && matchIndex + 1 < round.matches.length && (
                                            <div className="absolute top-full left-0 transform -translate-x-8 z-0"
                                                 style={{ height: getConnectorHeight(roundIndex) }}>
                                                <div className="w-px h-full bg-gray-600 absolute top-0 left-0"></div>
                                                <div className="w-8 h-px bg-gray-600 absolute top-0 left-0"></div>
                                                <div className="w-8 h-px bg-gray-600 absolute bottom-0 left-0"></div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Légende */}
            <div className="mt-12 bg-gray-800 p-4 rounded-md shadow-md">
                <h3 className="text-lg font-medium mb-2 text-gray-300">Légende</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center">
                        <div className="w-4 h-4 bg-red-600 rounded-full mr-2"></div>
                        <span className="text-gray-300">Match en cours</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-4 h-4 bg-green-900 bg-opacity-30 rounded-full mr-2"></div>
                        <span className="text-gray-300">Vainqueur du match</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-4 h-4 bg-gray-700 rounded-full mr-2"></div>
                        <span className="text-gray-300">Match en attente</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Wrapper component with Suspense boundary
export default function BracketPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
                <p className="ml-4 text-lg">Chargement du tableau des matchs...</p>
            </div>
        }>
            <BracketContent />
        </Suspense>
    );
}