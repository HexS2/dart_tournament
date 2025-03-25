import { NextRequest, NextResponse } from 'next/server';
import { MatchModel } from '@/models/match';

// GET /api/tournois/[id]/matches - Récupère les matchs d'un tournoi
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);

        if (isNaN(id)) {
            return NextResponse.json(
                { success: false, error: 'ID de tournoi invalide' },
                { status: 400 }
            );
        }

        // Récupérer les paramètres optionnels
        const { searchParams } = new URL(request.url);
        const round = searchParams.get('round');
        const status = searchParams.get('status');

        let matches;

        if (round) {
            // Filtrer par round
            matches = await MatchModel.getByRound(id, parseInt(round));
        } else if (status === 'en_cours') {
            // Filtrer par statut (en cours uniquement)
            matches = await MatchModel.getEnCours(id);
        } else {
            // Tous les matchs du tournoi
            matches = await MatchModel.getByTournoi(id);
        }

        return NextResponse.json({ success: true, data: matches });
    } catch (error) {
        console.error(`Erreur lors de la récupération des matchs du tournoi ${params.id}:`, error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Une erreur est survenue' },
            { status: 500 }
        );
    }
}