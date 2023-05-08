import { rate, Rating } from "ts-trueskill";
import { updatePlayerRatingsQuery, updateTeamRatingsQuery } from "../queries";
import { logger } from "../";

async function updatePlayerRatings(match, teamA, teamB, winner, mode) {
	const previousRatingsA = [];
	const previousRatingsB = [];
	const ratingsChange = {};
	logger.log("info", "Updating player rankings...");

	// Setup previousRatings and ratingsChange
	if (mode === "scrims") {
		previousRatingsA.push(new Rating(teamA.teamRating / 100, teamA.teamSigma));
		ratingsChange[teamA.teamName] = {
			previousRating: teamA.teamRating,
			previousSigma: teamA.teamSigma,
		};
		previousRatingsB.push(new Rating(teamB.teamRating / 100, teamB.teamSigma));
		ratingsChange[teamB.teamName] = {
			previousRating: teamB.teamRating,
			previousSigma: teamB.teamSigma,
		};
	} else {
		for (const member of teamA) {
			if (mode === "twos") {
				previousRatingsA.push(
					new Rating(member.twosRating / 100, member.twosSigma)
				);
				ratingsChange[member.discordId] = {
					previousRating: member.twosRating,
					previousSigma: member.twosSigma,
				};
			} else if (mode === "fours") {
				previousRatingsA.push(
					new Rating(member.foursRating / 100, member.foursSigma)
				);
				ratingsChange[member.discordId] = {
					previousRating: member.foursRating,
					previousSigma: member.foursSigma,
				};
			} else {
				previousRatingsA.push(
					new Rating(member.casualRating / 100, member.casualSigma)
				);
				ratingsChange[member.discordId] = {
					previousRating: member.casualRating,
					previousSigma: member.casualSigma,
				};
			}
		}
		for (const member of teamB) {
			if (mode === "twos") {
				previousRatingsB.push(
					new Rating(member.twosRating / 100, member.twosSigma)
				);
				ratingsChange[member.discordId] = {
					previousRating: member.twosRating,
					previousSigma: member.twosSigma,
				};
			} else if (mode === "fours") {
				previousRatingsB.push(
					new Rating(member.foursRating / 100, member.foursSigma)
				);
				ratingsChange[member.discordId] = {
					previousRating: member.foursRating,
					previousSigma: member.foursSigma,
				};
			} else {
				previousRatingsB.push(
					new Rating(member.casualRating / 100, member.casualSigma)
				);
				ratingsChange[member.discordId] = {
					previousRating: member.casualRating,
					previousSigma: member.casualSigma,
				};
			}
		}
	}

	// Setup new ratings
	let newRatingsA;
	let newRatingsB;
	if (winner === "teamA") {
		[newRatingsA, newRatingsB] = rate([previousRatingsA, previousRatingsB]);
	} else {
		[newRatingsB, newRatingsA] = rate([previousRatingsB, previousRatingsA]);
	}

	// Format the ratings in a way to easily push to queries
	const preparedRatings = [];
	if (mode === "scrims") {
		const objA = {};
		const newRatingA = Math.ceil(newRatingsA[0].mu * 100);
		ratingsChange[teamA.teamName].newRating = newRatingA;
		ratingsChange[teamA.teamName].newSigma = newRatingsA[0].sigma;

		objA.teamName = teamA.teamName;
		objA.rating = newRatingA;
		objA.sigma = newRatingsA[0].sigma;
		preparedRatings.push(objA);

		const objB = {};
		const newRatingB = Math.ceil(newRatingsB[0].mu * 100);
		ratingsChange[teamB.teamName].newRating = newRatingB;
		ratingsChange[teamB.teamName].newSigma = newRatingsB[0].sigma;

		objB.teamName = teamB.teamName;
		objB.rating = newRatingB;
		objB.sigma = newRatingsB[0].sigma;
		preparedRatings.push(objB);

		const response = await updateTeamRatingsQuery(match, preparedRatings);
	} else {
		for (const [index, member] of teamA.entries()) {
			const obj = {};
			const newRating = Math.ceil(newRatingsA[index].mu * 100);

			ratingsChange[member.discordId].newRating = newRating;
			ratingsChange[member.discordId].newSigma = newRatingsA[index].sigma;

			obj.discordId = member.discordId;
			obj.rating = newRating;
			obj.sigma = newRatingsA[index].sigma;
			preparedRatings.push(obj);
		}
		for (const [index, member] of teamB.entries()) {
			const obj = {};
			const newRating = Math.ceil(newRatingsB[index].mu * 100);

			ratingsChange[member.discordId].newRating = newRating;
			ratingsChange[member.discordId].newSigma = newRatingsB[index].sigma;

			obj.discordId = member.discordId;
			obj.rating = newRating;
			obj.sigma = newRatingsB[index].sigma;
			preparedRatings.push(obj);
		}
		const response = await updatePlayerRatingsQuery(
			match,
			preparedRatings,
			mode
		);
	}
	return ratingsChange;
}

export default updatePlayerRatings;
