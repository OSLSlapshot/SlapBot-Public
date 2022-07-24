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

function sortByRatingsScrims(a, b) {
    if (a.teamRating > b.teamRating) {
        return -1;
    }
    if (a.teamRating < b.teamRating) {
        return 1;
    }
    return 0;
}

export { sortByRatings, sortByRatingsTwos, sortByRatingsScrims };
