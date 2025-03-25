import { NextRequest, NextResponse } from 'next/server';
import { JoueurModel } from '@/models/joueur';
import { NiveauJoueur } from '@/models/types';

// GET /api/joueurs/[id] - Récupère les détails d'un joueur spécifique
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);

        if (isNaN(id)) {
            return NextResponse.json(
                { success: false, error: 'ID de joueur invalide' },
                { status: 400 }
            );
        }

        const joueur = await JoueurModel.getById(id);

        if (!joueur) {
            return NextResponse.json(
                { success: false, error: 'Joueur introuvable' },
                { status: 404 }
            );
        }

        // Si un paramètre "stats" est présent, récupérer également les statistiques
        const { searchParams } = new URL(request.url);
        const includeStats = searchParams.get('stats') === 'true';

        if (includeStats) {
            const stats = await JoueurModel.getStats(id);
            return NextResponse.json({ success: true, data: stats });
        }

        return NextResponse.json({ success: true, data: joueur });
    } catch (error) {
        console.error(`Erreur lors de la récupération du joueur ${params.id}:`, error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Une erreur est survenue' },
            { status: 500 }
        );
    }
}

// PUT /api/joueurs/[id] - Met à jour un joueur
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);

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

        const body = await request.json();

        // Valider le niveau si fourni
        if (body.niveau && !Object.values(NiveauJoueur).includes(body.niveau)) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Le niveau doit être l'une des valeurs suivantes: ${Object.values(NiveauJoueur).join(', ')}`
                },
                { status: 400 }
            );
        }

        // Préparer les données à mettre à jour
        const updateData: Record<string, unknown> = {};

        if (body.nom !== undefined) updateData.nom = body.nom;
        if (body.prenom !== undefined) updateData.prenom = body.prenom;
        if (body.surnom !== undefined) updateData.surnom = body.surnom;
        if (body.niveau !== undefined) updateData.niveau = body.niveau;
        if (body.actif !== undefined) updateData.actif = body.actif;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { success: false, error: 'Aucune donnée valide à mettre à jour' },
                { status: 400 }
            );
        }

        await JoueurModel.update(id, updateData);

        // Récupérer le joueur mis à jour
        const updatedJoueur = await JoueurModel.getById(id);

        return NextResponse.json({ success: true, data: updatedJoueur });
    } catch (error) {
        console.error(`Erreur lors de la mise à jour du joueur ${params.id}:`, error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Une erreur est survenue' },
            { status: 500 }
        );
    }
}

// DELETE /api/joueurs/[id] - Désactive un joueur (ne supprime pas complètement)
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);

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

        // Par défaut, désactiver le joueur plutôt que de le supprimer
        const { searchParams } = new URL(request.url);
        const permanent = searchParams.get('permanent') === 'true';

        if (permanent) {
            // Suppression permanente (à utiliser avec précaution)
            await JoueurModel.delete(id);
            return NextResponse.json({ success: true, message: 'Joueur supprimé définitivement' });
        } else {
            // Désactivation (comportement par défaut)
            await JoueurModel.disable(id);
            return NextResponse.json({ success: true, message: 'Joueur désactivé' });
        }
    } catch (error) {
        console.error(`Erreur lors de la suppression du joueur ${params.id}:`, error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Une erreur est survenue' },
            { status: 500 }
        );
    }
}