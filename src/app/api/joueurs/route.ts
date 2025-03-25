import { NextRequest, NextResponse } from 'next/server';
import { JoueurModel } from '@/models/joueur';
import { NiveauJoueur } from '@/models/types';

// GET /api/joueurs - Récupère tous les joueurs ou filtre par différents critères
export async function GET(request: NextRequest) {
    try {
        // Récupérer les paramètres de requête
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const search = searchParams.get('search');
        const actif = searchParams.get('actif');

        let data;

        if (id) {
            // Récupérer un joueur spécifique par ID
            const joueur = await JoueurModel.getById(parseInt(id));
            data = joueur ? [joueur] : [];
        } else if (search) {
            // Rechercher des joueurs par nom, prénom ou surnom
            data = await JoueurModel.search(search);
        } else if (actif === 'true') {
            // Récupérer uniquement les joueurs actifs
            data = await JoueurModel.getActifs();
        } else {
            // Récupérer tous les joueurs
            data = await JoueurModel.getAll();
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Erreur lors de la récupération des joueurs:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Une erreur est survenue' },
            { status: 500 }
        );
    }
}

// POST /api/joueurs - Crée un nouveau joueur
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Valider les données requises
        if (!body.nom || !body.prenom) {
            return NextResponse.json(
                { success: false, error: 'Le nom et le prénom sont requis' },
                { status: 400 }
            );
        }

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

        // Créer le joueur
        const joueurData = {
            nom: body.nom,
            prenom: body.prenom,
            surnom: body.surnom || null,
            niveau: body.niveau || NiveauJoueur.Amateur,
            actif: body.actif !== false
        };

        const id = await JoueurModel.create(joueurData);

        // Récupérer le joueur créé pour le retourner
        const joueur = await JoueurModel.getById(id);

        return NextResponse.json(
            { success: true, data: { id, joueur } },
            { status: 201 }
        );
    } catch (error) {
        console.error('Erreur lors de la création du joueur:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Une erreur est survenue' },
            { status: 500 }
        );
    }
}