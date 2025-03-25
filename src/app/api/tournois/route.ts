import { NextRequest, NextResponse } from 'next/server';
import { TournoiModel } from '@/models/tournoi';
import { FormatTournoi, StatusTournoi } from '@/models/types';

// GET /api/tournois - Récupère tous les tournois
export async function GET(request: NextRequest) {
    try {
        // Récupérer les paramètres de requête (filtres optionnels)
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        let data;
        if (status === 'en_cours') {
            // Récupérer uniquement le tournoi en cours
            data = await TournoiModel.getEnCours();
            return NextResponse.json({ success: true, data: data ? [data] : [] });
        } else if (status === 'a_venir') {
            // Récupérer les tournois à venir
            data = await TournoiModel.getAVenir();
        } else {
            // Récupérer tous les tournois
            data = await TournoiModel.getAll();
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Erreur lors de la récupération des tournois:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Une erreur est survenue' },
            { status: 500 }
        );
    }
}

// POST /api/tournois - Crée un nouveau tournoi
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Valider les données requises
        if (!body.nom || !body.date_tournoi) {
            return NextResponse.json(
                { success: false, error: 'Le nom et la date du tournoi sont requis' },
                { status: 400 }
            );
        }

        // Créer le tournoi avec les valeurs par défaut si nécessaire
        const tournoiData = {
            nom: body.nom,
            date_tournoi: body.date_tournoi,
            format: body.format || FormatTournoi.SimpleElimination,
            status: StatusTournoi.Planifie,
            round_actuel: 0,
            champion_id: null
        };

        const id = await TournoiModel.create(tournoiData);

        // Récupérer le tournoi créé pour le retourner
        const tournoi = await TournoiModel.getById(id);

        return NextResponse.json(
            { success: true, data: { id, tournoi } },
            { status: 201 }
        );
    } catch (error) {
        console.error('Erreur lors de la création du tournoi:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Une erreur est survenue' },
            { status: 500 }
        );
    }
}