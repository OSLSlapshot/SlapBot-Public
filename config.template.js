const environments = {
    development: 'development',
    production: 'production'
};

const cfg = {
    discordToken: (removed),	//bot token
    environment: environments.production,
    server: {
        development: 'test',	//not used
        production: ''	//server name
    },
    cmdChannels: {
        development: ['test'],
		production: {
			liveCh: 'rebound-oce-live',
			modCh: 'rpugs-moderation',
			infoCh: 'rpugs-rules',
			updatesCh: 'rpugs-status',
			queueCh: 'rpugs-queues',
			commandsCh: 'rpugs-commands',
			tipsCh: 'general',
			otherCh: 'misc',
		}
    },
	queueStatusMsgId: null,	//Set to null to have the bot send a new message on start up- console will print the message ID, set to the message ID to edit the message in cmdChannels.queueCh on startup instead of sending a new message

	slapshotLiveTracker: {
		//channelId: '',	//unused- using cmdChannels.liveCh instead
		enable: true,
		msgId: null,	//Set to null to have the bot send a new message on start up- console will print the message ID, set to the message ID to edit the message in cmdChannels.queueCh on startup instead of sending a new message
		refreshTime: 6	//seconds
	},
	
	modes: [
		{
			modeName: 'Casual',
			designator: 'c',
			emoji: '3️⃣',
			//draftOrder: getDraftOrder(mode),
			numPlayers: 6,
			arenaName: 'Slapstadium'	//change to arenaNames and array in future
		},
		{
			modeName: 'Twos',
			designator: 't',
			emoji: '2️⃣',
			//draftOrder: getDraftOrder(mode),
			numPlayers: 4,
			arenaName: 'Slapstadium_Mini'
		},
		{
			modeName: 'Fours',
			designator: 'f',
			emoji: '4️⃣',
			//draftOrder: getDraftOrder(mode),
			numPlayers: 8,
			arenaName: 'Slapville_Jumbo'
		},
		{
			modeName: 'Scrims',
			designator: 's',
			emoji: '<:osl:724558511891021824>',
			numPlayers: 2,
			arenaName: 'Slapstadium'
		}
	],
	idleParams: {
		idleCheckerEnable: true,	//enable/disable idle check for queues
		idleThresholdmin: 30,	//0.0025 ; // Threshold for when to alert players they will be kicked for idling in units of minutes
		kickThresholdmin: 5,	//0.1 ; // Threshold for when to kick players for idling after they have been alerted in units of minutes
		checkPeriodmin: 5	//0.01 ; // Period for calling idle check function in units of minutes
	},
    trueskill: {	//starting ratings
        casualInitTS: {
            initialRating: 1500,
            initialSigma: 1.813 * 2
        },
        twosInitTS: {
            initialRating: 1500,
            initialSigma: 1.813 * 2
        },
		foursInitTS: {
            initialRating: 1500,
            initialSigma: 1.813 * 2
        }
    },
	checkinTime: 0.1,		//Time (in minutes) for checking in for rpugs match after queue has popped before match is cancelled
	rpugsSheet: {
		linkID: (removed),	//RPUGs Google sheet link/ID
		sheetNames: {
			leaguePlayers: 'League Player List',	//League Player list sheet name
			banPlayers: 'Ban List',	//Banned player list sheet name
			quoteList: 'Quote List',	//List of quotes sheet name
			tipList: 'Tip List',	//List of server tips
		}
	},
	autoTips: {
		autoTipsEnable: 0,	//0 or 1 ; 1 enables sending server tips to tipsCh with the period of the following parameter
		autoTipsPeriod: 0.5,	// Period for auto tips in tipsCh in units of minutes 
	},
	leagueConditions: {
		leagueEnable: 1,
		//leagueDatabaseSheet: (removed),
	},
	moderators: {
		commissioners: [],	//list of discord IDs, commissioners also count as admins
		admins: []
	}
};

export default cfg;