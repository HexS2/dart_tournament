# Étape 1 : Build
FROM node:20-alpine AS builder

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json package-lock.json ./

# Installer les dépendances
RUN npm ci

# Copier le reste du code source
COPY . .

# Construire l'application
RUN npm run build

# Étape 2 : Exécution
FROM node:20-alpine AS runner

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers nécessaires de l'étape de build
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts ./next.config.ts

# Installer uniquement les dépendances de production
RUN npm ci --only=production

# Définir les variables d'environnement
ENV NODE_ENV=production

# Exposer le port
EXPOSE 3000

# Commande pour lancer l'application
CMD ["npm", "run", "start"]