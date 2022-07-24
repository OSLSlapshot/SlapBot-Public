import { floor } from 'mathjs';

function padSides(str, aimLen) {
	str = str.toString();
	const strLen = str.length;
	const padSpaces = aimLen - strLen;
	let outStr = str.padStart(Math.floor(padSpaces/2) + strLen);
	outStr = outStr.padEnd(Math.ceil(padSpaces/2)+outStr.length);

    return outStr;
}

export default padSides;
