const environments = {
    //development: 'development',
    production: 'production'
};

const cfg = {
    discordToken: (removed),	//bot token
    environment: environments.production,
    server: {
        production: ''	//server name
    },
	moderators: {
		commissioners: [],	//commissioners also count as admins
		admins: []
	},
	developerRoleId: '',	//for notifying the developer when errors occur
	streamers: [],
    cmdChannels: {				  
		production: {
			liveCh: 'rebound-oce-live',
			dailyShopCh: 'daily-shop',
			shopHistoryCh: 'daily-shop-history',
			previewSubCh: 'preview-submission',
			modCh: 'rpugs-moderation',
			infoCh: 'rpugs-rules',
			updatesCh: 'rpugs-status',
			queueCh: 'rpugs-queues',
			commandsCh: 'rpugs-chat',
			tipsCh: 'general',
			otherCh: 'misc',	
		}
    },
	rpugsSheet: {
		linkID: (removed),	//RPUGs Google sheet link/ID
		sheetNames: {
			selectList: 'Select Player List',	//Select Game Mode Player list sheet name
			leaguePlayers: 'League Player List',	//League Player list sheet name
			banPlayers: 'Ban List',	//Banned player list sheet name
			quoteList: 'Quote List',	//List of quotes sheet name
			tipList: 'Tip List',	//List of server tips
		}
	},
	
	//Test parameters
	createGameLobby: true,	//whether to automatically create match lobbies or not
	
	//End-of-season Roll Date
	nextRollDate: '1st of July 2024',
	
	//slapshot API
	slapshotAPI: {
		//url: 'https://staging.slapshot.gg',
		url: 'https://api.slapshot.gg',
		key: (removed),
	},
	
	//OCE Player Tracker control
	slapshotLiveTracker: {
		enable: true,
		msgId: null,	//Set to null to have the bot send a new message on start up- console will print the message ID
		refreshTime: 10	//seconds
	},
	
	//Shop Tracker control
	dailyShopTracker: {
		enable: true,
		msgId: null,	//Set to null to have the bot send a new message on start up- console will print the message ID
		shopperRoleId: ''
	},
	
	//Community invite lobby control
	inviteLobby: {
		enable: true
	},
	
	//OSL Tips control
	autoTips: {
		enable: true,	//0 or 1 ; 1 enables sending server tips to tipsCh with the period of the following parameter
		period: 3*60,	// Period for auto tips in tipsCh in units of minutes 
	},
	
	//Queue Interaction message control
	queueStatusMsgId: null,	//Set to null to have the bot send a new message on start up- console will print the message ID
	queueEnable: true,
	idleParams: {
		idleCheckerEnable: true,	//enable/disable idle check for queues
		idleThresholdmin: 30,	//0.0025 ; // Threshold for when to alert players they will be kicked for idling in units of minutes
		kickThresholdmin: 5,	//0.1 ; // Threshold for when to kick players for idling after they have been alerted in units of minutes
		checkPeriodmin: 5	//0.01 ; // Period for calling idle check function in units of minutes
	},
	checkInTime: 5,		//Time (in minutes) for checking in for rpugs match after queue has popped before match is cancelled
	
	//RPUGs modes control
	modes: [
		{
			enabled: true,
			modeName: 'Casual',
			designator: 'c',
			emoji: '3️⃣',
			//draftOrder: getDraftOrder(mode),
			numPlayers: 6,
			lobbySettings: {
				arenaName: 'Slapstadium',	//change to arenaNames and array in future
			},
			trueskill: {
				initialRating: 1500,
				initialSigma: 1.813 * 2
			},
			draft: {
				firstCaptain: 'r', //r - random, l - lower, h - higher
				order: 'snake', //snake is the only option for now
			}
		},
		{
			enabled: true,
			excludeFromRoll: true,
			modeName: 'Select',
			description: 'An exclusive gamemode for more experienced/higher level players. This gamemode is managed by Spar. To apply, please fill the Google form at https://forms.gle/2bvWxcPFwBztiBm49 and let Spar know that you have done so. Once approved or denied, you will be informed.',
			designator: 'sel',
			emoji: '🇸',
			//draftOrder: getDraftOrder(mode),
			numPlayers: 6,
			lobbySettings: {
				arenaName: 'Slapstadium',	//change to arenaNames and array in future
			},
			trueskill: {
				initialRating: 1500,
				initialSigma: 1.813 * 2
			},
			draft: {
				firstCaptain: 'r', //r - random, l - lower, h - higher
				order: 'snake', //snake is the only option for now
			}
		},
		{
			enabled: true,
			featured: true,
			modeName: 'Twos',
			designator: 't',
			emoji: '2️⃣',
			//draftOrder: getDraftOrder(mode),
			numPlayers: 4,
			lobbySettings: {
				arenaName: 'Slapstadium_Mini',
			},
			trueskill: {
				initialRating: 1500,
				initialSigma: 1.813 * 2
			},
			draft: {
				firstCaptain: 'l', //r - random, l - lower, h - higher
				order: 'snake', //snake is the only option for now
			}
		},
		{
			enabled: true,
			featured: true,
			modeName: 'Fours',
			designator: 'f',
			emoji: '4️⃣',
			//draftOrder: getDraftOrder(mode),
			numPlayers: 8,
			lobbySettings: {
				arenaName: 'Slapville_Jumbo',
			},
			trueskill: {
				initialRating: 1500,
				initialSigma: 1.813 * 2
			},
			draft: {
				firstCaptain: 'r', //r - random, l - lower, h - higher
				order: 'snake', //snake is the only option for now
			}
		},
		{
			enabled: true,
			featured: true,
			excludeFromRoll: true,
			modeName: 'Solo',
			designator: 'sl',
			emoji: '1️⃣',
			//draftOrder: getDraftOrder(mode),
			numPlayers: 2,
			lobbySettings: {
				arenaName: 'Slapstadium_Mini',
			},
			trueskill: {
				initialRating: 1500,
				initialSigma: 1.813 * 2
			}
		},
		{
			enabled: true,
			excludeFromRoll: true,
			modeName: 'Scrims',
			designator: 's',
			emoji: '<:osl:1115348694481510541>',
			numPlayers: 2,
			lobbySettings: {
				arenaName: 'Slapstadium',
			},
			trueskill: {
				initialRating: 1500,
				initialSigma: 1.813 * 2
			}
		},
		{
			enabled: true,
			featured: true,
			modeName: 'Fullhouse',
			designator: 'fh',
			emoji: '6️⃣',
			//draftOrder: getDraftOrder(mode),
			numPlayers: 12,
			lobbySettings: {
				arenaName: 'Slapstadium_XL',
			},
			trueskill: {
				initialRating: 1500,
				initialSigma: 1.813 * 2
			},
			draft: {
				firstCaptain: 'r', //r - random, l - lower, h - higher
				order: 'snake', //snake is the only option for now
			}
		},
		{
			enabled: true,
			featured: true,
			modeName: 'Dodgepuck',
			designator: 'd',
			emoji: '🇩',
			//draftOrder: getDraftOrder(mode),
			numPlayers: 6,
			lobbySettings: {
				arenaName: 'Obstacles',
				periodsOn: false,
				matchLength: 600,
				gamemode: 'dodgepuck'
			},
			trueskill: {
				initialRating: 1500,
				initialSigma: 1.813 * 2
			},
			draft: {
				firstCaptain: 'r', //r - random, l - lower, h - higher
				order: 'snake', //snake is the only option for now
			}
		},
		
	],
	retiredModes: [
		{
			//enabled: true,
			retired: true,
			modeName: 'Pro',
			designator: 'p',
			emoji: '🇵',
			//draftOrder: getDraftOrder(mode),
			numPlayers: 6,
			//arenaName: 'Slapstadium',	//change to arenaNames and array in future
			trueskill: {
				initialRating: 2500,
				initialSigma: 1.813
			},
			//draft: {
			//	firstCaptain: 'r', //r - random, l - lower, h - higher
			//	order: 'snake', //snake is the only option for now
			//}
		},
		{
			//enabled: true,
			retired: true,
			modeName: 'League',
			designator: 'l',
			emoji: '<:osl:1115348694481510541>',
			//draftOrder: getDraftOrder(mode),
			numPlayers: 6,
			//arenaName: 'Slapstadium',	//change to arenaNames and array in future
			trueskill: {
				initialRating: 1500,
				initialSigma: 1.813 * 2
		 
			},
			//draft: {
			//	firstCaptain: 'r', //r - random, l - lower, h - higher
			//	order: 'snake', //snake is the only option for now
			//}
		},
		{
			//enabled: false,
			retired: true,
			featured: true,
			modeName: 'Dodgechaos',
			designator: 'dc',
			emoji: '🇩',
			//draftOrder: getDraftOrder(mode),
			numPlayers: 12,
			lobbySettings: {
				arenaName: 'Obstacles_XL',
				periodsOn: false,
				matchLength: 600,
				gamemode: 'dodgepuck'
			},
			trueskill: {
				initialRating: 1500,
				initialSigma: 1.813 * 2
			},
			draft: {
				firstCaptain: 'r', //r - random, l - lower, h - higher
				order: 'snake', //snake is the only option for now
			}
		},
	],
			
  
};

export default cfg;