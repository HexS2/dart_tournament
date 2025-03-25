import { NextRequest, NextResponse } from 'next/server';
import { MatchModel } from '@/models/match';

// GET /api/matches - Récupère les matchs (avec filtres optionnels)
export async function GET(request: NextRequest) {
    try {
        // Récupérer les paramètres de requête
        const { searchParams } = new URL(request.url);
        const joueurId = searchParams.get('joueur');
        const status = searchParams.get('status');

        let matches;

        if (joueurId) {
            // Filtrer par joueur
            matches = await MatchModel.getByJoueur(parseInt(joueurId));
        } else if (status === 'en_cours') {
            // Filtrer par statut (en cours uniquement)
            matches = await MatchModel.getEnCours();
        } else {
            // Sans filtre, cette route n'est pas appropriée (trop de données)
            return NextResponse.json(
                { success: false, error: 'Veuillez spécifier un filtre (joueur, status)' },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, data: matches });
    } catch (error) {
        console.error('Erreur lors de la récupération des matchs:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Une erreur est survenue' },
            { status: 500 }
        );
    }
}