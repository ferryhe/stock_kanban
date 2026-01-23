module.exports = {
  apps: [
    {
      name: "stock-kanban-api",
      script: "dist/index.cjs",
      instances: 1,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "logs/api-error.log",
      out_file: "logs/api-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      max_memory_restart: "500M",
      max_restarts: 10,
      min_uptime: "10s",
      watch: false,
      ignore_watch: ["node_modules", "dist/public"],
      autorestart: true,
    },
  ],
};
