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
		previousRatingsA.push(new Rating(teamA.ratingStats.rating / 100, teamA.ratingStats.sigma));
		ratingsChange[teamA.teamId] = {
			previousRating: teamA.ratingStats.rating,
			previousSigma: teamA.ratingStats.sigma,
		};
		previousRatingsB.push(new Rating(teamB.ratingStats.rating / 100, teamB.ratingStats.sigma));
		ratingsChange[teamB.teamId] = {
			previousRating: teamB.ratingStats.rating,
			previousSigma: teamB.ratingStats.sigma,
		};
	}
	else {
		for (const member of teamA) {
			previousRatingsA.push(
				new Rating(member.ratingStats[`${mode}`].rating / 100, member.ratingStats[`${mode}`].sigma)
			);
			ratingsChange[member.playerId] = {
				previousRating: member.ratingStats[`${mode}`].rating,
				previousSigma: member.ratingStats[`${mode}`].sigma,
			};
		}
		for (const member of teamB) {
			previousRatingsB.push(
				new Rating(member.ratingStats[`${mode}`].rating / 100, member.ratingStats[`${mode}`].sigma)
			);
			ratingsChange[member.playerId] = {
				previousRating: member.ratingStats[`${mode}`].rating,
				previousSigma: member.ratingStats[`${mode}`].sigma,
			};
		}
	}

	// Setup new ratings
	let newRatingsA;
	let newRatingsB;
	if (winner === "teamA") {
		[newRatingsA, newRatingsB] = rate([previousRatingsA, previousRatingsB]);
	}
	else {
		[newRatingsB, newRatingsA] = rate([previousRatingsB, previousRatingsA]);
	}

	// Format the ratings in a way to easily push to queries
	const preparedRatings = [];
	if (mode === "scrims") {
		const objA = {};
		const newRatingA = Math.ceil(newRatingsA[0].mu * 100);
		ratingsChange[teamA.teamId].newRating = newRatingA;
		ratingsChange[teamA.teamId].newSigma = newRatingsA[0].sigma;

		objA.playerId = teamA.teamId;
		objA.rating = newRatingA;
		objA.sigma = newRatingsA[0].sigma;
		preparedRatings.push(objA);

		const objB = {};
		const newRatingB = Math.ceil(newRatingsB[0].mu * 100);
		ratingsChange[teamB.teamId].newRating = newRatingB;
		ratingsChange[teamB.teamId].newSigma = newRatingsB[0].sigma;

		objB.playerId = teamB.teamId;
		objB.rating = newRatingB;
		objB.sigma = newRatingsB[0].sigma;
		preparedRatings.push(objB);

		//const response = await updateTeamRatingsQuery(match, preparedRatings);
	}
	else {
		for (const [index, member] of teamA.entries()) {
			const obj = {};
			const newRating = Math.ceil(newRatingsA[index].mu * 100);

			ratingsChange[member.playerId].newRating = newRating;
			ratingsChange[member.playerId].newSigma = newRatingsA[index].sigma;

			obj.playerId = member.playerId;
			obj.rating = newRating;
			obj.sigma = newRatingsA[index].sigma;
			preparedRatings.push(obj);
		}
		for (const [index, member] of teamB.entries()) {
			const obj = {};
			const newRating = Math.ceil(newRatingsB[index].mu * 100);

			ratingsChange[member.playerId].newRating = newRating;
			ratingsChange[member.playerId].newSigma = newRatingsB[index].sigma;

			obj.playerId = member.playerId;
			obj.rating = newRating;
			obj.sigma = newRatingsB[index].sigma;
			preparedRatings.push(obj);
		}
		
	}
	const response = await updatePlayerRatingsQuery(
		match,
		preparedRatings,
		mode
	);
	
	return ratingsChange;
}

export default updatePlayerRatings;
