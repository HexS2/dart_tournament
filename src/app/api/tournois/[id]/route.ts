import { NextRequest, NextResponse } from 'next/server';
import { TournoiModel } from '@/models/tournoi';

// GET /api/tournois/[id – Récupère les détails d'un tournoi spécifique
export async function GET(
    request: NextRequest,
    context: { params: { id: string } }
) {
    try {
        const id = parseInt(context.params.id);

        if (isNaN(id)) {
            return NextResponse.json(
                { success: false, error: 'ID de tournoi invalide' },
                { status: 400 }
            );
        }

        // Récupérer les détails complets du tournoi (avec participants, matchs, etc.)
        const data = await TournoiModel.getDetailsTournoi(id);

        if (!data || !data.tournoi) {
            return NextResponse.json(
                { success: false, error: 'Tournoi introuvable' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error(`Erreur lors de la récupération du tournoi ${context.params.id}:`, error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Une erreur est survenue' },
            { status: 500 }
        );
    }
}

// PUT /api/tournois/[id] - Met à jour un tournoi
export async function PUT(
    request: NextRequest,
    context: { params: { id: string } }
) {
    try {
        const id = parseInt(context.params.id);

        if (isNaN(id)) {
            return NextResponse.json(
                { success: false, error: 'ID de tournoi invalide' },
                { status: 400 }
            );
        }

        // Vérifier que le tournoi existe
        const tournoi = await TournoiModel.getById(id);
        if (!tournoi) {
            return NextResponse.json(
                { success: false, error: 'Tournoi introuvable' },
                { status: 404 }
            );
        }

        const body = await request.json();

        // Ne permettre que certains champs à mettre à jour
        const updateData: Record<string, unknown> = {};

        if (body.nom) updateData.nom = body.nom;
        if (body.date_tournoi) updateData.date_tournoi = body.date_tournoi;
        if (body.format) updateData.format = body.format;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { success: false, error: 'Aucune donnée valide à mettre à jour' },
                { status: 400 }
            );
        }

        await TournoiModel.update(id, updateData);

        // Récupérer le tournoi mis à jour
        const updatedTournoi = await TournoiModel.getById(id);

        return NextResponse.json({ success: true, data: updatedTournoi });
    } catch (error) {
        console.error(`Erreur lors de la mise à jour du tournoi ${context.params.id}:`, error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Une erreur est survenue' },
            { status: 500 }
        );
    }
}

// DELETE /api/tournois/[id] - Supprime un tournoi
export async function DELETE(
    request: NextRequest,
    context: { params: { id: string } }
) {
    try {
        const id = parseInt(context.params.id);

        if (isNaN(id)) {
            return NextResponse.json(
                { success: false, error: 'ID de tournoi invalide' },
                { status: 400 }
            );
        }

        // Vérifier que le tournoi existe
        const tournoi = await TournoiModel.getById(id);
        if (!tournoi) {
            return NextResponse.json(
                { success: false, error: 'Tournoi introuvable' },
                { status: 404 }
            );
        }

        await TournoiModel.delete(id);

        return NextResponse.json({ success: true, message: 'Tournoi supprimé avec succès' });
    } catch (error) {
        console.error(`Erreur lors de la suppression du tournoi ${context.params.id}:`, error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Une erreur est survenue' },
            { status: 500 }
        );
    }
}