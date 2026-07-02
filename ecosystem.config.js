module.exports = {
  apps: [{
    name: 'somnus',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/somnus',
    env_file: '/var/www/somnus/.env',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
