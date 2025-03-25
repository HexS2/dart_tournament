import { NextRequest, NextResponse } from 'next/server';
import { MatchModel } from '@/models/match';

// PUT /api/matches/[id]/score - Met à jour le score d'un match
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
        if (body.score_joueur1 === undefined || body.score_joueur2 === undefined) {
            return NextResponse.json(
                { success: false, error: 'Les scores des deux joueurs sont requis' },
                { status: 400 }
            );
        }

        const scoreJoueur1 = parseInt(body.score_joueur1);
        const scoreJoueur2 = parseInt(body.score_joueur2);

        if (isNaN(scoreJoueur1) || isNaN(scoreJoueur2) || scoreJoueur1 < 0 || scoreJoueur2 < 0) {
            return NextResponse.json(
                { success: false, error: 'Les scores doivent être des nombres entiers positifs' },
                { status: 400 }
            );
        }

        try {
            await MatchModel.updateScore(id, scoreJoueur1, scoreJoueur2);

            // Récupérer le match mis à jour
            const match = await MatchModel.getById(id);

            return NextResponse.json({ success: true, data: match });
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
        console.error(`Erreur lors de la mise à jour du score du match ${params.id}:`, error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Une erreur est survenue' },
            { status: 500 }
        );
    }
}