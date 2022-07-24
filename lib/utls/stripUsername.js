function stripUsername(username) {
	const strippedUsername = username.replace(/[_\.-]+/g,'');
    return strippedUsername;
}

export default stripUsername;
