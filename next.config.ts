/** @type {import('next').NextConfig} */
import dotenv from 'dotenv';
dotenv.config();

const nextConfig = {
    typescript: {
        // Change this to true to ignore TypeScript errors during build
        ignoreBuildErrors: true
    },
    // Add this to ignore ESLint errors during build
    eslint: {
        ignoreDuringBuilds: true
    },
    env: {
        // Environment variables
        MYSQL_HOST: process.env.MYSQL_HOST,
        MYSQL_USER: process.env.MYSQL_USER,
        MYSQL_DATABASE: process.env.MYSQL_DATABASE
    }
};

export default nextConfig;