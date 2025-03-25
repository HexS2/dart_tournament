'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Tournoi, Match, Joueur, StatusMatch, StatusTournoi } from '@/models/types';
import MatchController from '@/components/admin/MatchController';

interface MatchWithPlayers extends Match {
    joueur1?: Joueur;
    joueur2?: Joueur;
}

interface RoundData {
    round: number;
    title: string;
    activeMatches: MatchWithPlayers[];
    waitingMatches: MatchWithPlayers[];
    completedMatches: MatchWithPlayers[];
}

export default function MatchesPage() {
    const params = useParams();
    const router = useRouter();
    const tournamentId = Number(params.id);

    const [tournoi, setTournoi] = useState<Tournoi | null>(null);
    const [rounds, setRounds] = useState<RoundData[]>([]);
    const [joueurs, setJoueurs] = useState<Record<number, Joueur>>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>("all"); // Tous les tours par défaut

    // Générer un titre pour chaque tour
    const getRoundTitle = (round: number, totalRounds: number): string => {
        const reverseRound = totalRounds - round + 1;
        if (reverseRound === 1) return 'Finale';
        if (reverseRound === 2) return 'Demi-finales';
        if (reverseRound === 3) return 'Quarts de finale';
        if (reverseRound === 4) return 'Huitièmes de finale';
        return `Tour ${round}`;
    };
    const [isTabLoading, setIsTabLoading] = useState<boolean>(false);

// Modifier la fonction setActiveTab pour montrer un indicateur de chargement
    const handleTabChange = (tab: string) => {
        setIsTabLoading(true);
        setActiveTab(tab);
    };

    // Charger les informations du tournoi et des matchs
    useEffect(() => {
        const fetchData = async () => {
            try {

                    setIsTabLoading(true);


                // Charger les informations du tournoi
                const tournoiResponse = await fetch(`/api/tournois/${tournamentId}`);
                if (!tournoiResponse.ok) {
                    throw new Error('Erreur lors du chargement des informations du tournoi');
                }
                const tournoiData = await tournoiResponse.json();
                const tournoi = tournoiData.data.tournoi;
                setTournoi(tournoi);

                // Créer un dictionnaire des joueurs pour un accès rapide
                const joueursDict: Record<number, Joueur> = {};
                tournoiData.data.participants.forEach((joueur: Joueur) => {
                    joueursDict[joueur.id] = joueur;
                });

                setJoueurs(joueursDict);

                // Charger les matchs
                const matchesResponse = await fetch(`/api/tournois/${tournamentId}/matches`);
                if (!matchesResponse.ok) {
                    throw new Error('Erreur lors du chargement des matchs');
                }
                const matchesData = await matchesResponse.json();

                // Enrichir les matchs avec les informations des joueurs
                const enrichedMatches = matchesData.data.map((match: Match) => ({
                    ...match,
                    joueur1: match.joueur1_id ? joueursDict[match.joueur1_id] : undefined,
                    joueur2: match.joueur2_id ? joueursDict[match.joueur2_id] : undefined,
                }));

                // Organisation des matchs par tour
                const totalRounds = tournoi.total_rounds || Math.ceil(Math.log2(tournoiData.data.participants.length));
                const roundsData: RoundData[] = [];

                // Initialiser les données pour chaque tour
                for (let round = 1; round <= totalRounds; round++) {
                    const roundMatches = enrichedMatches.filter((m: { round: number; }) => m.round === round);

                    roundsData.push({
                        round,
                        title: getRoundTitle(round, totalRounds),
                        activeMatches: roundMatches.filter((m: { status: StatusMatch; }) => m.status === StatusMatch.EnCours),
                        waitingMatches: roundMatches.filter((m: { status: StatusMatch; }) => m.status === StatusMatch.EnAttente),
                        completedMatches: roundMatches.filter((m: { status: StatusMatch; }) => m.status === StatusMatch.Termine)
                    });
                }

                // Trier les tours du plus récent au plus ancien
                setRounds(roundsData.sort((a, b) => b.round - a.round));

            } catch (err) {
                setError(err instanceof Error ? err.message : 'Une erreur est survenue');
            } finally {
                setIsLoading(false);
                setIsTabLoading(false);
            }
        };

        fetchData();
    }, [tournamentId, activeTab]);
    const handleActivateMatch = (matchId: number) => {
        setRounds(prevRounds => {
            return prevRounds.map(round => {
                // Trouver si le match est dans les matchs en attente de ce tour
                const matchToActivate = round.waitingMatches.find(match => match.id === matchId);

                if (matchToActivate) {
                    // Retirer le match des matchs en attente
                    const updatedWaitingMatches = round.waitingMatches.filter(match => match.id !== matchId);

                    // Créer une copie mise à jour du match
                    const updatedMatch = {
                        ...matchToActivate,
                        status: StatusMatch.EnCours
                    };

                    // Ajouter le match aux matchs actifs
                    return {
                        ...round,
                        waitingMatches: updatedWaitingMatches,
                        activeMatches: [...round.activeMatches, updatedMatch]
                    };
                }

                return round;
            });
        });
    };
    // Mettre à jour le score d'un match
    const handleUpdateScore = async (matchId: number, scoreJoueur1: number, scoreJoueur2: number) => {
        try {
            setIsActionLoading(true);

            const response = await fetch(`/api/matches/${matchId}/score`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({score_joueur1: scoreJoueur1, score_joueur2: scoreJoueur2}),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de la mise à jour du score');
            }

            // Mettre à jour l'état local
            setRounds(prevRounds =>
                prevRounds.map(round => ({
                    ...round,
                    activeMatches: round.activeMatches.map(match =>
                        match.id === matchId
                            ? {...match, score_joueur1: scoreJoueur1, score_joueur2: scoreJoueur2}
                            : match
                    )
                }))
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setIsActionLoading(false);
        }
    };

    // Terminer un match
    const handleFinishMatch = async (matchId: number, gagnantId: number) => {
        try {
            setIsActionLoading(true);

            const response = await fetch(`/api/matches/${matchId}/end`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({gagnant_id: gagnantId}),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de la finalisation du match');
            }

            // Au lieu de recharger la page, mettre à jour l'état
            const matchData = await response.json();

            // Copier les rounds actuels
            setRounds(prevRounds => {
                return prevRounds.map(round => {
                    // Trouver si le match est dans les matchs actifs de ce tour
                    const updatedActiveMatches = round.activeMatches.filter(match => match.id !== matchId);

                    // Trouver le match fini
                    const finishedMatch = round.activeMatches.find(match => match.id === matchId);

                    // Si le match était dans ce tour, l'ajouter aux matchs terminés
                    if (finishedMatch) {
                        // Créer une copie mise à jour du match
                        const updatedMatch = {
                            ...finishedMatch,
                            status: StatusMatch.Termine,
                            gagnant_id: gagnantId
                        };

                        return {
                            ...round,
                            activeMatches: updatedActiveMatches,
                            completedMatches: [...round.completedMatches, updatedMatch]
                        };
                    }

                    return round;
                });
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setIsActionLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <div
                    className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <p className="mt-4 text-gray-600">Chargement des matchs...</p>
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
    // Calculer les totaux de tous les matchs
    const totalActiveMatches = rounds.reduce((sum, round) => sum + round.activeMatches.length, 0);
    const totalWaitingMatches = rounds.reduce((sum, round) => sum + round.waitingMatches.length, 0);
    const totalCompletedMatches = rounds.reduce((sum, round) => sum + round.completedMatches.length, 0);

    return (
        <div className="container mx-auto px-4 py-8">
            {/* En-tête avec informations du tournoi */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <Link href={`/admin/tournois/${tournoi.id}`} className="text-blue-500 hover:underline text-sm">
                            ← Retour au tournoi
                        </Link>
                        <h1 className="text-2xl font-bold mt-2">{tournoi.nom} - Matchs</h1>
                    </div>

                    <div className="flex items-center space-x-4">
                        <Link
                            href={`/display/bracket?tournoi=${tournoi.id}`}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                            target="_blank"
                        >
                            Voir sur écran géant
                        </Link>

                        <button
                            onClick={() => window.location.reload()}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
                        >
                            Actualiser
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 mt-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="text-sm text-gray-500">Round actuel:</span>
                            <span className="ml-2 font-semibold">{tournoi.round_actuel}</span>
                        </div>
                        <div>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border 
                                ${tournoi.status === StatusTournoi.EnCours ? 'bg-green-100 text-green-800 border-green-200' :
                                'bg-gray-100 text-gray-800 border-gray-200'}`}>
                                {tournoi.status === StatusTournoi.EnCours ? 'Tournoi en cours' : 'Tournoi terminé'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                    {error}
                    <button
                        onClick={() => setError(null)}
                        className="float-right font-bold"
                    >
                        &times;
                    </button>
                </div>
            )}

            {/* Navigation par onglets pour les tours */}
            <div className="mb-6 border-b border-gray-200">
                <ul className="flex flex-wrap -mb-px text-sm font-medium text-center text-gray-500">
                    <li className="mr-2">
                        <button
                            className={`inline-flex items-center py-3 px-4 border-b-2 rounded-t-lg ${
                                activeTab === 'all'
                                    ? 'text-blue-600 border-blue-600 active'
                                    : 'border-transparent hover:text-gray-600 hover:border-gray-300'
                            }`}
                            onClick={() => handleTabChange('all')}
                            disabled={isTabLoading}
                        >
                            <span className="mr-2">🏆</span> Tous les tours
                            <span className="ml-2 bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded-full">
                    {rounds.reduce((sum, r) => sum + r.activeMatches.length + r.waitingMatches.length + r.completedMatches.length, 0)}
                </span>
                        </button>
                    </li>
                    <li className="mr-2">
                        <button
                            className={`inline-flex items-center py-3 px-4 border-b-2 rounded-t-lg ${
                                activeTab === 'active'
                                    ? 'text-green-600 border-green-600 active'
                                    : 'border-transparent hover:text-gray-600 hover:border-gray-300'
                            }`}
                            onClick={() => handleTabChange('active')}
                            disabled={isTabLoading}
                        >
                            <span className="mr-2">🔥</span> Matchs en cours
                            <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                    {totalActiveMatches}
                </span>
                        </button>
                    </li>
                    {rounds.map((round) => (
                        <li key={`tab-${round.round}`} className="mr-2">
                            <button
                                className={`inline-flex items-center py-3 px-4 border-b-2 rounded-t-lg ${
                                    activeTab === `round-${round.round}`
                                        ? (round.title === 'Finale' ? 'text-purple-600 border-purple-600' :
                                            round.title === 'Demi-finales' ? 'text-indigo-600 border-indigo-600' :
                                                'text-blue-600 border-blue-600')
                                        : 'border-transparent hover:text-gray-600 hover:border-gray-300'
                                }`}
                                onClick={() => handleTabChange(`round-${round.round}`)}
                                disabled={isTabLoading}
                            >
                                {round.title}
                                <span className="ml-2 bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded-full">
                        {round.activeMatches.length + round.waitingMatches.length + round.completedMatches.length}
                    </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Indicateur de chargement pour le changement d'onglet */}
            {isTabLoading && (
                <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                    <p className="text-gray-600">Actualisation des matchs...</p>
                </div>
            )}

            {/* Contenu filtré en fonction de l'onglet actif */}
            {activeTab === 'all' &&
                rounds.map((round) => (
                    <div key={`round-${round.round}`} className="mb-12">
                        <div className="flex items-center mb-4">
                            <h2 className={`text-xl font-bold mr-3 ${
                                round.title === 'Finale' ? 'text-purple-700' :
                                    round.title === 'Demi-finales' ? 'text-indigo-700' :
                                        round.title === 'Quarts de finale' ? 'text-blue-700' : ''
                            }`}>
                                {round.title}
                            </h2>
                            <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">
                                {round.activeMatches.length + round.waitingMatches.length + round.completedMatches.length} matchs
                            </span>
                        </div>

                        {/* Matchs en cours pour ce tour */}
                        {round.activeMatches.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-green-700 mb-3 flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                    Matchs en cours
                                    <span
                                        className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                                        {round.activeMatches.length}
                                    </span>
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {round.activeMatches.map((match) => (
                                        <MatchController
                                            key={match.id}
                                            match={match}
                                            onUpdateScore={handleUpdateScore}
                                            onFinishMatch={handleFinishMatch}
                                            onActivateMatch={handleActivateMatch}
                                            isLoading={isActionLoading}
                                            tournoiId={tournamentId}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Matchs en attente pour ce tour */}
                        {round.waitingMatches.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-yellow-700 mb-3 flex items-center">
                                    <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                                    Matchs en attente
                                    <span
                                        className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded">
                                        {round.waitingMatches.length}
                                    </span>
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {round.waitingMatches
                                        .filter(match => match.joueur1_id && match.joueur2_id)
                                        .map((match) => (
                                            <MatchController
                                                key={match.id}
                                                match={match}
                                                onUpdateScore={handleUpdateScore}
                                                onFinishMatch={handleFinishMatch}
                                                onActivateMatch={handleActivateMatch}
                                                isLoading={isActionLoading}
                                                tournoiId={tournamentId}
                                            />
                                        ))}
                                </div>

                                {round.waitingMatches.filter(match => !match.joueur1_id || !match.joueur2_id).length > 0 && (
                                    <div className="mt-4 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                            <p className="text-sm text-yellow-700 mb-3 md:mb-0">
                                                Il y a {round.waitingMatches.filter(match => !match.joueur1_id || !match.joueur2_id).length} match(s) en attente dont les joueurs ne sont pas encore déterminés.
                                            </p>
                                            <button
                                                onClick={() => {
                                                    // Récupérer le premier match à compléter
                                                    const matchToComplete = round.waitingMatches.find(match => !match.joueur1_id || !match.joueur2_id);
                                                    if (matchToComplete) {
                                                        router.push(`/display/repechage?tournoi=${tournamentId}&match=${matchToComplete.id}`);
                                                    }
                                                }}
                                                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-md transition"
                                            >
                                                Repêcher un joueur
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Matchs terminés pour ce tour */}
                        {round.completedMatches.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                                    <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                                    Matchs terminés
                                    <span
                                        className="ml-2 bg-gray-100 text-gray-800 text-xs font-medium px-2 py-0.5 rounded">
                                        {round.completedMatches.length}
                                    </span>
                                </h3>
                                <div className="bg-white rounded-lg shadow overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col"
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Match
                                            </th>
                                            <th scope="col"
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Joueurs
                                            </th>
                                            <th scope="col"
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Score
                                            </th>
                                            <th scope="col"
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Gagnant
                                            </th>
                                        </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                        {round.completedMatches.map((match) => (
                                            <tr key={match.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        Match #{match.id}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        Position {match.position}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900 mb-1">
                                                        {match.joueur1?.prenom} {match.joueur1?.nom}
                                                    </div>
                                                    <div className="text-sm text-gray-900">
                                                        {match.joueur2?.prenom} {match.joueur2?.nom}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium">
                                                        {match.score_joueur1} - {match.score_joueur2}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                        <span
                                                            className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                            {match.gagnant_id === match.joueur1_id
                                                                ? `${match.joueur1?.prenom} ${match.joueur1?.nom}`
                                                                : `${match.joueur2?.prenom} ${match.joueur2?.nom}`}
                                                        </span>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ))
            }

            {/* Affichage uniquement des matchs en cours si l'onglet "active" est sélectionné */}
            {activeTab === 'active' && (
                <div className="mb-10">
                    <h2 className="text-xl font-bold mb-4 text-green-700">Tous les matchs en cours</h2>

                    {totalActiveMatches === 0 ? (
                        <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200">
                            <p className="text-gray-500">
                                Aucun match n&#39;est en cours actuellement
                            </p>
                            {totalWaitingMatches > 0 && (
                                <p className="mt-2 text-sm text-gray-500">
                                    Il y a des matchs en attente qui peuvent être démarrés.
                                </p>
                            )}
                        </div>
                    ) : (
                        <>
                            {rounds.map(round =>
                                    round.activeMatches.length > 0 && (
                                        <div key={`active-${round.round}`} className="mb-8">
                                            <h3 className={`text-lg font-semibold mb-4 ${
                                                round.title === 'Finale' ? 'text-purple-700' :
                                                    round.title === 'Demi-finales' ? 'text-indigo-700' :
                                                        round.title === 'Quarts de finale' ? 'text-blue-700' : 'text-gray-700'
                                            }`}>
                                                {round.title}
                                            </h3>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                {round.activeMatches.map((match) => (
                                                    <MatchController
                                                        key={match.id}
                                                        match={match}
                                                        onUpdateScore={handleUpdateScore}
                                                        onFinishMatch={handleFinishMatch}
                                                        onActivateMatch={handleActivateMatch}
                                                        isLoading={isActionLoading}
                                                        tournoiId={tournamentId}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Affichage spécifique pour un tour sélectionné */}
            {activeTab.startsWith('round-') &&
                rounds.map(round => {
                    if (activeTab === `round-${round.round}`) {
                        const isSpecialRound = ['Finale', 'Demi-finales', 'Quarts de finale'].includes(round.title);
                        return (
                            <div key={`round-specific-${round.round}`} className="mb-10">
                                <div className="flex items-center mb-6">
                                    <h2 className={`text-2xl font-bold mr-3 ${
                                        round.title === 'Finale' ? 'text-purple-700' :
                                            round.title === 'Demi-finales' ? 'text-indigo-700' :
                                                round.title === 'Quarts de finale' ? 'text-blue-700' : ''
                                    }`}>
                                        {round.title}
                                    </h2>
                                    {isSpecialRound && (
                                        <div className={`px-3 py-1 text-sm font-semibold rounded-md ${
                                            round.title === 'Finale' ? 'bg-purple-100 text-purple-800' :
                                                round.title === 'Demi-finales' ? 'bg-indigo-100 text-indigo-800' :
                                                    'bg-blue-100 text-blue-800'
                                        }`}>
                                            {round.title === 'Finale' ? 'Phase finale' :
                                                round.title === 'Demi-finales' ? 'Phase avancée' :
                                                    'Phase éliminatoire'}
                                        </div>
                                    )}
                                </div>

                                {/* Matchs en cours pour ce tour */}
                                {round.activeMatches.length > 0 && (
                                    <div className="mb-8">
                                        <h3 className="text-lg font-semibold text-green-700 mb-3 flex items-center">
                                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                            Matchs en cours
                                            <span
                                                className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                                                {round.activeMatches.length}
                                            </span>
                                        </h3>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {round.activeMatches.map((match) => (
                                                <MatchController
                                                    key={match.id}
                                                    match={match}
                                                    onUpdateScore={handleUpdateScore}
                                                    onFinishMatch={handleFinishMatch}
                                                    onActivateMatch={handleActivateMatch}
                                                    isLoading={isActionLoading}
                                                    tournoiId={tournamentId}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* Matchs en attente pour ce tour */}
                                {round.waitingMatches.length > 0 && (
                                    <div className="mb-8">
                                        <h3 className="text-lg font-semibold text-yellow-700 mb-3 flex items-center">
                                            <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                                            Matchs en attente
                                            <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded">
                {round.waitingMatches.length}
            </span>
                                        </h3>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {round.waitingMatches
                                                .filter(match => match.joueur1_id && match.joueur2_id)
                                                .map((match) => (
                                                    <MatchController
                                                        key={match.id}
                                                        match={match}
                                                        onUpdateScore={handleUpdateScore}
                                                        onFinishMatch={handleFinishMatch}
                                                        onActivateMatch={handleActivateMatch}
                                                        isLoading={isActionLoading}
                                                        tournoiId={tournamentId}
                                                    />
                                                ))}
                                        </div>

                                        {round.waitingMatches.filter(match => !match.joueur1_id || !match.joueur2_id).length > 0 && (
                                            <div className="mt-4 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                                    <p className="text-sm text-yellow-700 mb-3 md:mb-0">
                                                        Il y a {round.waitingMatches.filter(match => !match.joueur1_id || !match.joueur2_id).length} match(s) en attente dont les joueurs ne sont pas encore déterminés.
                                                    </p>
                                                    <button
                                                        onClick={() => {
                                                            // Récupérer le premier match à compléter
                                                            const matchToComplete = round.waitingMatches.find(match => !match.joueur1_id || !match.joueur2_id);
                                                            if (matchToComplete) {
                                                                router.push(`/display/repechage?tournoi=${tournamentId}&match=${matchToComplete.id}`);
                                                            }
                                                        }}
                                                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-md transition"
                                                    >
                                                        Repêcher un joueur
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Matchs terminés pour ce tour */}
                                {round.completedMatches.length > 0 && (
                                    <div className="mb-8">
                                        <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                                            <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                                            Matchs terminés
                                            <span className="ml-2 bg-gray-100 text-gray-800 text-xs font-medium px-2 py-0.5 rounded">
                {round.completedMatches.length}
            </span>
                                        </h3>
                                        <div className="bg-white rounded-lg shadow overflow-hidden">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                <tr>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Match
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Joueurs
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Score
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Gagnant
                                                    </th>
                                                </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                {round.completedMatches.map((match) => (
                                                    <tr key={match.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                Match #{match.id}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                Position {match.position}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm text-gray-900 mb-1">
                                                                {match.joueur1?.prenom} {match.joueur1?.nom}
                                                            </div>
                                                            <div className="text-sm text-gray-900">
                                                                {match.joueur2?.prenom} {match.joueur2?.nom}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium">
                                                                {match.score_joueur1} - {match.score_joueur2}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                {match.gagnant_id === match.joueur1_id
                                    ? `${match.joueur1?.prenom} ${match.joueur1?.nom}`
                                    : `${match.joueur2?.prenom} ${match.joueur2?.nom}`}
                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Message si aucun match n'est trouvé pour ce tour */}
                                {round.activeMatches.length === 0 && round.waitingMatches.length === 0 && round.completedMatches.length === 0 && (
                                    <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200">
                                        <p className="text-gray-500">
                                            Aucun match trouvé pour ce tour.
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    }
                    return null;
                })
            }

            {/* Section d'aide pour la navigation */}
            <div className="mt-12 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Comment naviguer</h3>
                <p className="text-blue-700 mb-2">
                    Utilisez les onglets ci-dessus pour filtrer les matchs par tour.
                </p>
                <ul className="list-disc pl-5 text-blue-600 text-sm">
                    <li className="mb-1">
                        <span className="font-medium">Tous les tours</span> - affiche tous les matchs organisés par tour
                    </li>
                    <li className="mb-1">
                        <span className="font-medium">Matchs en cours</span> - montre uniquement les matchs actuellement
                        en cours pour tous les tours
                    </li>
                    <li>
                        <span className="font-medium">Tour spécifique</span> - affiche uniquement les matchs d&#39;un
                        tour particulier
                    </li>
                </ul>
            </div>

            {/* Section d'aide pour les joueurs absents */}
            <div className="mt-4 bg-red-50 p-4 rounded-lg border border-red-200">
                <h3 className="text-lg font-semibold text-red-800 mb-2">Gestion des joueurs absents</h3>
                <p className="text-red-700 mb-2">
                    Si un joueur est absent, vous pouvez le signaler et le remplacer par un joueur repêché.
                </p>
                <ul className="list-disc pl-5 text-red-600 text-sm">
                    <li className="mb-1">
                        Cliquez sur &#34;<span className="font-medium">Déclarer absent</span>&#34; à côté de l&#39;horaire du match
                    </li>
                    <li className="mb-1">
                        Sélectionnez le joueur qui est absent
                    </li>
                    <li className="mb-1">
                        La page de repêchage s&#39;ouvrira pour vous permettre de sélectionner un remplaçant
                    </li>
                    <li>
                        Le joueur remplaçant sera automatiquement intégré dans le match et le bracket du tournoi
                    </li>
                </ul>
            </div>
        </div>
    );
}