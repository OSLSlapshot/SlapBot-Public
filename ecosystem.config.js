module.exports = {
  apps : [{
    name: "runbot",
    script: "runbot.sh",
	instances: 1,
	cron_restart: '0 18 * * *',
	min_uptime: 30000,	//milliseconds, i.e.30s
	max_restarts: 10
  }]
}
