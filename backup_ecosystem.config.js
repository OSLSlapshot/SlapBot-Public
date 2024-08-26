module.exports = {
  apps : [{
	name: "dtb_backup",
    script: "./lib/scripts/database_backup.sh",
	instances: 1,
	cron_restart: '15 0 * * *',	//1015 AM AEST
	autorestart: false
  },
  {
	name: "img_backup",
    script: "./lib/scripts/img_backup.sh",
	instances: 1,
	cron_restart: '15 0 * * Tue',	//1015 AM AEST, every Tuesday
	autorestart: false
  }]
}
