
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
	const colName = params.mode === 'scrims' ? 'team' : params.mode;
	
	switch (params.sortBy) {
		case 'Rating':
		case 'Wins':
		case 'Losses':
			if (params.sortOrder === 'descending') {
				return function(a,b) {
					return b[`${colName}${params.sortBy}`] - a[`${colName}${params.sortBy}`];
				};
			}
			else {
				return function(b,a) {
					return b[`${colName}${params.sortBy}`] - a[`${colName}${params.sortBy}`];
				};
			}
			break;
		case 'Matches':
			if (params.sortOrder === 'descending') {
				return function(a,b) {
					return (b[`${colName}Wins`] + b[`${colName}Losses`]) - (a[`${colName}Wins`] + a[`${colName}Losses`]);
				};
			}
			else {
				return function(b,a) {
					return (b[`${colName}Wins`] + b[`${colName}Losses`]) - (a[`${colName}Wins`] + a[`${colName}Losses`]);
				};
			}
			break;
	}
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
	//sortByRatingsTwos,
	//sortByRatingsScrims,
	//sortByRatingsFours,
};
