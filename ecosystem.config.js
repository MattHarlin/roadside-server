module.exports = {
  apps: [
    {
      name: "roadside-server",
      script: "authbind --deep node server.js",
      instances: 1,          // fork mode
      exec_mode: "fork",     // <-- add this line
      autorestart: true,
      watch: false,
      env: {
        PORT: 80,
        NODE_ENV: "production",
        MONGO_URI: "mongodb+srv://mattharlin56_db_user:<password>@admin.u4zdgvy.mongodb.net/?appName=admin"
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      merge_logs: true
    }
  ]
};
