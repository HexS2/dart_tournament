import Link from 'next/link';

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="bg-blue-700 text-white shadow-md">
                <div className="container mx-auto px-4 py-6">
                    <h1 className="text-3xl font-bold">Tournoi de Fléchettes</h1>
                    <p className="mt-2 text-blue-100">Système de gestion des tournois pour votre bar</p>
                </div>
            </header>

            {/* Main content */}
            <main className="flex-grow flex items-center justify-center">
                <div className="container mx-auto px-4 py-16 text-center">
                    <h2 className="text-4xl font-bold mb-8">Bienvenue dans votre application de tournoi</h2>
                    <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
                        Gérez facilement vos tournois de fléchettes, suivez les matchs en temps réel, et affichez les résultats sur grand écran.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-6">
                        <Link
                            href="/admin"
                            className="bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold py-4 px-8 rounded-lg shadow-lg transition-colors"
                        >
                            Mode Administrateur
                        </Link>
                        <Link
                            href="/display"
                            className="bg-green-600 hover:bg-green-700 text-white text-lg font-bold py-4 px-8 rounded-lg shadow-lg transition-colors"
                        >
                            Mode Affichage
                        </Link>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-gray-100 border-t border-gray-200 py-8">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-gray-600">
                        Système de Tournoi de Fléchettes &copy; {new Date().getFullYear()}
                    </p>
                </div>
            </footer>
        </div>
    );
}