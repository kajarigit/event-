module.exports = {
  apps: [
    {
      name: 'event-api',
      script: './src/server.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      
      // Environment
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },

      // Auto restart configuration
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Memory management
      max_memory_restart: '1G',
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      merge_logs: true,
      
      // Process management
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      
      // Monitoring
      instance_var: 'INSTANCE_ID',
      
      // Advanced features
      vizion: false, // Disable git metadata
      automation: false,
      treekill: true,
      
      // Health check
      wait_ready: true,
      
      // Cron restart (optional - restart every day at 3 AM)
      cron_restart: '0 3 * * *',
    },
    
    // Email queue worker (separate process)
    {
      name: 'email-worker',
      script: './src/workers/emailWorker.js',
      instances: 2, // 2 workers for email processing
      exec_mode: 'cluster',
      
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },

      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      
      error_file: './logs/email-worker-error.log',
      out_file: './logs/email-worker-out.log',
      merge_logs: true,
    },
  ],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:username/repo.git',
      path: '/var/www/event-management',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': '',
      'post-setup': 'npm install && pm2 start ecosystem.config.js --env production',
    },
    
    staging: {
      user: 'deploy',
      host: 'staging-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:username/repo.git',
      path: '/var/www/event-management-staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging',
    },
  },
};
