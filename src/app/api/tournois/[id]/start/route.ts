// src/app/api/tournois/[id]/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { TournoiModel } from '@/models/tournoi';

// POST /api/tournois/[id]/start - Démarre un tournoi
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    // Stocker l'ID dès le début pour l'utiliser dans la gestion des erreurs
    const tournamentId = params.id;

    try {
        const id = parseInt(tournamentId);

        if (isNaN(id)) {
            return NextResponse.json(
                { success: false, error: 'ID de tournoi invalide' },
                { status: 400 }
            );
        }

        // Vérifier si le tournoi peut démarrer
        const { canStart, message } = await TournoiModel.canStart(id);

        if (!canStart) {
            return NextResponse.json(
                { success: false, error: message || 'Le tournoi ne peut pas être démarré' },
                { status: 400 }
            );
        }

        // Démarrer le tournoi
        await TournoiModel.demarrerTournoi(id);

        // Récupérer le tournoi mis à jour
        const tournoi = await TournoiModel.getById(id);

        return NextResponse.json({ success: true, data: { tournoi } });
    } catch (error) {
        console.error(`Erreur lors du démarrage du tournoi ${tournamentId}:`, error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Une erreur est survenue' },
            { status: 500 }
        );
    }
}