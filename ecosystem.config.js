module.exports = {
  apps: [
    {
      name: "charts-fluidpalette",
      script: "server.js",
      cwd: "./",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
