'use client';

import { useState, FormEvent } from 'react';
import { FormatTournoi } from '@/models/types';

interface TournamentFormProps {
    onSubmit: (data: TournamentFormData) => Promise<void>;
    isLoading?: boolean;
}

export interface TournamentFormData {
    nom: string;
    date_tournoi: string;
    format: FormatTournoi;
}

const TournamentForm = ({ onSubmit, isLoading = false }: TournamentFormProps) => {
    const [formData, setFormData] = useState<TournamentFormData>({
        nom: '',
        date_tournoi: new Date().toISOString().split('T')[0], // Format YYYY-MM-DD
        format: FormatTournoi.SimpleElimination
    });

    const [error, setError] = useState<string>('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            await onSubmit(formData);

            // Reset form after successful submission
            setFormData({
                nom: '',
                date_tournoi: new Date().toISOString().split('T')[0],
                format: FormatTournoi.SimpleElimination
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Créer un nouveau tournoi</h2>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-1">
                        Nom du tournoi
                    </label>
                    <input
                        type="text"
                        id="nom"
                        name="nom"
                        value={formData.nom}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Tournoi du Lundi"
                    />
                </div>

                <div className="mb-4">
                    <label htmlFor="date_tournoi" className="block text-sm font-medium text-gray-700 mb-1">
                        Date du tournoi
                    </label>
                    <input
                        type="date"
                        id="date_tournoi"
                        name="date_tournoi"
                        value={formData.date_tournoi}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="mb-6">
                    <label htmlFor="format" className="block text-sm font-medium text-gray-700 mb-1">
                        Format du tournoi
                    </label>
                    <select
                        id="format"
                        name="format"
                        value={formData.format}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value={FormatTournoi.SimpleElimination}>Élimination simple</option>
                        <option value={FormatTournoi.DoubleElimination}>Élimination double</option>
                        <option value={FormatTournoi.Poules}>Poules</option>
                    </select>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isLoading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                >
                    {isLoading ? 'Création en cours...' : 'Créer le tournoi'}
                </button>
            </form>
        </div>
    );
};

export default TournamentForm;