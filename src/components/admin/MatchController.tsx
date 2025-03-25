'use client';

import {useState} from 'react';
import {Match, Joueur, StatusMatch} from '@/models/types';
import {motion} from 'framer-motion';
import AbsenceModal from './AbsenceModal';

interface MatchControllerProps {
    match: Match & {
        joueur1?: Joueur | null;
        joueur2?: Joueur | null;
    };
    onUpdateScore: (matchId: number, scoreJoueur1: number, scoreJoueur2: number) => Promise<void>;
    onFinishMatch: (matchId: number, gagnantId: number) => Promise<void>;
    onActivateMatch?: (matchId: number) => void; // Nouvelle prop pour activation de match
    isLoading?: boolean;
    tournoiId: number;
}

const MatchController = ({
                             match,
                             onUpdateScore,
                             onFinishMatch,
                             onActivateMatch,
                             isLoading = false,
                             tournoiId
                         }: MatchControllerProps) => {
    const [scoreJoueur1, setScoreJoueur1] = useState<number>(match.score_joueur1);
    const [scoreJoueur2, setScoreJoueur2] = useState<number>(match.score_joueur2);
    const [updating, setUpdating] = useState<boolean>(false);
    const [showAbsenceModal, setShowAbsenceModal] = useState<boolean>(false);

    const handleUpdateScore = async () => {
        if (isLoading || updating) return;

        try {
            setUpdating(true);
            await onUpdateScore(match.id, scoreJoueur1, scoreJoueur2);
        } finally {
            setUpdating(false);
        }
    };

    const handleFinishMatch = async (gagnantId: number) => {
        if (isLoading || updating) return;

        try {
            setUpdating(true);
            await onFinishMatch(match.id, gagnantId);
        } finally {
            setUpdating(false);
        }
    };


    const formatTime = (timeString: string) => {
        if (!timeString) return '';
        return timeString.substring(0, 5);
    };

    // Vérifie si le match est éligible pour la déclaration d'absence
    const canDeclareAbsent =
        (match.status === StatusMatch.EnAttente || match.status === StatusMatch.EnCours) &&
        match.joueur1_id && match.joueur2_id && tournoiId;

    return (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-blue-50 p-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                    <div>
                        <span className="text-blue-800 font-medium">Match #{match.id}</span>
                        <span className="mx-2 text-gray-500">•</span>
                        <span className="text-gray-600">Tour {match.round}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-gray-600">
                            Horaire: {formatTime(match.horaire)}
                        </div>

                        {/* Bouton pour déclarer un joueur absent */}
                        {canDeclareAbsent && (
                            <button
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                                onClick={() => setShowAbsenceModal(true)}
                            >
                                Déclarer absent
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between mb-8">
                    {/* Joueur 1 */}
                    <div className="w-full md:w-2/5 mb-4 md:mb-0 text-center">
                        <div className="mb-2 font-medium text-lg">
                            {match.joueur1
                                ? <>
                                    <div>{match.joueur1.prenom} {match.joueur1.nom}</div>
                                    {match.joueur1.surnom && (
                                        <div className="text-sm text-gray-500">{match.joueur1.surnom}</div>
                                    )}
                                </>
                                : <span className="text-gray-500">À déterminer</span>
                            }
                        </div>
                        <div className="mt-3">
                            <input
                                type="number"
                                min="0"
                                value={scoreJoueur1}
                                onChange={(e) => setScoreJoueur1(Math.max(0, parseInt(e.target.value) || 0))}
                                className="border rounded-md px-4 py-2 w-20 text-center text-2xl font-bold"
                                disabled={isLoading || updating || !match.joueur1_id || match.status !== StatusMatch.EnCours}
                            />
                        </div>
                    </div>

                    {/* VS */}
                    <motion.div
                        className="w-full md:w-1/5 text-center flex flex-col items-center mb-4 md:mb-0"
                        animate={match.status === StatusMatch.EnCours ? {scale: [1, 1.05, 1]} : {}}
                        transition={{duration: 1.5, repeat: Infinity}}
                    >
                        <div className="text-2xl font-bold text-gray-500 mb-1">VS</div>
                        <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                            match.status === StatusMatch.EnCours ? 'bg-green-100 text-green-800' :
                                match.status === StatusMatch.Termine ? 'bg-gray-100 text-gray-800' :
                                    'bg-yellow-100 text-yellow-800'
                        }`}>
                            {match.status === StatusMatch.EnCours ? 'En cours' :
                                match.status === StatusMatch.Termine ? 'Terminé' :
                                    'En attente'}
                        </div>
                    </motion.div>

                    {/* Joueur 2 */}
                    <div className="w-full md:w-2/5 text-center">
                        <div className="mb-2 font-medium text-lg">
                            {match.joueur2
                                ? <>
                                    <div>{match.joueur2.prenom} {match.joueur2.nom}</div>
                                    {match.joueur2.surnom && (
                                        <div className="text-sm text-gray-500">{match.joueur2.surnom}</div>
                                    )}
                                </>
                                : <span className="text-gray-500">À déterminer</span>
                            }
                        </div>
                        <div className="mt-3">
                            <input
                                type="number"
                                min="0"
                                value={scoreJoueur2}
                                onChange={(e) => setScoreJoueur2(Math.max(0, parseInt(e.target.value) || 0))}
                                className="border rounded-md px-4 py-2 w-20 text-center text-2xl font-bold"
                                disabled={isLoading || updating || !match.joueur2_id || match.status !== StatusMatch.EnCours}
                            />
                        </div>
                    </div>
                </div>

                {match.status === StatusMatch.EnCours && (
                    <div
                        className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 space-x-0 sm:space-x-4">
                        <button
                            onClick={handleUpdateScore}
                            disabled={isLoading || updating}
                            className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition ${
                                (isLoading || updating) ? 'opacity-70 cursor-not-allowed' : ''
                            }`}
                        >
                            {updating ? 'Mise à jour...' : 'Mettre à jour le score'}
                        </button>

                        {match.joueur1_id && (
                            <button
                                onClick={() => handleFinishMatch(match.joueur1_id!)}
                                disabled={isLoading || updating}
                                className={`px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition ${
                                    (isLoading || updating) ? 'opacity-70 cursor-not-allowed' : ''
                                }`}
                            >
                                {updating ? 'Finalisation...' : `${match.joueur1?.prenom} gagne`}
                            </button>
                        )}

                        {match.joueur2_id && (
                            <button
                                onClick={() => handleFinishMatch(match.joueur2_id!)}
                                disabled={isLoading || updating}
                                className={`px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition ${
                                    (isLoading || updating) ? 'opacity-70 cursor-not-allowed' : ''
                                }`}
                            >
                                {updating ? 'Finalisation...' : `${match.joueur2?.prenom} gagne`}
                            </button>
                        )}
                    </div>
                )}

                {match.status === StatusMatch.Termine && match.gagnant_id && (
                    <div className="text-center py-2 px-4 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-green-800">
                            Match terminé.
                            <span className="font-semibold ml-1">
                {match.gagnant_id === match.joueur1_id && match.joueur1
                    ? `${match.joueur1.prenom} ${match.joueur1.nom}`
                    : match.gagnant_id === match.joueur2_id && match.joueur2
                        ? `${match.joueur2.prenom} ${match.joueur2.nom}`
                        : 'Gagnant'
                } a remporté ce match.
              </span>
                        </p>
                    </div>
                )}

                {match.status === StatusMatch.EnAttente && match.joueur1_id && match.joueur2_id && (
                    <div className="text-center mt-4">
                        <button
                            onClick={async () => {
                                try {
                                    setUpdating(true);
                                    const response = await fetch(`/api/matches/${match.id}/activate`, {
                                        method: 'POST'
                                    });

                                    if (!response.ok) {
                                        throw new Error('Erreur lors de l\'activation du match');
                                    }

                                    // Au lieu de recharger la page, mettre à jour l'état local
                                    const data = await response.json();

                                    // Informer le parent (MatchesPage) que le match a été activé
                                    // Créer une fonction de rappel pour mettre à jour l'état
                                    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                                    onActivateMatch && onActivateMatch(match.id);
                                } catch (error) {
                                    console.error('Erreur:', error);
                                    alert('Impossible d\'activer ce match');
                                } finally {
                                    setUpdating(false);
                                }
                            }}
                            disabled={isLoading || updating}
                            className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition ${
                                (isLoading || updating) ? 'opacity-70 cursor-not-allowed' : ''
                            }`}
                        >
                            {updating ? 'Activation...' : 'Démarrer ce match'}
                        </button>
                    </div>
                )}
            </div>

            {/* Modal pour déclarer un joueur absent */}
            {showAbsenceModal && tournoiId && (
                <AbsenceModal
                    match={match}
                    joueur1={match.joueur1}
                    joueur2={match.joueur2}
                    onClose={() => setShowAbsenceModal(false)}
                    tournoiId={tournoiId}
                />
            )}
        </div>
    );
};

export default MatchController;