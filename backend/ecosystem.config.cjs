module.exports = {
  apps: [{
    name: 'dentalclinic-backend',
    cwd: __dirname,
    script: 'src/server.ts',
    interpreter: '/usr/bin/node',
    exec_mode: 'fork',
    instances: 1,
    watch: false,
    env_production: { NODE_ENV: 'production' },
  }],
}
