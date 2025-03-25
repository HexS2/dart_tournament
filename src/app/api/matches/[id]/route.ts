import { NextRequest, NextResponse } from 'next/server';
import { MatchModel } from '@/models/match';

// GET /api/matches/[id] - Récupère les détails d'un match spécifique
export async function GET(
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

        // Récupérer les détails du match (avec informations des joueurs)
        const matchDetails = await MatchModel.getMatchDetails(id);

        if (!matchDetails) {
            return NextResponse.json(
                { success: false, error: 'Match introuvable' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: matchDetails });
    } catch (error) {
        console.error(`Erreur lors de la récupération du match ${params.id}:`, error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Une erreur est survenue' },
            { status: 500 }
        );
    }
}

// PUT /api/matches/[id] - Met à jour un match (pour le repêchage)
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

        // Vérifier que le match existe
        const match = await MatchModel.getById(id);
        if (!match) {
            return NextResponse.json(
                { success: false, error: 'Match introuvable' },
                { status: 404 }
            );
        }

        const body = await request.json();

        // Valider les données requises pour le repêchage
        if (body.joueur1_id === undefined && body.joueur2_id === undefined) {
            return NextResponse.json(
                { success: false, error: 'Aucune donnée valide à mettre à jour' },
                { status: 400 }
            );
        }

        // Préparer les données à mettre à jour
        const updateData: Record<string, unknown> = {};

        if (body.joueur1_id !== undefined) updateData.joueur1_id = body.joueur1_id;
        if (body.joueur2_id !== undefined) updateData.joueur2_id = body.joueur2_id;

        // Activer automatiquement le match si les deux joueurs sont définis
        if (
            (body.joueur1_id || match.joueur1_id) &&
            (body.joueur2_id || match.joueur2_id) &&
            match.status === 'en_attente'
        ) {
            updateData.status = 'en_cours';
        }

        await MatchModel.update(id, updateData);

        // Récupérer le match mis à jour
        const updatedMatch = await MatchModel.getById(id);

        return NextResponse.json({ success: true, data: updatedMatch });
    } catch (error) {
        console.error(`Erreur lors de la mise à jour du match ${params.id}:`, error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Une erreur est survenue' },
            { status: 500 }
        );
    }
}