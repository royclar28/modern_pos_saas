module.exports = {
    apps: [
        {
            name: 'merx-pos-api',
            script: 'pnpm',
            args: 'run dev',
            cwd: './apps/api',
            interpreter: 'none', // Importante para que use pnpm directamente
            instances: 1,
            autorestart: true,
            watch: false, // En producción local mejor false para evitar reinicios infinitos por logs
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'development', // O 'production' cuando limpies los logs
                PORT: 3333
            },
        },
    ],
};