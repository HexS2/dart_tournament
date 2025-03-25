import { NextRequest, NextResponse } from 'next/server';
import { MatchModel } from '@/models/match';

// PUT /api/matches/[id]/end - Termine un match et définit le gagnant
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);

        if (isNaN(id)) {
            return NextResponse.json(
                { success: false, error: 'ID de match invalide' },
                { status: 400 }
            );
        }

        const body = await request.json();

        // Valider les données requises
        if (body.gagnant_id === undefined) {
            return NextResponse.json(
                { success: false, error: 'L\'ID du joueur gagnant est requis' },
                { status: 400 }
            );
        }

        const gagnantId = parseInt(body.gagnant_id);

        if (isNaN(gagnantId)) {
            return NextResponse.json(
                { success: false, error: 'L\'ID du joueur gagnant doit être un nombre entier' },
                { status: 400 }
            );
        }

        try {
            // Terminer le match avec la nouvelle logique qui évite la récursion infinie
            await MatchModel.terminerMatch(id, gagnantId);

            // Récupérer le match mis à jour
            const match = await MatchModel.getById(id);

            return NextResponse.json({
                success: true,
                data: match,
                message: 'Match terminé avec succès'
            });
        } catch (err) {
            if (err instanceof Error) {
                // Gérer les erreurs spécifiques du modèle
                return NextResponse.json(
                    { success: false, error: err.message },
                    { status: 400 }
                );
            }
            throw err;
        }
    } catch (error) {
        console.error(`Erreur lors de la finalisation du match ${params.id}:`, error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Une erreur est survenue' },
            { status: 500 }
        );
    }
}