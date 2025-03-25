// src/models/joueur.ts
import db from '../lib/db';
import { Joueur, JoueurInput } from './types';

// Interface pour les résultats de comptage
interface CountResult {
    count: number;
}

export const JoueurModel = {
    // Récupérer tous les joueurs
    getAll: async (): Promise<Joueur[]> => {
        return db.getAll<Joueur[]>('joueurs');
    },

    // Récupérer un joueur par ID
    getById: async (id: number): Promise<Joueur | undefined> => {
        const results = await db.getById<Joueur[]>('joueurs', id);
        return results[0];
    },

    // Créer un nouveau joueur
    create: async (joueur: JoueurInput) => {
        const result = await db.insert('joueurs', joueur);
        return result.insertId;
    },

    // Mettre à jour un joueur
    update: async (id: number, joueur: Partial<JoueurInput>) => {
        return db.update('joueurs', id, joueur);
    },

    // Supprimer un joueur (désactiver)
    disable: async (id: number) => {
        return db.update('joueurs', id, { actif: false });
    },

    // Réactiver un joueur
    enable: async (id: number) => {
        return db.update('joueurs', id, { actif: true });
    },

    // Supprimer définitivement un joueur
    delete: async (id: number) => {
        return db.remove('joueurs', id);
    },

    // Rechercher des joueurs
    search: async (term: string): Promise<Joueur[]> => {
        return db.customQuery<Joueur[]>(
            `SELECT * FROM joueurs
             WHERE nom LIKE ? OR prenom LIKE ? OR surnom LIKE ?
             ORDER BY nom, prenom`,
            [`%${term}%`, `%${term}%`, `%${term}%`]
        );
    },

    // Joueurs actifs uniquement
    getActifs: async (): Promise<Joueur[]> => {
        return db.customQuery<Joueur[]>(
            'SELECT * FROM joueurs WHERE actif = TRUE ORDER BY nom, prenom'
        );
    },

    // Récupérer les meilleurs joueurs (par nombre de victoires)
    getTopJoueurs: async (limit: number = 10): Promise<Joueur[]> => {
        return db.customQuery<Joueur[]>(
            'SELECT * FROM joueurs WHERE actif = TRUE ORDER BY victoires DESC, participations DESC LIMIT ?',
            [limit]
        );
    },

    // Mettre à jour les statistiques de participation
    incrementParticipations: async (joueurId: number): Promise<void> => {
        await db.customQuery(
            'UPDATE joueurs SET participations = participations + 1 WHERE id = ?',
            [joueurId]
        );
    },

    // Mettre à jour les statistiques de victoire
    incrementVictoires: async (joueurId: number): Promise<void> => {
        await db.customQuery(
            'UPDATE joueurs SET victoires = victoires + 1 WHERE id = ?',
            [joueurId]
        );
    },

    // Obtenir les statistiques d'un joueur
    getStats: async (joueurId: number) => {
        const [joueur] = await db.customQuery<Joueur[]>(
            'SELECT * FROM joueurs WHERE id = ?',
            [joueurId]
        );

        if (!joueur) {
            return null;
        }

        // Obtenir le nombre de matchs joués
        const [matchCount] = await db.customQuery<CountResult[]>(
            `SELECT COUNT(*) as count FROM matchs
             WHERE (joueur1_id = ? OR joueur2_id = ?) AND status = 'termine'`,
            [joueurId, joueurId]
        );

        // Obtenir le nombre de matchs gagnés
        const [winCount] = await db.customQuery<CountResult[]>(
            'SELECT COUNT(*) as count FROM matchs WHERE gagnant_id = ? AND status = "termine"',
            [joueurId]
        );

        return {
            joueur,
            matchsJoues: matchCount?.count || 0,
            matchsGagnes: winCount?.count || 0,
            ratio: matchCount?.count ? (winCount?.count || 0) / matchCount.count : 0,
            participations: joueur.participations,
            victoires: joueur.victoires,
        };
    }
};

export default JoueurModel;