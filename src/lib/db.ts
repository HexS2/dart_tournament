// src/lib/db.ts
import mysql, { PoolOptions, ResultSetHeader } from 'mysql2/promise';

// Type pour les options de requête
interface QueryOptions {
    query: string;
    values?: unknown[];
}

// Type pour représenter les données à insérer ou mettre à jour
type TableData = Record<string, string | number | boolean | null | undefined>;

// Création d'un pool de connexions MySQL
const poolOptions: PoolOptions = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'tournoi_flechettes',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(poolOptions);

// Fonction d'exécution de requête générique sans contrainte RowDataPacket
export async function executeQuery<T = any>({ query, values = [] }: QueryOptions): Promise<T> {
    try {
        const [results] = await pool.execute(query, values);
        return results as T;
    } catch (error) {
        console.error('Erreur lors de l\'exécution de la requête SQL:', error);
        throw new Error(error instanceof Error ? error.message : 'Erreur SQL inconnue');
    }
}

// Fonction pour récupérer tous les enregistrements d'une table
export async function getAll<T = any>(table: string): Promise<T> {
    return executeQuery<T>({
        query: `SELECT * FROM ${table}`
    });
}

// Fonction pour récupérer un enregistrement par ID
export async function getById<T = any>(table: string, id: number): Promise<T> {
    return executeQuery<T>({
        query: `SELECT * FROM ${table} WHERE id = ?`,
        values: [id]
    });
}

// Fonction pour insérer un enregistrement
export async function insert(table: string, data: TableData): Promise<ResultSetHeader> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');

    const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
        values
    );
    return result;
}

// Fonction pour mettre à jour un enregistrement
export async function update(table: string, id: number | string, data: TableData): Promise<ResultSetHeader> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(key => `${key} = ?`).join(', ');

    const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE ${table} SET ${setClause} WHERE ${typeof id === 'string' ? 'cle' : 'id'} = ?`,
        [...values, id]
    );
    return result;
}

// Fonction pour supprimer un enregistrement
export async function remove(table: string, id: number | string): Promise<ResultSetHeader> {
    const idField = typeof id === 'string' ? 'cle' : 'id';

    const [result] = await pool.execute<ResultSetHeader>(
        `DELETE FROM ${table} WHERE ${idField} = ?`,
        [id]
    );
    return result;
}

// Fonction pour les requêtes personnalisées plus complexes
export async function customQuery<T = never>(query: string, values: unknown[] = []): Promise<T> {
    return executeQuery<T>({ query, values });
}

// Exportation par défaut pour faciliter l'importation
export default {
    executeQuery,
    getAll,
    getById,
    insert,
    update,
    remove,
    customQuery
};