import { NextRequest, NextResponse } from 'next/server';
import { JoueurModel } from '@/models/joueur';

// POST /api/joueurs/[id]/enable - Réactive un joueur précédemment désactivé
export async function POST(
    request: NextRequest,
    context: { params: { id: string } }
) {
    try {
        const id = parseInt(context.params.id);

        if (isNaN(id)) {
            return NextResponse.json(
                { success: false, error: 'ID de joueur invalide' },
                { status: 400 }
            );
        }

        // Vérifier que le joueur existe
        const joueur = await JoueurModel.getById(id);
        if (!joueur) {
            return NextResponse.json(
                { success: false, error: 'Joueur introuvable' },
                { status: 404 }
            );
        }

        if (joueur.actif) {
            return NextResponse.json(
                { success: false, error: 'Ce joueur est déjà actif' },
                { status: 400 }
            );
        }

        await JoueurModel.enable(id);

        // Récupérer le joueur mis à jour
        const updatedJoueur = await JoueurModel.getById(id);

        return NextResponse.json({ success: true, data: updatedJoueur });
    } catch (error) {
        console.error(`Erreur lors de la réactivation du joueur ${context.params.id}:`, error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Une erreur est survenue' },
            { status: 500 }
        );
    }
}