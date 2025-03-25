'use client';

import {useState, useEffect, useRef, Suspense} from 'react';
import {useSearchParams, useRouter} from 'next/navigation';
import {motion} from 'framer-motion';
import {Tournoi, Match, Joueur} from '@/models/types';

// Interface pour les matchs perdus et joueurs perdants
interface PerdantInfo {
    joueur: Joueur;
    match: Match;
}

// Component that uses useSearchParams
function RepechageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tournoiId = searchParams.get('tournoi');
    const matchId = searchParams.get('match');

    const [tournoi, setTournoi] = useState<Tournoi | null>(null);
    const [match, setMatch] = useState<Match | null>(null);
    const [perdants, setPerdants] = useState<PerdantInfo[]>([]);
    const [joueurs, setJoueurs] = useState<Record<number, Joueur>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // États pour l'animation de la roue
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotationAngle, setRotationAngle] = useState(0);
    const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number>(-1);
    const [showResult, setShowResult] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Charger les données initiales
    useEffect(() => {
        const fetchData = async () => {
            if (!tournoiId || !matchId) return;

            try {
                setIsLoading(true);

                // Charger les informations du tournoi
                const tournoiResponse = await fetch(`/api/tournois/${tournoiId}`);
                if (!tournoiResponse.ok) {
                    throw new Error('Erreur lors du chargement des informations du tournoi');
                }
                const tournoiData = await tournoiResponse.json();
                setTournoi(tournoiData.data.tournoi);

                // Dictionnaire des joueurs
                const joueursDict: Record<number, Joueur> = {};
                tournoiData.data.participants.forEach((joueur: Joueur) => {
                    joueursDict[joueur.id] = joueur;
                });
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                setJoueurs(joueursDict);

                // Charger le match spécifique
                const matchResponse = await fetch(`/api/matches/${matchId}`);
                if (!matchResponse.ok) {
                    throw new Error('Erreur lors du chargement du match');
                }
                const matchData = await matchResponse.json();
                setMatch(matchData.data);

                // Charger tous les matchs du tournoi pour trouver les perdants
                const matchesResponse = await fetch(`/api/tournois/${tournoiId}/matches`);
                if (!matchesResponse.ok) {
                    throw new Error('Erreur lors du chargement des matchs');
                }
                const allMatches = await matchesResponse.json();

                // Trouver les joueurs qui ont perdu leurs matchs
                const perdantsInfo: PerdantInfo[] = [];
                for (const m of allMatches.data) {
                    if (m.status === 'termine' && m.gagnant_id) {
                        if (m.joueur1_id && m.joueur1_id !== m.gagnant_id) {
                            // Le joueur 1 a perdu
                            perdantsInfo.push({
                                joueur: joueursDict[m.joueur1_id],
                                match: m
                            });
                        }
                        if (m.joueur2_id && m.joueur2_id !== m.gagnant_id) {
                            // Le joueur 2 a perdu
                            perdantsInfo.push({
                                joueur: joueursDict[m.joueur2_id],
                                match: m
                            });
                        }
                    }
                }

                setPerdants(perdantsInfo);

            } catch (err) {
                setError(err instanceof Error ? err.message : 'Une erreur est survenue');
            } finally {
                setIsLoading(false);
            }
        };

        // Créer l'élément audio
        audioRef.current = new Audio('/spinning-wheel.mp3');

        fetchData();

        // Cleanup
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, [tournoiId, matchId]);

    // Fonction pour faire tourner la roue
    const spinWheel = () => {
        if (isSpinning || perdants.length === 0) return;

        setIsSpinning(true);
        setShowResult(false);

        // Jouer le son
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(err => console.log('Audio playback failed', err));
        }

        // Choisir aléatoirement un joueur
        const winnerIndex = Math.floor(Math.random() * perdants.length);

        // Nous allons précalculer l'angle exact où la roue doit s'arrêter
        // Pour que le segment winnerIndex soit aligné avec la flèche (qui est à 0 degré)
        const numSegments = perdants.length;
        const segmentAngle = 360 / numSegments;

        // Calculer à quel angle le segment gagnant est aligné avec 0 degré (flèche)
        // Exemple: si le segment 2 est choisi et qu'il y a 8 segments, l'angle serait 2 * 45° = 90°
        // Mais nous devons tourner dans le sens inverse pour l'alignement
        // Donc 360° - (segment * segmentAngle) - offset pour centrer
        const offset = segmentAngle / 2; // Pour centrer au milieu du segment
        const segmentStartAngle = (winnerIndex * segmentAngle);

        // L'angle auquel on veut que la roue s'arrête:
        // Un nombre de tours complets (12) + l'angle pour aligner le segment gagnant
        // Note: on soustrait de 360 car la roue tourne dans le sens horaire, mais nos segments
        // sont indexés dans le sens trigonométrique
        const targetAngle = (360 * 12) + (360 - segmentStartAngle - offset);

        console.log(`Selected player index: ${winnerIndex}, segment angle: ${segmentAngle}, target angle: ${targetAngle}`);

        // Réinitialiser l'angle pour éviter des problèmes avec les rotations multiples
        setRotationAngle(0);

        // Lancer l'animation avec le nouvel angle cible
        setTimeout(() => {
            setRotationAngle(targetAngle);
            setSelectedPlayerIndex(winnerIndex);

            // Après la fin de l'animation, afficher les résultats
            setTimeout(() => {
                if (audioRef.current) {
                    audioRef.current.pause();
                }

                setIsSpinning(false);
                setShowResult(true);
            }, 5000); // Durée de l'animation
        }, 50);
    };

    const confirmRepechage = async () => {
        if (!match || selectedPlayerIndex === -1) return;

        const selectedPlayer = perdants[selectedPlayerIndex].joueur;
        const joueurARemplacerId = searchParams.get('joueur'); // Récupérer l'ID du joueur à remplacer

        try {
            setIsLoading(true);

            // Déterminer si c'est joueur1 ou joueur2 qui est à remplacer
            let updateData;

            if (joueurARemplacerId) {
                // Cas où on remplace un joueur spécifique (absent)
                const joueurId = parseInt(joueurARemplacerId);
                updateData = {
                    joueur1_id: match.joueur1_id === joueurId ? selectedPlayer.id : match.joueur1_id,
                    joueur2_id: match.joueur2_id === joueurId ? selectedPlayer.id : match.joueur2_id
                };
            } else {
                // Cas normal - repêchage classique
                updateData = {
                    joueur1_id: match.joueur1_id || selectedPlayer.id,
                    joueur2_id: match.joueur2_id || selectedPlayer.id
                };
            }

            // Mettre à jour le match
            const response = await fetch(`/api/matches/${match.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la mise à jour du match');
            }

            // Rediriger vers le bracket
            router.push(`/display/bracket?tournoi=${tournoiId}`);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setIsLoading(false);
        }
    };

    const goBackToBracket = () => {
        router.push(`/display/bracket?tournoi=${tournoiId}`);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-900">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
            </div>
        );
    }

    if (error || !tournoi) {
        return (
            <div className="container mx-auto px-4 py-16 text-center bg-gray-900 min-h-screen text-white">
                <div className="bg-red-800 text-white px-6 py-4 rounded-lg shadow-lg inline-block mb-6">
                    <p>{error || "Erreur lors du chargement des données"}</p>
                </div>
                <button
                    onClick={goBackToBracket}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md"
                >
                    Retour au bracket
                </button>
            </div>
        );
    }

    if (perdants.length === 0) {
        return (
            <div className="container mx-auto px-4 py-16 text-center bg-gray-900 min-h-screen text-white">
                <h1 className="text-3xl font-bold mb-6">Aucun joueur à repêcher</h1>
                <p className="mb-8">Il n&#39;y a pas de joueurs perdants disponibles pour le repêchage.</p>
                <button
                    onClick={goBackToBracket}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md"
                >
                    Retour au bracket
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white px-4 py-8">
            <h1 className="text-4xl font-bold mb-6 text-center">Roue du Repêchage</h1>
            <p className="text-xl mb-10 text-center text-gray-300">
                Tournez la roue pour sélectionner aléatoirement un joueur éliminé
            </p>

            <div className="w-full max-w-2xl mb-8">
                {/* Roue de fortune */}
                <div className="relative mx-auto" style={{width: '350px', height: '350px'}}>
                    {/* Marqueur/Flèche */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                        <div
                            className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[30px] border-l-transparent border-r-transparent border-t-red-600"></div>
                    </div>

                    {/* Roue */}
                    <div className="relative w-full h-full">
                        <motion.div
                            className="w-full h-full rounded-full overflow-hidden border-8 border-yellow-500 shadow-xl"
                            style={{
                                transformOrigin: 'center center',
                                position: 'absolute',
                                top: 0,
                                left: 0
                            }}
                            animate={{
                                rotate: rotationAngle
                            }}
                            transition={{
                                duration: 5,
                                ease: 'easeOut'
                            }}
                        >
                            <svg width="100%" height="100%" viewBox="0 0 350 350">
                                {/* Cercle de fond */}
                                <circle cx="175" cy="175" r="175" fill="#2D3748"/>

                                {/* Segments et textes */}
                                {perdants.map((perdant, index) => {
                                    const segmentAngle = 360 / perdants.length;
                                    const startAngle = index * segmentAngle;
                                    const endAngle = (index + 1) * segmentAngle;

                                    // Coordonnées pour le path du segment
                                    const startRad = (startAngle * Math.PI) / 180;
                                    const endRad = (endAngle * Math.PI) / 180;

                                    const x1 = 175 + 175 * Math.sin(startRad);
                                    const y1 = 175 - 175 * Math.cos(startRad);
                                    const x2 = 175 + 175 * Math.sin(endRad);
                                    const y2 = 175 - 175 * Math.cos(endRad);

                                    // Direction du grand arc (toujours 0 car moins de 180°)
                                    const largeArcFlag = 0;

                                    // Couleur en alternance
                                    const bgColor = index % 2 === 0 ? '#4A5568' : '#2D3748';

                                    // Angle du milieu du segment pour le texte
                                    const midAngle = ((startAngle + endAngle) / 2) * (Math.PI / 180);
                                    const textRadius = 125; // Distance du texte par rapport au centre

                                    // Position du texte
                                    const textX = 175 + textRadius * Math.sin(midAngle);
                                    const textY = 175 - textRadius * Math.cos(midAngle);

                                    // Orientation du texte (radiale)
                                    const textRotationAngle = (startAngle + endAngle) / 2;
                                    const textRotation = textRotationAngle > 90 && textRotationAngle < 270
                                        ? textRotationAngle + 180
                                        : textRotationAngle;

                                    return (
                                        <g key={index}>
                                            {/* Segment */}
                                            <path
                                                d={`M 175 175 L ${x1} ${y1} A 175 175 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                                                fill={selectedPlayerIndex === index && showResult ? '#6B21A8' : bgColor}
                                                stroke="#1A202C"
                                                strokeWidth="1"
                                            />

                                            {/* Ajout d'un numéro de segment pour debug */}
                                            <text
                                                x="175"
                                                y="175"
                                                textAnchor="middle"
                                                fill="white"
                                                fontSize="10"
                                                transform={`translate(${85 * Math.sin(midAngle)}, ${-85 * Math.cos(midAngle)})`}
                                            >
                                                {index}
                                            </text>

                                            {/* Nom du joueur */}
                                            <text
                                                x={textX}
                                                y={textY}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                                fill={selectedPlayerIndex === index && showResult ? '#FCD34D' : 'white'}
                                                fontWeight={selectedPlayerIndex === index && showResult ? 'bold' : 'normal'}
                                                fontSize="14"
                                                transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                                            >
                                                {perdant.joueur.prenom}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                        </motion.div>
                    </div>

                    {/* Enjoliveur central */}
                    <div
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-yellow-600 z-10 flex items-center justify-center shadow-md">
                        <div
                            className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center text-gray-900 font-bold">
                            SPIN
                        </div>
                    </div>
                </div>

                {/* Bouton pour faire tourner ou confirmer */}
                <div className="flex justify-center mt-8">
                    {!showResult ? (
                        <button
                            onClick={spinWheel}
                            disabled={isSpinning}
                            className={`px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg shadow-lg transition ${
                                isSpinning ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                            {isSpinning ? 'La roue tourne...' : 'Tourner la roue'}
                        </button>
                    ) : (
                        <div className="text-center">
                            <div className="mb-4 p-4 bg-purple-900 bg-opacity-50 rounded-lg">
                                <p className="text-lg mb-1">Joueur sélectionné:</p>
                                <p className="text-2xl font-bold text-yellow-300">
                                    {perdants[selectedPlayerIndex].joueur.prenom} {perdants[selectedPlayerIndex].joueur.nom}
                                </p>
                                {perdants[selectedPlayerIndex].joueur.surnom && (
                                    <p className="text-lg text-yellow-200">{perdants[selectedPlayerIndex].joueur.surnom}</p>
                                )}
                            </div>
                            <div className="flex space-x-4 justify-center">
                                <button
                                    onClick={confirmRepechage}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition"
                                >
                                    Confirmer
                                </button>
                                <button
                                    onClick={() => {
                                        setShowResult(false);
                                        setSelectedPlayerIndex(-1);
                                    }}
                                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition"
                                >
                                    Réessayer
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Liste des joueurs perdants disponibles */}
            <div className="w-full max-w-lg bg-gray-800 rounded-lg p-6 shadow-lg">
                <h2 className="text-xl font-semibold mb-4">Joueurs perdants disponibles ({perdants.length})</h2>
                <div className="max-h-60 overflow-y-auto pr-2">
                    <ul className="space-y-2">
                        {perdants.map((perdant, index) => (
                            <li
                                key={perdant.joueur.id}
                                className={`p-3 rounded-md flex justify-between items-center ${
                                    index === selectedPlayerIndex && showResult
                                        ? 'bg-purple-900 border border-yellow-500'
                                        : 'bg-gray-700'
                                }`}
                            >
                                <div>
                                    <div className="font-medium">
                                        {perdant.joueur.prenom} {perdant.joueur.nom}
                                    </div>
                                    {perdant.joueur.surnom && (
                                        <div className="text-sm text-gray-400">{perdant.joueur.surnom}</div>
                                    )}
                                </div>
                                <div className="text-xs text-gray-400">
                                    Round {perdant.match.round}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="text-center mt-8">
                <button
                    onClick={goBackToBracket}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
                >
                    Annuler et retourner au bracket
                </button>
            </div>
        </div>
    );
}

// Wrapper component with Suspense boundary
export default function RepechagePage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center h-screen bg-gray-900">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
                <p className="ml-4 text-white text-lg">Chargement de la roue de repêchage...</p>
            </div>
        }>
            <RepechageContent/>
        </Suspense>
    );
}