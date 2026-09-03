module.exports = {
  apps: [
    {
      name: 'next-app',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: '1', // Utilizes all available CPU cores
      // exec_mode: 'cluster', // Enables zero-downtime reloads and load balancing
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // HOSTNAME: '0.0.0.0' // Essential for standalone mode and reverse proxies
      }
    }
  ]
};
