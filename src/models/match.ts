// src/models/match.ts
import db from '../lib/db';
import { Match, MatchInput, StatusMatch, StatusTournoi } from './types';
import JoueurModel from './joueur';

// Interface pour les résultats de comptage
interface CountResult {
    count: number;
}

export const MatchModel = {
    // Récupérer un match par ID
    getById: async (id: number): Promise<Match | undefined> => {
        const results = await db.getById<Match[]>('matchs', id);
        return results[0];
    },

    // Récupérer tous les matchs d'un tournoi
    getByTournoi: async (tournoiId: number): Promise<Match[]> => {
        return db.customQuery<Match[]>(
            'SELECT * FROM matchs WHERE tournoi_id = ? ORDER BY round, position',
            [tournoiId]
        );
    },

    // Récupérer les matchs par round
    getByRound: async (tournoiId: number, round: number): Promise<Match[]> => {
        return db.customQuery<Match[]>(
            'SELECT * FROM matchs WHERE tournoi_id = ? AND round = ? ORDER BY position',
            [tournoiId, round]
        );
    },

    // Récupérer les matchs en cours
    getEnCours: async (tournoiId?: number): Promise<Match[]> => {
        if (tournoiId) {
            return db.customQuery<Match[]>(
                'SELECT * FROM matchs WHERE tournoi_id = ? AND status = ? ORDER BY round, position',
                [tournoiId, StatusMatch.EnCours]
            );
        } else {
            return db.customQuery<Match[]>(
                'SELECT * FROM matchs WHERE status = ? ORDER BY tournoi_id, round, position',
                [StatusMatch.EnCours]
            );
        }
    },

    // Récupérer les matchs d'un joueur
    getByJoueur: async (joueurId: number): Promise<Match[]> => {
        return db.customQuery<Match[]>(
            `SELECT * FROM matchs
             WHERE (joueur1_id = ? OR joueur2_id = ?)
             ORDER BY date_creation DESC`,
            [joueurId, joueurId]
        );
    },

    // Créer un nouveau match
    create: async (match: MatchInput) => {
        const result = await db.insert('matchs', match);
        return result.insertId;
    },

    // Mettre à jour un match
    update: async (id: number, match: Partial<MatchInput>) => {
        return db.update('matchs', id, match);
    },

    // Mettre à jour le score d'un match
    updateScore: async (id: number, scoreJoueur1: number, scoreJoueur2: number) => {
        const match = await MatchModel.getById(id);
        if (!match) {
            throw new Error('Match introuvable');
        }

        if (match.status !== StatusMatch.EnCours) {
            throw new Error('Impossible de mettre à jour le score d\'un match qui n\'est pas en cours');
        }

        // Enregistrer dans l'historique si configuré
        if (match.joueur1_id) {
            await MatchModel.addScoreHistory(id, match.joueur1_id, scoreJoueur1);
        }

        if (match.joueur2_id) {
            await MatchModel.addScoreHistory(id, match.joueur2_id, scoreJoueur2);
        }

        return db.update('matchs', id, {
            score_joueur1: scoreJoueur1,
            score_joueur2: scoreJoueur2
        });
    },

    // Ajouter un enregistrement à l'historique des scores
    addScoreHistory: async (matchId: number, joueurId: number, score: number): Promise<void> => {
        await db.insert('historique_scores', {
            match_id: matchId,
            joueur_id: joueurId,
            score
        });
    },

    // Obtenir l'historique des scores d'un match
    getScoreHistory: async (matchId: number) => {
        return db.customQuery(
            `SELECT hs.*, j.prenom, j.nom, j.surnom
             FROM historique_scores hs
                      JOIN joueurs j ON hs.joueur_id = j.id
             WHERE hs.match_id = ?
             ORDER BY hs.timestamp`,
            [matchId]
        );
    },

    // Calculate total number of rounds needed for a tournament
    calculateTotalRounds: async (tournoiId: number): Promise<number> => {
        const [result] = await db.customQuery<CountResult[]>(
            'SELECT COUNT(*) as count FROM participants_tournoi WHERE tournoi_id = ?',
            [tournoiId]
        );
        const participantCount = result?.count || 0;

        // Log base 2 of participant count, rounded up
        return Math.ceil(Math.log2(participantCount));
    },

    // Terminer un match et définir le gagnant
    terminerMatch: async (id: number, gagnantId: number): Promise<void> => {
        const match = await MatchModel.getById(id);
        if (!match) {
            throw new Error('Match introuvable');
        }

        if (match.status !== StatusMatch.EnCours) {
            throw new Error('Impossible de terminer un match qui n\'est pas en cours');
        }

        // Vérifier que le gagnant est bien un des joueurs du match
        if (gagnantId !== match.joueur1_id && gagnantId !== match.joueur2_id) {
            throw new Error('Le gagnant n\'est pas un joueur de ce match');
        }

        // Mettre à jour le statut du match et le gagnant
        await db.update('matchs', id, {
            status: StatusMatch.Termine,
            gagnant_id: gagnantId
        });

        // Mettre à jour les statistiques du joueur gagnant
        await JoueurModel.incrementVictoires(gagnantId);

        // Get tournament information to check total rounds
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const [tournoi] = await db.customQuery(
            'SELECT * FROM tournois WHERE id = ?',
            [match.tournoi_id]
        );

        // Get total_rounds or calculate it if not stored
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        let totalRounds = tournoi.total_rounds;
        if (!totalRounds) {
            totalRounds = await MatchModel.calculateTotalRounds(match.tournoi_id);

            // Store the total_rounds in the tournoi table if not already set
            await db.update('tournois', match.tournoi_id, {
                total_rounds: totalRounds
            });
        }

        // Check if this is the final round
        if (match.round >= totalRounds) {
            console.log(`Match ${id} is in the final round. Terminating tournament ${match.tournoi_id}`);

            // This is the final round - mark tournament as complete
            await db.update('tournois', match.tournoi_id, {
                status: StatusTournoi.Termine,
                champion_id: gagnantId
            });

            // Don't create next match since this is the final
            return;
        }

        // If not final round, proceed with creating the next match
        await updateNextMatch(match, gagnantId, totalRounds);
    },

    // Obtenir les détails d'un match avec les informations des joueurs
    getMatchDetails: async (id: number) => {
        const match = await MatchModel.getById(id);
        if (!match) {
            return null;
        }

        let joueur1 = null;
        let joueur2 = null;
        let gagnant = null;

        if (match.joueur1_id) {
            joueur1 = await JoueurModel.getById(match.joueur1_id);
        }

        if (match.joueur2_id) {
            joueur2 = await JoueurModel.getById(match.joueur2_id);
        }

        if (match.gagnant_id) {
            gagnant = await JoueurModel.getById(match.gagnant_id);
        }

        return {
            ...match,
            joueur1,
            joueur2,
            gagnant
        };
    },

    // Activer un match (le passer en cours)
    activateMatch: async (id: number): Promise<void> => {
        const match = await MatchModel.getById(id);
        if (!match) {
            throw new Error('Match introuvable');
        }

        if (match.status !== StatusMatch.EnAttente) {
            throw new Error('Impossible d\'activer un match qui n\'est pas en attente');
        }

        if (!match.joueur1_id || !match.joueur2_id) {
            throw new Error('Impossible d\'activer un match dont les joueurs ne sont pas définis');
        }

        await db.update('matchs', id, {
            status: StatusMatch.EnCours
        });
    }
};

// Fonction pour mettre à jour le prochain match après la fin d'un match
async function updateNextMatch(match: Match, gagnantId: number, totalRounds: number): Promise<void> {
    const nextRound = match.round + 1;
    const nextPosition = Math.ceil(match.position / 2);

    // Safety check - don't create matches beyond the calculated total rounds
    if (nextRound > totalRounds) {
        console.log(`Not creating match for round ${nextRound} as it exceeds total rounds ${totalRounds}`);
        return;
    }

    // Vérifier si le match du tour suivant existe déjà
    const nextMatches = await db.customQuery<Match[]>(
        'SELECT * FROM matchs WHERE tournoi_id = ? AND round = ? AND position = ?',
        [match.tournoi_id, nextRound, nextPosition]
    );

    if (nextMatches.length === 0) {
        // Créer le match pour le tour suivant
        // Si position impaire, joueur1, sinon joueur2
        const joueur1Id = match.position % 2 === 1 ? gagnantId : null;
        const joueur2Id = match.position % 2 === 0 ? gagnantId : null;

        // Calculer l'horaire du match
        const baseHeure = '19:00:00';
        const horaire = calculateMatchTime(nextRound, nextPosition, baseHeure);

        console.log(`Creating new match for round ${nextRound}, position ${nextPosition}`);

        await db.insert('matchs', {
            tournoi_id: match.tournoi_id,
            round: nextRound,
            position: nextPosition,
            joueur1_id: joueur1Id,
            joueur2_id: joueur2Id,
            status: StatusMatch.EnAttente,
            horaire
        });
    } else {
        // Mettre à jour le joueur dans le match existant
        const nextMatch = nextMatches[0];

        // Update the next match with the winner from this match
        const updateData = match.position % 2 === 1
            ? { joueur1_id: gagnantId }
            : { joueur2_id: gagnantId };

        console.log(`Updating existing match ${nextMatch.id} with player ${gagnantId} in position ${match.position % 2 === 1 ? 'left' : 'right'}`);

        await db.update('matchs', nextMatch.id, updateData);

        // Si les deux joueurs sont maintenant définis, on peut activer ce match aussi
        const updatedMatch = await MatchModel.getById(nextMatch.id);
        if (updatedMatch && updatedMatch.joueur1_id && updatedMatch.joueur2_id && updatedMatch.status === StatusMatch.EnAttente) {
            // Le match peut démarrer automatiquement ou attendre une action manuelle du barman
            // Optionnel: await MatchModel.activateMatch(nextMatch.id);
        }
    }

    // Mettre à jour le round actuel du tournoi si nécessaire
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const [tournoi] = await db.customQuery(
        'SELECT * FROM tournois WHERE id = ?',
        [match.tournoi_id]
    );
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    if (tournoi && tournoi.round_actuel < nextRound) {
        await db.update('tournois', match.tournoi_id, {
            round_actuel: nextRound
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

export default MatchModel;