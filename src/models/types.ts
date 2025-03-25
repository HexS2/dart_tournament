// src/models/types.ts - Types communs
import { RowDataPacket } from 'mysql2';

// Énumérations
export enum NiveauJoueur {
    Debutant = 'Débutant',
    Amateur = 'Amateur',
    Intermediaire = 'Intermédiaire',
    SemiPro = 'Semi-pro',
    Professionnel = 'Professionnel'
}

export enum FormatTournoi {
    SimpleElimination = 'simple_elimination',
    DoubleElimination = 'double_elimination',
    Poules = 'poules'
}

export enum StatusTournoi {
    Planifie = 'planifie',
    EnCours = 'en_cours',
    Termine = 'termine'
}

export enum StatusMatch {
    EnAttente = 'en_attente',
    EnCours = 'en_cours',
    Termine = 'termine'
}

// Interfaces pour chaque table
export interface Joueur extends RowDataPacket {
    id: number;
    nom: string;
    prenom: string;
    surnom: string | null;
    niveau: NiveauJoueur;
    participations: number;
    victoires: number;
    date_creation: Date;
    date_modification: Date;
    actif: boolean;
}

export interface Tournoi extends RowDataPacket {
    id: number;
    nom: string;
    date_tournoi: Date;
    format: FormatTournoi;
    status: StatusTournoi;
    round_actuel: number;
    champion_id: number | null;
    date_creation: Date;
    date_modification: Date;
}

export interface ParticipantTournoi extends RowDataPacket {
    id: number;
    tournoi_id: number;
    joueur_id: number;
    position_tirage: number | null;
    date_inscription: Date;
}

export interface Match extends RowDataPacket {
    id: number;
    tournoi_id: number;
    round: number;
    position: number;
    joueur1_id: number | null;
    joueur2_id: number | null;
    score_joueur1: number;
    score_joueur2: number;
    gagnant_id: number | null;
    status: StatusMatch;
    horaire: string; // Format TIME en SQL
    date_creation: Date;
    date_modification: Date;
}

export interface HistoriqueScore extends RowDataPacket {
    id: number;
    match_id: number;
    joueur_id: number;
    score: number;
    timestamp: Date;
}

export interface Config extends RowDataPacket {
    cle: string;
    valeur: string;
    description: string | null;
    date_modification: Date;
}

// Types pour les données d'insertion (sans les champs générés automatiquement)
export type JoueurInput = Omit<Joueur, 'id' | 'date_creation' | 'date_modification' | 'participations' | 'victoires'> &
    { participations?: number, victoires?: number };

export type TournoiInput = Omit<Tournoi, 'id' | 'date_creation' | 'date_modification'>;

export type MatchInput = Omit<Match, 'id' | 'date_creation' | 'date_modification'>;

export type ParticipantTournoiInput = Omit<ParticipantTournoi, 'id' | 'date_inscription'>;

export type HistoriqueScoreInput = Omit<HistoriqueScore, 'id' | 'timestamp'>;

export type ConfigInput = Omit<Config, 'date_modification'>;