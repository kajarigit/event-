// PM2 Ecosystem Configuration File
// Used for production deployment on EC2

module.exports = {
  apps: [
    {
      name: 'event-backend',
      script: './src/server.js',
      cwd: '/var/www/event-app/backend',
      instances: 2, // Use 2 instances for load balancing (or 'max' for all CPUs)
      exec_mode: 'cluster',
      autorestart: true,
      watch: false, // Set to true for development
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],

  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-ec2-public-ip',
      ref: 'origin/main',
      repo: 'git@github.com:username/repo.git',
      path: '/var/www/event-app',
      'post-deploy': 'cd backend && npm install && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production',
      },
    },
  },
};
