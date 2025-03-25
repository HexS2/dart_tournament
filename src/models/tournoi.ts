// src/models/tournoi.ts
import db from '../lib/db';
import { Tournoi, TournoiInput, Joueur, StatusTournoi, StatusMatch } from './types';
import JoueurModel from './joueur';

// Interfaces pour les résultats spécifiques
interface ParticipantId {
    joueur_id: number;
}

interface CountResult {
    count: number;
}

export const TournoiModel = {
    // Récupérer tous les tournois
    getAll: async (): Promise<Tournoi[]> => {
        return db.customQuery<Tournoi[]>(
            'SELECT * FROM tournois ORDER BY date_tournoi DESC'
        );
    },

    // Récupérer un tournoi par ID
    getById: async (id: number): Promise<Tournoi | undefined> => {
        const results = await db.getById<Tournoi[]>('tournois', id);
        return results[0];
    },

    // Récupérer le tournoi en cours
    getEnCours: async (): Promise<Tournoi | undefined> => {
        const results = await db.customQuery<Tournoi[]>(
            'SELECT * FROM tournois WHERE status = ? LIMIT 1',
            [StatusTournoi.EnCours]
        );
        return results[0];
    },

    // Récupérer les tournois à venir
    getAVenir: async (): Promise<Tournoi[]> => {
        return db.customQuery<Tournoi[]>(
            'SELECT * FROM tournois WHERE date_tournoi >= CURDATE() AND status = ? ORDER BY date_tournoi ASC',
            [StatusTournoi.Planifie]
        );
    },

    // Calculate total number of rounds needed for a tournament
    calculateTotalRounds: (participantCount: number): number => {
        // Log base 2 of participant count, rounded up
        return Math.ceil(Math.log2(participantCount));
    },

    // Créer un nouveau tournoi
    create: async (tournoi: TournoiInput) => {
        const result = await db.insert('tournois', {
            ...tournoi,
            status: StatusTournoi.Planifie,
            round_actuel: 0
        });
        return result.insertId;
    },

    // Mettre à jour un tournoi
    update: async (id: number, tournoi: Partial<TournoiInput>) => {
        return db.update('tournois', id, tournoi);
    },

    // Supprimer un tournoi
    delete: async (id: number) => {
        return db.remove('tournois', id);
    },

    // Obtenir les participants d'un tournoi
    getParticipants: async (tournoiId: number): Promise<Joueur[]> => {
        return db.customQuery<Joueur[]>(
            `SELECT j.*
             FROM joueurs j
                      JOIN participants_tournoi pt ON j.id = pt.joueur_id
             WHERE pt.tournoi_id = ?
             ORDER BY pt.position_tirage`,
            [tournoiId]
        );
    },

    // Ajouter un participant à un tournoi
    addParticipant: async (tournoiId: number, joueurId: number): Promise<number> => {
        try {
            const result = await db.insert('participants_tournoi', {
                tournoi_id: tournoiId,
                joueur_id: joueurId
            });

            // Mettre à jour les statistiques du joueur
            await JoueurModel.incrementParticipations(joueurId);

            return result.insertId;
        } catch (error) {
            // Gérer l'erreur de duplicate (joueur déjà inscrit)
            if (error instanceof Error && error.message.includes('Duplicate entry')) {
                throw new Error('Ce joueur est déjà inscrit au tournoi');
            }
            throw error;
        }
    },

    // Retirer un participant d'un tournoi
    removeParticipant: async (tournoiId: number, joueurId: number): Promise<void> => {
        await db.customQuery(
            'DELETE FROM participants_tournoi WHERE tournoi_id = ? AND joueur_id = ?',
            [tournoiId, joueurId]
        );
    },

    // Vérifier si un tournoi peut démarrer
    canStart: async (tournoiId: number): Promise<{ canStart: boolean; message?: string }> => {
        // Vérifier que le tournoi est en état "planifié"
        const tournoi = await TournoiModel.getById(tournoiId);
        if (!tournoi) {
            return { canStart: false, message: 'Tournoi introuvable' };
        }

        if (tournoi.status !== StatusTournoi.Planifie) {
            return { canStart: false, message: 'Le tournoi ne peut pas être démarré car il n\'est pas en état planifié' };
        }

        // Vérifier qu'il y a au moins 2 participants
        const participants = await TournoiModel.getParticipantsCount(tournoiId);
        if (participants < 2) {
            return { canStart: false, message: 'Il faut au moins 2 participants pour démarrer un tournoi' };
        }

        return { canStart: true };
    },

    // Compter le nombre de participants à un tournoi
    getParticipantsCount: async (tournoiId: number): Promise<number> => {
        const [result] = await db.customQuery<CountResult[]>(
            'SELECT COUNT(*) as count FROM participants_tournoi WHERE tournoi_id = ?',
            [tournoiId]
        );
        return result?.count || 0;
    },

    // Effectuer le tirage au sort des participants
    tirageSortParticipants: async (tournoiId: number): Promise<void> => {
        // Obtenir tous les participants du tournoi
        const participants = await db.customQuery<{ id: number }[]>(
            'SELECT id FROM participants_tournoi WHERE tournoi_id = ?',
            [tournoiId]
        );

        // Mélanger les participants (Fisher-Yates shuffle)
        const shuffled = [...participants];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Mettre à jour la position de tirage pour chaque participant
        for (let i = 0; i < shuffled.length; i++) {
            await db.customQuery(
                'UPDATE participants_tournoi SET position_tirage = ? WHERE id = ?',
                [i + 1, shuffled[i].id]
            );
        }
    },

    // Démarrer un tournoi et générer les matchs du premier tour
    demarrerTournoi: async (tournoiId: number): Promise<void> => {
        // Vérifier si le tournoi peut démarrer
        const { canStart, message } = await TournoiModel.canStart(tournoiId);
        if (!canStart) {
            throw new Error(message || 'Le tournoi ne peut pas démarrer');
        }

        // Effectuer le tirage au sort des participants
        await TournoiModel.tirageSortParticipants(tournoiId);

        // Récupérer les participants dans l'ordre du tirage au sort
        const participants = await db.customQuery<ParticipantId[]>(
            `SELECT joueur_id
             FROM participants_tournoi
             WHERE tournoi_id = ?
             ORDER BY position_tirage`,
            [tournoiId]
        );

        // Calculate total rounds based on participant count
        const totalRounds = TournoiModel.calculateTotalRounds(participants.length);
        console.log(`Tournament will have ${totalRounds} rounds with ${participants.length} participants`);

        // Mettre à jour le statut du tournoi avec le nombre total de rounds
        await db.update('tournois', tournoiId, {
            status: StatusTournoi.EnCours,
            round_actuel: 1,
            total_rounds: totalRounds
        });

        // Générer les matchs du premier tour
        await generateFirstRoundMatches(tournoiId, participants.map(p => p.joueur_id));
    },

    // Obtenir le champion d'un tournoi
    getChampion: async (tournoiId: number): Promise<Joueur | undefined> => {
        const tournoi = await TournoiModel.getById(tournoiId);
        if (!tournoi || !tournoi.champion_id) {
            return undefined;
        }

        return JoueurModel.getById(tournoi.champion_id);
    },

    // Obtenir les détails complets d'un tournoi (avec participants, matchs, etc.)
    getDetailsTournoi: async (tournoiId: number) => {
        const tournoi = await TournoiModel.getById(tournoiId);
        if (!tournoi) {
            return null;
        }

        const participants = await TournoiModel.getParticipants(tournoiId);
        const matchs = await db.customQuery(
            'SELECT * FROM matchs WHERE tournoi_id = ? ORDER BY round, position',
            [tournoiId]
        );

        let champion = null;
        if (tournoi.champion_id) {
            champion = await JoueurModel.getById(tournoi.champion_id);
        }

        return {
            tournoi,
            participants,
            matchs,
            champion
        };
    }
};

// Fonction utilitaire pour générer les matchs du premier tour
async function generateFirstRoundMatches(tournoiId: number, joueurIds: number[]): Promise<void> {
    // Calculer l'heure de base pour les matchs (19h00)
    const baseHeure = '19:00:00';

    // Générer les matchs
    for (let i = 0; i < joueurIds.length; i += 2) {
        const position = Math.floor(i / 2) + 1;
        const joueur1Id = joueurIds[i];
        // Si nombre impair de joueurs, le dernier joueur passe au tour suivant
        const joueur2Id = i + 1 < joueurIds.length ? joueurIds[i + 1] : null;

        // Calculer l'horaire du match (incrément de 30 min par position)
        const matchHeure = calculateMatchTime(1, position, baseHeure);

        // Statut du match (le premier est en cours, les autres en attente)
        const status = position === 1 ? StatusMatch.EnCours : StatusMatch.EnAttente;

        console.log(`Creating match for round 1, position ${position}, joueur1: ${joueur1Id}, joueur2: ${joueur2Id}`);

        await db.insert('matchs', {
            tournoi_id: tournoiId,
            round: 1,
            position,
            joueur1_id: joueur1Id,
            joueur2_id: joueur2Id,
            status,
            horaire: matchHeure
        });
    }
}

// Fonction utilitaire pour calculer l'horaire d'un match
function calculateMatchTime(round: number, position: number, baseHeure: string = '19:00:00'): string {
    const [hours, minutes] = baseHeure.split(':').map(Number);

    // Chaque round ajoute 45 minutes, chaque position ajoute 30 minutes
    const totalMinutes = (round - 1) * 45 + (position - 1) * 30;

    const date = new Date();
    date.setHours(hours, minutes + totalMinutes, 0, 0);

    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;
}

export default TournoiModel;