// PM2 process config (LLD: Deployment — backend PM2). Usage: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'vigno-api',
      script: 'src/index.js',
      instances: 'max', // cluster mode across CPU cores
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production', PORT: 4000 },
      max_memory_restart: '400M',
    },
  ],
}
