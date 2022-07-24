# OSL SlapBot

This is a Discord bot tailored to the [Oceanic Slapshot League (OSL) Discord server] (https://discord.gg/osl) that helps set up ranked pickup games (RPUGs). It is a competitive environment where all players are specially invited, and ratings are tracked.

This bot was adapted from [a bot designed specifically for the game Battlerite] (https://github.com/KennethWangDotDev/discord-inhouse-league). The original code has been revamped with the following changes:
* Changed the stats collection system and added additional stats, including devising a new file and data structure system for the stats
* Several code improvements, including major bug fixes, and code structural changes
* Added multiple new commands, including moderator commands (`adminreport`,`kick`,`cancel`) and user commands (all funzone commands,`active`,`stats`)
* Added Discord embeds (for aesthetics and user-friendliness) for all user interaction
* Tailored the drafting system to the OSL's needs
* Expanded the drafting system to handle 2v2 drafting and league-game scrims
* A system for interfacing with Google Sheets (for instance, server tips, player lists, banned players, etc)

## Installation

Before you can run this, you will need a [Discord bot application](https://discordapp.com/developers/applications/me).

Next, run:
```
npm install
runbot.bat
```

## How It Works

Type: `!register <YourUsername>` to be registered into the RPUGs database. Then type: `!queue join` to join the queue. Once there are enough people in the queue, the top two ranked players will draft their teams and the teams formed will play in a 3v3 or 2v2 private competitive match.

The drafting process is done in Direct Messages with the bot. Once the drafting is completed, all players are alerted with the information about the match.

When the match has been played and is fully completed, both captains must report the score with **!matchreport** to record the match. The ratings of each player are then updated using TrueSkill.


## Commands
(Below list is not a complete list as of 24/07/22)

Default commands:

* **!register** *< username >* - Registers the message sender into the league.
* **!leaderboard** - Prints the top players and their ratings.
* **!rating** *< username >* - Prints the rating of inputted player.
* **!queue join** - Joins the game queue.
* **!queue leave** - Leaves the game queue.
* **!matchreport** *< win / loss >* - Reports the result of the match.

Admin commands:

* **!listdraft** - Views the current ongoing drafts and matches.
* **!removedraft** *< draft index >* - Removes the selected drafts.
* **!kick** *< username >* - Removes the inputted player from the queue.


## Screenshots

(Will be added in future)

## Support
<a href='https://ko-fi.com/oslcorgo' target='_blank'><img height='35' style='border:0px;height:46px;' src='https://az743702.vo.msecnd.net/cdn/kofi1.png?v=0' border='0' alt='Support Me on Ko-fi' />

