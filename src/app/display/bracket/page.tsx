'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Match, Joueur, StatusMatch, StatusTournoi, Tournoi } from '@/models/types';

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

// Helper function to calculate total rounds based on participant count
function calculateTotalRounds(participantCount: number): number {
    return Math.ceil(Math.log2(participantCount));
}

// Content component that uses useSearchParams
function BracketContent() {
    const searchParams = useSearchParams();
    const tournoiId = searchParams.get('tournoi');

    const [tournoi, setTournoi] = useState<Tournoi | null>(null);
    const [champion, setChampion] = useState<Joueur | null>(null);
    const [rounds, setRounds] = useState<RoundData[]>([]);
    const [joueurs, setJoueurs] = useState<Record<number, Joueur>>({});
    const [participantCount, setParticipantCount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastFetch, setLastFetch] = useState<number>(Date.now());
    const [showChampion, setShowChampion] = useState<boolean>(false);

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

                setParticipantCount(participants.length);
                setTournoi(tournoi);

                // Créer un dictionnaire des joueurs pour un accès rapide
                const joueursDict: Record<number, Joueur> = {};
                participants.forEach((joueur: Joueur) => {
                    joueursDict[joueur.id] = joueur;
                });
                setJoueurs(joueursDict);

                // Vérifier si le tournoi a un champion
                if (tournoi.champion_id && joueursDict[tournoi.champion_id]) {
                    setChampion(joueursDict[tournoi.champion_id]);
                    // Déclencher l'animation après un court délai
                    setTimeout(() => {
                        setShowChampion(true);
                    }, 500);
                } else {
                    setShowChampion(false);
                }

                // Determine total rounds - use stored value or calculate
                const totalRounds = tournoi.total_rounds || calculateTotalRounds(participants.length);
                console.log(`Tournament has ${totalRounds} total rounds`);

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

                // Create round data for all expected rounds
                const roundsArray: RoundData[] = [];

                for (let round = 1; round <= totalRounds; round++) {
                    // Get actual matches for this round
                    const matchesInRound = matches.filter(m => m.round === round)
                        .sort((a, b) => a.position - b.position);

                    // Generate title based on reverse counting (Final, Semi-final, etc.)
                    const reverseRound = totalRounds - round + 1;
                    const title =
                        reverseRound === 1 ? 'Finale' :
                            reverseRound === 2 ? 'Demi-finales' :
                                reverseRound === 3 ? 'Quarts de finale' :
                                    `Tour ${round}`;

                    roundsArray.push({
                        round,
                        title,
                        matches: matchesInRound
                    });
                }

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
            {/* Bannière du champion si le tournoi est terminé */}
            {tournoi.status === StatusTournoi.Termine && champion && (
                <motion.div
                    className="champion-banner mb-8 bg-gradient-to-r from-purple-800 to-blue-900 rounded-lg shadow-lg overflow-hidden"
                    initial={{ opacity: 0, y: -50 }}
                    animate={{
                        opacity: showChampion ? 1 : 0,
                        y: showChampion ? 0 : -50
                    }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <div className="p-6 text-center">
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: [0.8, 1.2, 1] }}
                            transition={{ duration: 1, delay: 0.5, times: [0, 0.5, 1] }}
                        >
                            <h2 className="text-xl font-bold text-yellow-300 mb-2">🏆 CHAMPION DU TOURNOI 🏆</h2>
                        </motion.div>

                        <motion.div
                            className="bg-black bg-opacity-20 py-4 px-6 rounded-lg inline-block mt-2"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.6, delay: 1 }}
                        >
                            <h1 className="text-4xl font-extrabold text-white">
                                {champion.prenom} {champion.surnom ? `"${champion.surnom}"` : ''} {champion.nom}
                            </h1>
                        </motion.div>

                        <motion.div
                            className="mt-4 text-gray-300"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 1.5 }}
                        >
                            <p className="text-lg">Félicitations au vainqueur du tournoi {tournoi.nom}!</p>
                        </motion.div>
                    </div>
                </motion.div>
            )}

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

            {/* Nouvelle structure de bracket simplifiée */}
            <div className="tournament-bracket">
                <div className="flex justify-center space-x-16 min-w-max">
                    {rounds.map((round, roundIndex) => {
                        // Calculer le nombre de matchs dans le premier tour
                        const firstRoundMatches = rounds[0].matches.length;
                        // Calculer le nombre théorique de matchs pour ce tour
                        const expectedMatches = firstRoundMatches / Math.pow(2, roundIndex);
                        // Calculer l'espacement vertical entre les matchs
                        const spacingY = `${Math.pow(2, roundIndex) * 3}rem`;

                        return (
                            <div key={round.round} className="round" style={{ width: '250px' }}>
                                <h2 className="text-xl font-bold mb-8 text-center text-blue-300">{round.title}</h2>

                                <div className="matches" style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: spacingY,
                                    position: 'relative'
                                }}>
                                    {Array.from({ length: Math.ceil(expectedMatches) }).map((_, matchIndex) => {
                                        const match = round.matches.find(m => m.position === matchIndex + 1);

                                        // Vérifier si ce match est la finale et contient le champion
                                        const isFinalWithChampion =
                                            round.title === 'Finale' &&
                                            match?.status === StatusMatch.Termine &&
                                            tournoi.champion_id &&
                                            (match.joueur1_id === tournoi.champion_id || match.joueur2_id === tournoi.champion_id);

                                        return (
                                            <motion.div
                                                key={`match-${round.round}-${matchIndex+1}`}
                                                className="match-container"
                                                style={{ position: 'relative' }}
                                                animate={isFinalWithChampion ? {
                                                    boxShadow: ['0px 0px 0px rgba(255,215,0,0)', '0px 0px 20px rgba(255,215,0,0.7)', '0px 0px 10px rgba(255,215,0,0.5)']
                                                } : {}}
                                                transition={{
                                                    duration: 2,
                                                    repeat: isFinalWithChampion ? Infinity : 0,
                                                    repeatType: "reverse"
                                                }}
                                            >
                                                {/* Match box */}
                                                <div className={`match-box bg-gray-800 border ${isFinalWithChampion ? 'border-yellow-500' : 'border-gray-700'} rounded-md p-3 w-full`}>
                                                    {match ? (
                                                        <>
                                                            {/* Heure du match */}
                                                            <div className="text-xs text-gray-400 mb-1">
                                                                {formatTime(match.horaire)}
                                                            </div>

                                                            {/* Joueur 1 */}
                                                            <div className={`p-2 rounded ${match.gagnant_id === match.joueur1_id ? 'bg-green-900 bg-opacity-30' : ''}`}>
                                                                <div className="flex justify-between items-center">
                                                                    <div className="truncate max-w-[160px]">
                                                                        {match.joueur1 ? (
                                                                            <span className={`font-medium text-sm ${match.joueur1_id === tournoi.champion_id ? 'text-yellow-300' : ''}`}>
                                                                                {match.joueur1.prenom} {match.joueur1.surnom ? `"${match.joueur1.surnom}"` : ''} {match.joueur1.nom}
                                                                                {match.joueur1_id === tournoi.champion_id && match.status === StatusMatch.Termine && ' 👑'}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-gray-500 text-sm">À déterminer</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="font-bold text-lg">
                                                                        {match.score_joueur1 !== undefined ? match.score_joueur1 : '0'}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Joueur 2 */}
                                                            <div className={`p-2 rounded mt-1 ${match.gagnant_id === match.joueur2_id ? 'bg-green-900 bg-opacity-30' : ''}`}>
                                                                <div className="flex justify-between items-center">
                                                                    <div className="truncate max-w-[160px]">
                                                                        {match.joueur2 ? (
                                                                            <span className={`font-medium text-sm ${match.joueur2_id === tournoi.champion_id ? 'text-yellow-300' : ''}`}>
                                                                                {match.joueur2.prenom} {match.joueur2.surnom ? `"${match.joueur2.surnom}"` : ''} {match.joueur2.nom}
                                                                                {match.joueur2_id === tournoi.champion_id && match.status === StatusMatch.Termine && ' 👑'}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-gray-500 text-sm">À déterminer</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="font-bold text-lg">
                                                                        {match.score_joueur2 !== undefined ? match.score_joueur2 : '0'}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Statut du match */}
                                                            {match.status === StatusMatch.EnCours && (
                                                                <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                                                                    EN COURS
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        // Placeholder pour les matchs non encore créés
                                                        <>
                                                            <div className="p-2 rounded">
                                                                <div className="flex justify-between items-center">
                                                                    <div className="text-gray-500 text-sm">À déterminer</div>
                                                                </div>
                                                            </div>
                                                            <div className="p-2 rounded mt-1">
                                                                <div className="flex justify-between items-center">
                                                                    <div className="text-gray-500 text-sm">À déterminer</div>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Connecteur horizontal (à droite du match) */}
                                                {roundIndex < rounds.length - 1 && (
                                                    <div className="connector-horizontal" style={{
                                                        position: 'absolute',
                                                        top: '50%',
                                                        right: '-1rem',
                                                        width: '1rem',
                                                        height: '2px',
                                                        backgroundColor: '#4B5563',
                                                        zIndex: 1
                                                    }}></div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Légende */}
            <div className="mt-12 bg-gray-800 p-4 rounded-md shadow-md">
                <h3 className="text-lg font-medium mb-2 text-gray-300">Légende</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    <div className="flex items-center">
                        <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2"></div>
                        <span className="text-gray-300">Champion du tournoi</span>
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
                <p className="ml-4 text-lg">Chargement du bracket...</p>
            </div>
        }>
            <BracketContent />
        </Suspense>
    );
}