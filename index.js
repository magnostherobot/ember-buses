const DAY_START = dayjs().toISOString();
const DAY_END = dayjs().endOf("day").toISOString();

const QUOTES_ENDPOINT = `https://api.ember.to/v1/quotes/?origin=13&destination=42&departure_date_from=${DAY_START}&departure_date_to=${DAY_END}`;

function err(...args) {
	throw new Error(...args);
}

function todo(description = "Unimplemented feature") {
	throw new Error(`TODO: ${description}`);
}

const $ = (...args) => document.getElementById(...args);

async function get(url) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(response);
	return response.json();
}

function getTripID() {
	return new URLSearchParams(document.location.search).get("trip");
}

function createLegLink(leg) {
	const text = document.createTextNode(
		`${leg.origin.detailed_name} to ${leg.destination.detailed_name}`,
	);
	const p = document.createElement("p");
	const link = document.createElement("a");
	link.href = `?trip=${leg.trip_uid}`;
	link.appendChild(text);
	p.appendChild(link);
	return p;
}

async function showTripSelection() {
	const quotes = await get(QUOTES_ENDPOINT);
	const div = $("main");

	for (const quote of quotes.quotes) {
		console.log(quote);
		for (const leg of quote.legs) {
			console.log(leg);
			console.log(leg.trip_uid);

			div.appendChild(createLegLink(leg));
		}
	}
}

async function showTripInfo(tripID) {
	const data = await get(`https://api.ember.to/v1/trips/${tripID}/`);
	console.log(data);
	console.log(data.route.map((stop) => stop.location.name).join("\n"));
}

async function main() {
	const tripID = getTripID();

	if (tripID == null) {
		showTripSelection();
	} else {
		showTripInfo(tripID);
	}
}

main();
