'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Joueur } from '@/models/types';

interface ParticipantFormProps {
    tournamentId: number;
    participants: Joueur[];
    onAddParticipant: (joueurId: number) => Promise<void>;
    onStartTournament: () => Promise<void>;
    isLoading?: boolean;
    canStart: boolean;
}

// Interface pour un nouveau joueur
interface NouveauJoueur {
    prenom: string;
    nom: string;
    surnom?: string;
    niveau: string;
}

const ParticipantForm = ({
                             participants,
                             onAddParticipant,
                             onStartTournament,
                             isLoading = false,
                             canStart = false
                         }: ParticipantFormProps) => {
    const [joueurs, setJoueurs] = useState<Joueur[]>([]);
    const [selectedJoueurId, setSelectedJoueurId] = useState<number>(0);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [showNewPlayerForm, setShowNewPlayerForm] = useState<boolean>(false);
    const [isCreatingPlayer, setIsCreatingPlayer] = useState<boolean>(false);

    // État pour le formulaire de création de joueur
    const [nouveauJoueur, setNouveauJoueur] = useState<NouveauJoueur>({
        prenom: '',
        nom: '',
        surnom: '',
        niveau: 'Amateur'
    });

    // Charger la liste des joueurs
    useEffect(() => {
        const fetchJoueurs = async () => {
            try {
                const response = await fetch('/api/joueurs?actif=true');
                if (!response.ok) {
                    throw new Error('Erreur lors du chargement des joueurs');
                }
                const data = await response.json();

                // Filtrer les joueurs qui ne sont pas déjà participants
                const participantIds = participants.map(p => p.id);
                const filteredJoueurs = data.data.filter((j: Joueur) => !participantIds.includes(j.id));

                setJoueurs(filteredJoueurs);
                if (filteredJoueurs.length > 0) {
                    setSelectedJoueurId(filteredJoueurs[0].id);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Une erreur est survenue');
            }
        };

        fetchJoueurs();
    }, [participants]);

    // Rechercher des joueurs
    useEffect(() => {
        const searchJoueurs = async () => {
            if (searchTerm.length < 2) {
                return;
            }

            setIsSearching(true);
            try {
                const response = await fetch(`/api/joueurs?search=${encodeURIComponent(searchTerm)}`);
                if (!response.ok) {
                    throw new Error('Erreur lors de la recherche des joueurs');
                }
                const data = await response.json();

                // Filtrer les joueurs qui ne sont pas déjà participants
                const participantIds = participants.map(p => p.id);
                const filteredJoueurs = data.data.filter((j: Joueur) => !participantIds.includes(j.id));

                setJoueurs(filteredJoueurs);
                if (filteredJoueurs.length > 0) {
                    setSelectedJoueurId(filteredJoueurs[0].id);
                } else {
                    setSelectedJoueurId(0);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Une erreur est survenue');
            } finally {
                setIsSearching(false);
            }
        };

        const debounce = setTimeout(() => {
            if (searchTerm.length >= 2) {
                searchJoueurs();
            }
        }, 300);

        return () => clearTimeout(debounce);
    }, [searchTerm, participants]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (selectedJoueurId === 0) {
            setError('Veuillez sélectionner un joueur');
            return;
        }

        try {
            await onAddParticipant(selectedJoueurId);

            // Réinitialiser la sélection
            if (joueurs.length > 1) {
                const newJoueurs = joueurs.filter(j => j.id !== selectedJoueurId);
                setJoueurs(newJoueurs);
                if (newJoueurs.length > 0) {
                    setSelectedJoueurId(newJoueurs[0].id);
                } else {
                    setSelectedJoueurId(0);
                }
            } else {
                setSelectedJoueurId(0);
                setJoueurs([]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        }
    };

    const handleStartTournament = async () => {
        setError('');
        try {
            await onStartTournament();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        }
    };

    // Gérer les changements dans le formulaire de nouveau joueur
    const handleNouveauJoueurChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNouveauJoueur(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Créer un nouveau joueur
    const handleCreateJoueur = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsCreatingPlayer(true);

        try {
            // Valider les champs obligatoires
            if (!nouveauJoueur.prenom.trim() || !nouveauJoueur.nom.trim()) {
                throw new Error('Le prénom et le nom sont obligatoires');
            }

            // Appel API pour créer le joueur
            const response = await fetch('/api/joueurs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prenom: nouveauJoueur.prenom.trim(),
                    nom: nouveauJoueur.nom.trim(),
                    surnom: nouveauJoueur.surnom?.trim() || null,
                    niveau: nouveauJoueur.niveau,
                    actif: true
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de la création du joueur');
            }

            // Récupérer le joueur créé
            const data = await response.json();

            // Ajusté pour fonctionner avec la structure de réponse de l'API
            const newPlayer = data.data.joueur || data.data;
            const newPlayerId = data.data.id || newPlayer.id;

            if (!newPlayerId) {
                throw new Error('ID du joueur non trouvé dans la réponse');
            }

            // Ajouter le joueur à la liste et le sélectionner
            setJoueurs(prev => [newPlayer, ...prev]);
            setSelectedJoueurId(newPlayerId);

            // Réinitialiser le formulaire et le fermer
            setNouveauJoueur({
                prenom: '',
                nom: '',
                surnom: '',
                niveau: 'Amateur'
            });
            setShowNewPlayerForm(false);

            // Ajouter automatiquement le joueur au tournoi
            await onAddParticipant(newPlayerId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setIsCreatingPlayer(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-2">Participants du tournoi</h2>
            <p className="text-gray-600 mb-4">
                {participants.length} participant(s) inscrit(s)
            </p>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                    <button
                        onClick={() => setError('')}
                        className="float-right font-bold"
                    >
                        &times;
                    </button>
                </div>
            )}

            <div className="mb-6">
                <h3 className="font-semibold mb-2">Participants inscrits</h3>
                {participants.length === 0 ? (
                    <p className="text-gray-500 italic">Aucun participant inscrit</p>
                ) : (
                    <ul className="bg-gray-50 rounded-md border border-gray-200 divide-y divide-gray-200 max-h-60 overflow-y-auto">
                        {participants.map((participant) => (
                            <li key={participant.id} className="px-4 py-2 flex items-center justify-between">
                                <div>
                                    <span className="font-medium">{participant.prenom} {participant.nom}</span>
                                    {participant.surnom && (
                                        <span className="text-gray-500 ml-2">{participant.surnom}</span>
                                    )}
                                </div>
                                <span className="text-sm text-gray-500">{participant.niveau}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Afficher soit le formulaire de recherche, soit le formulaire de création */}
            {!showNewPlayerForm ? (
                <form onSubmit={handleSubmit} className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">Ajouter un participant</h3>
                        <button
                            type="button"
                            onClick={() => setShowNewPlayerForm(true)}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                            Créer un nouveau joueur
                        </button>
                    </div>

                    <div className="mb-4">
                        <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700 mb-1">
                            Rechercher un joueur
                        </label>
                        <input
                            type="text"
                            id="searchTerm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nom, prénom ou surnom"
                        />
                        {isSearching && (
                            <p className="text-sm text-gray-500 mt-1">Recherche en cours...</p>
                        )}
                    </div>

                    <div className="mb-4">
                        <label htmlFor="joueurId" className="block text-sm font-medium text-gray-700 mb-1">
                            Sélectionner un joueur
                        </label>
                        <select
                            id="joueurId"
                            value={selectedJoueurId}
                            onChange={(e) => setSelectedJoueurId(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={joueurs.length === 0}
                        >
                            {joueurs.length === 0 ? (
                                <option value="0">Aucun joueur disponible</option>
                            ) : (
                                joueurs.map((joueur) => (
                                    <option key={joueur.id} value={joueur.id}>
                                        {joueur.prenom} {joueur.nom} {joueur.surnom ? `"${joueur.surnom}"` : ''} - {joueur.niveau}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || joueurs.length === 0}
                        className={`w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                            isLoading || joueurs.length === 0 ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                    >
                        {isLoading ? 'Ajout en cours...' : 'Ajouter ce participant'}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleCreateJoueur} className="mb-6 bg-blue-50 p-4 rounded-md border border-blue-200">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold text-blue-800">Créer un nouveau joueur</h3>
                        <button
                            type="button"
                            onClick={() => setShowNewPlayerForm(false)}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                            Revenir à la recherche
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label htmlFor="prenom" className="block text-sm font-medium text-gray-700 mb-1">
                                Prénom <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="prenom"
                                name="prenom"
                                value={nouveauJoueur.prenom}
                                onChange={handleNouveauJoueurChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-1">
                                Nom <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="nom"
                                name="nom"
                                value={nouveauJoueur.nom}
                                onChange={handleNouveauJoueurChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label htmlFor="surnom" className="block text-sm font-medium text-gray-700 mb-1">
                                Surnom (optionnel)
                            </label>
                            <input
                                type="text"
                                id="surnom"
                                name="surnom"
                                value={nouveauJoueur.surnom || ''}
                                onChange={handleNouveauJoueurChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="niveau" className="block text-sm font-medium text-gray-700 mb-1">
                                Niveau
                            </label>
                            <select
                                id="niveau"
                                name="niveau"
                                value={nouveauJoueur.niveau}
                                onChange={handleNouveauJoueurChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="Débutant">Débutant</option>
                                <option value="Amateur">Amateur</option>
                                <option value="Intermédiaire">Intermédiaire</option>
                                <option value="Semi-pro">Semi-pro</option>
                                <option value="Professionnel">Professionnel</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex space-x-3">
                        <button
                            type="submit"
                            disabled={isCreatingPlayer}
                            className={`flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isCreatingPlayer ? 'opacity-70 cursor-not-allowed' : ''
                            }`}
                        >
                            {isCreatingPlayer ? 'Création en cours...' : 'Créer et ajouter au tournoi'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowNewPlayerForm(false)}
                            disabled={isCreatingPlayer}
                            className="py-2 px-4 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                            Annuler
                        </button>
                    </div>
                </form>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                    type="button"
                    onClick={handleStartTournament}
                    disabled={!canStart || isLoading || isCreatingPlayer}
                    className={`w-full py-3 px-4 text-lg bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        !canStart || isLoading || isCreatingPlayer ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                >
                    {isLoading ? 'Démarrage en cours...' : 'Démarrer le tournoi'}
                </button>
                {!canStart && participants.length < 2 && (
                    <p className="text-sm text-red-500 mt-2">
                        Il faut au moins 2 participants pour démarrer le tournoi
                    </p>
                )}
            </div>
        </div>
    );
};

export default ParticipantForm;