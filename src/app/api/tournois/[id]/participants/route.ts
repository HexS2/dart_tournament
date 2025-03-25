import { NextRequest, NextResponse } from 'next/server';
import { TournoiModel } from '@/models/tournoi';
import { StatusTournoi } from '@/models/types';

// GET /api/tournois/[id]/participants - Récupère les participants d'un tournoi
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

        // Vérifier que le tournoi existe
        const tournoi = await TournoiModel.getById(id);
        if (!tournoi) {
            return NextResponse.json(
                { success: false, error: 'Tournoi introuvable' },
                { status: 404 }
            );
        }

        const participants = await TournoiModel.getParticipants(id);

        return NextResponse.json({ success: true, data: participants });
    } catch (error) {
        console.error(`Erreur lors de la récupération des participants du tournoi ${params.id}:`, error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Une erreur est survenue' },
            { status: 500 }
        );
    }
}

// POST /api/tournois/[id]/participants - Ajoute un participant au tournoi
export async function POST(
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

        // Vérifier que le tournoi existe et qu'il est en état "planifié"
        const tournoi = await TournoiModel.getById(id);
        if (!tournoi) {
            return NextResponse.json(
                { success: false, error: 'Tournoi introuvable' },
                { status: 404 }
            );
        }

        if (tournoi.status !== StatusTournoi.Planifie) {
            return NextResponse.json(
                { success: false, error: 'Impossible d\'ajouter des participants à un tournoi déjà démarré ou terminé' },
                { status: 400 }
            );
        }

        const body = await request.json();

        if (!body.joueur_id) {
            return NextResponse.json(
                { success: false, error: 'ID du joueur requis' },
                { status: 400 }
            );
        }

        const joueurId = parseInt(body.joueur_id);

        if (isNaN(joueurId)) {
            return NextResponse.json(
                { success: false, error: 'ID de joueur invalide' },
                { status: 400 }
            );
        }

        try {
            const participantId = await TournoiModel.addParticipant(id, joueurId);
            return NextResponse.json(
                { success: true, data: { id: participantId } },
                { status: 201 }
            );
        } catch (err) {
            if (err instanceof Error && err.message.includes('déjà inscrit')) {
                return NextResponse.json(
                    { success: false, error: err.message },
                    { status: 409 } // Conflict
                );
            }
            throw err;
        }
    } catch (error) {
        console.error(`Erreur lors de l'ajout d'un participant au tournoi ${params.id}:`, error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Une erreur est survenue' },
            { status: 500 }
        );
    }
}

// DELETE /api/tournois/[id]/participants/[joueurId] - Retire un participant du tournoi
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string, joueurId: string } }
) {
    try {
        const tournoiId = parseInt(params.id);
        const joueurId = parseInt(params.joueurId);

        if (isNaN(tournoiId) || isNaN(joueurId)) {
            return NextResponse.json(
                { success: false, error: 'IDs invalides' },
                { status: 400 }
            );
        }

        // Vérifier que le tournoi existe et qu'il est en état "planifié"
        const tournoi = await TournoiModel.getById(tournoiId);
        if (!tournoi) {
            return NextResponse.json(
                { success: false, error: 'Tournoi introuvable' },
                { status: 404 }
            );
        }

        if (tournoi.status !== StatusTournoi.Planifie) {
            return NextResponse.json(
                { success: false, error: 'Impossible de retirer des participants d\'un tournoi déjà démarré ou terminé' },
                { status: 400 }
            );
        }

        await TournoiModel.removeParticipant(tournoiId, joueurId);

        return NextResponse.json({ success: true, message: 'Participant retiré avec succès' });
    } catch (error) {
        console.error(`Erreur lors du retrait d'un participant du tournoi:`, error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Une erreur est survenue' },
            { status: 500 }
        );
    }
}