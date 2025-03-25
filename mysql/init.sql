-- Tournament database initialization
CREATE TABLE IF NOT EXISTS `config` (
                                        `cle` varchar(100) NOT NULL,
    `valeur` text NOT NULL,
    `description` text,
    `date_modification` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`cle`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `joueurs` (
                                         `id` int NOT NULL AUTO_INCREMENT,
                                         `nom` varchar(100) NOT NULL,
    `prenom` varchar(100) NOT NULL,
    `surnom` varchar(100) DEFAULT NULL,
    `niveau` enum('Débutant','Amateur','Intermédiaire','Semi-pro','Professionnel') DEFAULT 'Amateur',
    `participations` int DEFAULT '0',
    `victoires` int DEFAULT '0',
    `date_creation` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    `date_modification` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `actif` tinyint(1) DEFAULT '1',
    PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `tournois` (
                                          `id` int NOT NULL AUTO_INCREMENT,
                                          `nom` varchar(150) NOT NULL,
    `date_tournoi` date NOT NULL,
    `format` enum('simple_elimination','double_elimination','poules') DEFAULT 'simple_elimination',
    `status` enum('planifie','en_cours','termine') DEFAULT 'planifie',
    `round_actuel` int DEFAULT '0',
    `champion_id` int DEFAULT NULL,
    `date_creation` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    `date_modification` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `total_rounds` int DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `champion_id` (`champion_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `participants_tournoi` (
                                                      `id` int NOT NULL AUTO_INCREMENT,
                                                      `tournoi_id` int NOT NULL,
                                                      `joueur_id` int NOT NULL,
                                                      `position_tirage` int DEFAULT NULL,
                                                      `date_inscription` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                                                      PRIMARY KEY (`id`),
    UNIQUE KEY `tournoi_id` (`tournoi_id`,`joueur_id`),
    KEY `joueur_id` (`joueur_id`),
    KEY `idx_participants_tournoi` (`tournoi_id`,`joueur_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `matchs` (
                                        `id` int NOT NULL AUTO_INCREMENT,
                                        `tournoi_id` int NOT NULL,
                                        `round` int NOT NULL,
                                        `position` int NOT NULL,
                                        `joueur1_id` int DEFAULT NULL,
                                        `joueur2_id` int DEFAULT NULL,
                                        `score_joueur1` int DEFAULT '0',
                                        `score_joueur2` int DEFAULT '0',
                                        `gagnant_id` int DEFAULT NULL,
                                        `status` enum('en_attente','en_cours','termine') DEFAULT 'en_attente',
    `horaire` time DEFAULT NULL,
    `date_creation` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    `date_modification` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `joueur1_id` (`joueur1_id`),
    KEY `joueur2_id` (`joueur2_id`),
    KEY `gagnant_id` (`gagnant_id`),
    KEY `idx_matchs_tournoi` (`tournoi_id`),
    KEY `idx_matchs_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `historique_scores` (
                                                   `id` int NOT NULL AUTO_INCREMENT,
                                                   `match_id` int NOT NULL,
                                                   `joueur_id` int NOT NULL,
                                                   `score` int NOT NULL,
                                                   `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                                                   PRIMARY KEY (`id`),
    KEY `match_id` (`match_id`),
    KEY `joueur_id` (`joueur_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;