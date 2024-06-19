
function sortBy(params) {
	/*
	const colNames = {
		Casual: {
			Rating: 'CasualRating',
			Wins: 'NumCasualMatchesWon',
			Losses: 'NumCasualMatchesLost'
		},
		Twos: {
			Rating: 'TwosRating',
			Wins: 'NumTwosMatchesWon',
			Losses: 'NumTwosMatchesLost'
		},
		Fours: {
			Rating: 'FoursRating',
			Wins: 'NumFoursMatchesWon',
			Losses: 'NumFoursMatchesLost'
		},
		Scrims: {
			Rating: 'TeamRating',
			Wins: 'NumTeamMatchesWon',
			Losses: 'NumTeamMatchesLost'
		},
	};
	*/
	//const colName = params.mode === 'scrims' ? 'team' : params.mode;
	
	switch (params.sortBy) {
		case 'Rating':
		case 'Wins':
		case 'Losses':
			if (params.sortOrder === 'descending') {
				return function(a,b) {
					return b.ratingStats[`${params.mode}`][`${params.sortBy.toLowerCase()}`] - a.ratingStats[`${params.mode}`][`${params.sortBy.toLowerCase()}`];
				};
			}
			else {
				return function(b,a) {
					return b.ratingStats[`${params.mode}`][`${params.sortBy.toLowerCase()}`] - a.ratingStats[`${params.mode}`][`${params.sortBy.toLowerCase()}`];
				};
			}
			break;
		case 'Matches':
			if (params.sortOrder === 'descending') {
				return function(a,b) {
					return (b.ratingStats[`${params.mode}`][`wins`] + b.ratingStats[`${params.mode}`][`losses`]) - (a.ratingStats[`${params.mode}`][`wins`] + a.ratingStats[`${params.mode}`][`losses`]);
				};
			}
			else {
				return function(b,a) {
					return (b.ratingStats[`${params.mode}`][`wins`] + b.ratingStats[`${params.mode}`][`losses`]) - (a.ratingStats[`${params.mode}`][`wins`] + a.ratingStats[`${params.mode}`][`losses`]);
				};
			}
			break;
	}
}

function pieSortBy(team,stat) {
	return function(a,b) {
		return b.stats[team][stat] - a.stats[team][stat];
	};
}
/*
function sortByRatings(a, b) {
	if (a.casualRating > b.casualRating) {
		return -1;
	}
	if (a.casualRating < b.casualRating) {
		return 1;
	}
	return 0;
}

function sortByRatingsTwos(a, b) {
	if (a.twosRating > b.twosRating) {
		return -1;
	}
	if (a.twosRating < b.twosRating) {
		return 1;
	}
	return 0;
}

function sortByRatingsFours(a, b) {
	if (a.foursRating > b.foursRating) {
		return -1;
	}
	if (a.foursRating < b.foursRating) {
		return 1;
	}
	return 0;
}

function sortByRatingsScrims(a, b) {
	if (a.teamRating > b.teamRating) {
		return -1;
	}
	if (a.teamRating < b.teamRating) {
		return 1;
	}
	return 0;
}
*/
export {
	sortBy,
	pieSortBy,
	//sortByRatingsTwos,
	//sortByRatingsScrims,
	//sortByRatingsFours,
};
