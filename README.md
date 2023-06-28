# OSL SlapBot

This is a Discord bot tailored to the [Oceanic Slapshot League (OSL) Discord server](https://discord.gg/osl) that helps set up ranked pickup games (RPUGs). It is a competitive environment where all players are specially invited, and ratings are tracked.

This bot was adapted from [a bot designed specifically for the game Battlerite](https://github.com/KennethWangDotDev/discord-inhouse-league). The original code has been revamped with the following changes:
* Changed the stats collection system and added additional stats, including devising a new file and data structure system for the stats
* Several code improvements, including major bug fixes, code structural changes, and updates to support the latest versions of DiscordJS
* Added multiple new commands, including moderator commands (`adminreport`,`kick`,`cancel`) and user commands (all funzone commands,`active`,`stats`)
* Added more detailed statistics (min/max ratings, streaks, etc) for the current season and career (i.e. all seasons) accessible via commands, including graphs for tracking rating, and player rating distribution
* Added interactive embeds using the new DiscordJS interaction components (e.g. buttons and drop-down list menus), including reducing joining queues in separate channels to a single channel with buttons for various queue-related actions for users and moderators and leaderboard sorting (for rating, matches, wins, losses in ascending/descending order)
* Added Discord embeds and graphics (for aesthetics and user-friendliness) for all user interaction
* Tailored the drafting system to the OSL's needs
* Expanded the drafting system to handle 2v2 and 4v4 drafting, and league-game scrims
* A system for interfacing with Google Sheets (for instance, priority-weighted server tips, player lists, banned players, etc)
* A system for conducting a player roll with odds based on total number of matches played

## Contents

[Installation](https://github.com/OSLSlapshot/SlapBot-Public#installation)
[How It Works](https://github.com/OSLSlapshot/SlapBot-Public#how-it-works)
[Commands](https://github.com/OSLSlapshot/SlapBot-Public#commands)
[Screenshots](https://github.com/OSLSlapshot/SlapBot-Public#screenshots)
[Support](https://github.com/OSLSlapshot/SlapBot-Public#support)

## Installation

Before you can run this, you will need a [Discord bot application](https://discordapp.com/developers/applications/me).

Next, run:
```
npm install
runbot.bat
```

## How It Works

Type: `!register <YourUsername>` to be registered into the RPUGs database. Then use the buttons in the queue channel (e.g. #rpugs-queue) to join/leave the corresponding queues. Once there are enough people in the queue, the top two ranked players will draft their teams and the teams formed will play in a 2v2, 3v3 or 4v4 private competitive match.

The drafting process is conducted in Direct Messages with the bot. Once the drafting is completed, all players are alerted with the information for the match.

When the match has been played and is fully completed, both captains must report the result using the buttons in the queue channel to record the match. The ratings of each player are then updated using TrueSkill.


## Commands
(As of 28/06/23)

Information:
* **!help** - Displays info about how to register & play rpugs.
* **!subscribe info** - Displays info about subscriptions.
* **!commands** *<category (optional)>* - Displays the bot commands.
* **!servertip** - Displays a random server tip.
* **!about** - General bot information, acknowledgements and bot developer support link.

RPUGs:
* **!register** *<username>* - Registers the player into the RPUGs Database.
* **!subscribe** - Gives you the "rpugs" role which people can @ to alert players of games.
* **!unsubscribe**- Removes the "rpugs" role.

Statistics:
* **!seasonsummary** - Show the current season summary statistics.
* **!rating** *<username (optional)>* - Displays the stats for the input player
* **!ratingcareer** *<username (optional)>* - Shows the career stats of the input player.
* **!versus** *<username>* - Shows the current season stats for matches you have played in with the input player.
* **!versuscareer** *<username>* - Shows the career stats for matches you have played in with the input player.
* **!leaderboard** *<start position (optional)>* - Displays the top rated players. Different modes can be selected, and the board may also be sorted in terms of number of matches/wins/losses in ascending/descending order.
* **!playerlist** *<start position (optional)>* - Displays the list of players registered for RPUGs.
* **!teamlist** *<start position (optional)>* - Displays the list of teams registered for RPUGs.

Matches:
* **!active** - Shows a list of current active matches.
* **!draft** *<number>* - Drafts the input player to the captain's team.
* **!randomdraft** - Drafts a randomly-selected player to the captain's team.

Admin Commands:
* **!cancel** *<index>* - Cancels the specified match.
* **!listdraft** - DMs the current ongoing drafts and matches.
* **!adminreport** *<index>* *<a | b>* - Admin command for reporting match, where the <a | b> argument indicates the winning team.
* **!seasonroll** - Rolls a player with odds determined from a table based on number of matches played.
* **!softreset** - Commissioner command for soft-resetting the player database where all player stats are reset to the starting rating with no matches played.
* **!refreshlist** *<league/l | ban/b | servertip/st>* - Import and refresh the specified list from the configured Google Sheet.

Funzone Commands:
* **!slap** - Replies with "shot"
* **!toss** - Flips a coin
* **!dice** - Rolls a dice
* **!roll** - Returns a number from 0-100
* **!draw** - Returns a playing card
* **!quote** - Returns a famous quote or a quote by an influential figure

## Screenshots

Queue:
![Queue](/thumbnails/screenshots/queue.png)

Leaderboard:
![Leaderboard](/thumbnails/screenshots/leaderboard.png)

Live Player Tracker:
![Live](/thumbnails/screenshots/live.png)

Drafting:
![Drafting](/thumbnails/screenshots/drafting.png)

Statistics:
![Rating](/thumbnails/screenshots/rating.png)

## Support
<a href='https://ko-fi.com/oslcorgo' target='_blank'><img height='35' style='border:0px;height:46px;' src='https://az743702.vo.msecnd.net/cdn/kofi1.png?v=0' border='0' alt='Support Me on Ko-fi' />

