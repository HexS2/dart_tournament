'use client';

import { useState } from 'react';
import { Match, Joueur } from '@/models/types';
import { useRouter } from 'next/navigation';

interface AbsenceModalProps {
    match: Match;
    joueur1?: Joueur | null;
    joueur2?: Joueur | null;
    onClose: () => void;
    tournoiId: number;
}

const AbsenceModal = ({ match, joueur1, joueur2, onClose, tournoiId }: AbsenceModalProps) => {
    const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handlePlayerSelection = (playerId: number) => {
        setSelectedPlayer(playerId);
    };

    const handleConfirm = () => {
        if (!selectedPlayer) return;

        setIsLoading(true);

        // Rediriger directement vers la page de repêchage avec les paramètres
        router.push(`/display/repechage?tournoi=${tournoiId}&match=${match.id}&joueur=${selectedPlayer}`);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Déclarer un joueur absent
                </h3>

                <div className="mb-6">
                    <p className="text-gray-600 mb-4">
                        Sélectionnez le joueur qui est absent pour ce match. Ce joueur sera remplacé par un joueur repêché.
                    </p>

                    <div className="space-y-3">
                        {joueur1 && (
                            <div
                                className={`p-3 border rounded-lg cursor-pointer transition hover:bg-gray-50 ${
                                    selectedPlayer === joueur1.id
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200'
                                }`}
                                onClick={() => handlePlayerSelection(joueur1.id)}
                            >
                                <div className="flex items-center">
                                    <div className={`w-5 h-5 border rounded-full mr-3 flex items-center justify-center ${
                                        selectedPlayer === joueur1.id
                                            ? 'bg-blue-500 border-blue-500'
                                            : 'border-gray-400'
                                    }`}>
                                        {selectedPlayer === joueur1.id && (
                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium">
                                            {joueur1.prenom} {joueur1.nom}
                                        </p>
                                        {joueur1.surnom && (
                                            <p className="text-sm text-gray-500">
                                                {joueur1.surnom}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {joueur2 && (
                            <div
                                className={`p-3 border rounded-lg cursor-pointer transition hover:bg-gray-50 ${
                                    selectedPlayer === joueur2.id
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200'
                                }`}
                                onClick={() => handlePlayerSelection(joueur2.id)}
                            >
                                <div className="flex items-center">
                                    <div className={`w-5 h-5 border rounded-full mr-3 flex items-center justify-center ${
                                        selectedPlayer === joueur2.id
                                            ? 'bg-blue-500 border-blue-500'
                                            : 'border-gray-400'
                                    }`}>
                                        {selectedPlayer === joueur2.id && (
                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium">
                                            {joueur2.prenom} {joueur2.nom}
                                        </p>
                                        {joueur2.surnom && (
                                            <p className="text-sm text-gray-500">
                                                {joueur2.surnom}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition ${
                            !selectedPlayer || isLoading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={handleConfirm}
                        disabled={!selectedPlayer || isLoading}
                    >
                        {isLoading ? 'Chargement...' : 'Confirmer et repêcher'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AbsenceModal;