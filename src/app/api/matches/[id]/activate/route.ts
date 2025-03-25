import { NextRequest, NextResponse } from 'next/server';
import { MatchModel } from '@/models/match';

// POST /api/matches/[id]/activate - Active un match (le passe en état "en cours")
export async function POST(
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

        try {
            // Activer le match
            await MatchModel.activateMatch(id);

            // Récupérer le match mis à jour
            const match = await MatchModel.getById(id);

            return NextResponse.json({ success: true, data: match });
        } catch (err) {
            if (err instanceof Error) {
                return NextResponse.json(
                    { success: false, error: err.message },
                    { status: 400 }
                );
            }
            throw err;
        }
    } catch (error) {
        console.error(`Erreur lors de l'activation du match ${params.id}:`, error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Une erreur est survenue' },
            { status: 500 }
        );
    }
}