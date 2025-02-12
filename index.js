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

async function get(url, params) {
	const paramStr = params ? `?${new URLSearchParams(params)}` : "";
	const response = await fetch(`${url}${paramStr}`);
	if (!response.ok) throw new Error(response);
	return response.json();
}

function getTripID() {
	return new URLSearchParams(document.location.search).get("trip");
}

function createLegLink(leg) {
	const time = dayjs(leg.departure.scheduled).format("HH:mm");
	const text = document.createTextNode(
		`${time} ${leg.origin.name} to ${leg.destination.name}`,
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
		for (const leg of quote.legs) {
			div.appendChild(createLegLink(leg));
		}
	}
}

function formatDate(date) {
	return dayjs(date).format("HH:mm");
}

function div(content = [], classes = []) {
	const result = document.createElement("div");
	content.forEach((element) => result.appendChild(element));
	result.classList.add(...classes);
	return result;
}

function divText(text, classes) {
	return div([document.createTextNode(text)], classes);
}

function stopInfo(stop) {
	const op = (x, cs) =>
		x.actual
			? divText(formatDate(x.actual), [...cs, "estimated", "actual"])
			: x.estimated
				? divText(formatDate(x.estimated), [...cs, "estimated", "expected"])
				: divText("—", [...cs, "estimated"]);

	return [
		divText(stop.location.name, ["stop-name"]),
		divText(formatDate(stop.arrival.scheduled), ["stop-arr", "scheduled"]),
		divText(formatDate(stop.departure.scheduled), ["stop-dep", "scheduled"]),
		op(stop.arrival, ["stop-arr"]),
		op(stop.departure, ["stop-dep"]),
	];
}

function scheduleHeaderRows() {
	return [
		divText("Scheduled", ["header-row-1", "scheduled"]),
		divText("Actual", ["header-row-1", "estimated", "actual"]),
		divText("Stop Name", ["stop-name", "header-row-2"]),
		divText("Arr.", ["stop-arr", "header-row-2", "scheduled"]),
		divText("Dep.", ["stop-dep", "header-row-2", "scheduled"]),
		divText("Arr.", ["stop-arr", "header-row-2", "estimated"]),
		divText("Dep.", ["stop-dep", "header-row-2", "estimated"]),
	];
}

function scheduleInfo(route) {
	const rows = [...scheduleHeaderRows(), ...route.flatMap(stopInfo)];
	return div(rows, ["schedule"]);
}

function scheduleTitle(bus, route) {
	const regions = route.map((stop) => stop.location.region_name);
	const time = formatDate(route[0].arrival.scheduled);
	const title = `${time} ${regions.at(0)} to ${regions.at(-1)}`;
	const h1 = document.createElement("h1");
	h1.appendChild(document.createTextNode(title));

	const updateNote = divText(`Updated at ${formatDate(bus.gps.last_updated)}`, [
		"last-updated",
	]);
	return div([h1, updateNote]);
}

function busMap(bus, route) {
	const mapDiv = div([]);
	mapDiv.id = "map";

	const busCoords = [bus.gps.latitude, bus.gps.longitude];
	const routeCoords = route.map((stop) => [
		stop.location.lat,
		stop.location.lon,
	]);
	// Would be better to get the (max - min) / 2 for each axis here,
	// instead of the average, but the average works.
	const avgRouteCoord = routeCoords
		.reduce(([ax, ay], [bx, by]) => [ax + bx, ay + by], [0, 0])
		.map((c) => c / routeCoords.length);

	let initialised = false;
	mapDiv.addEventListener("DOMNodeInserted", () => {
		if (!initialised) {
			initialised = true;
			const map = L.map("map").setView(avgRouteCoord, 9);
			L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
				attribution:
					'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
			}).addTo(map);

			L.marker(busCoords).addTo(map);
			L.polyline(routeCoords).addTo(map);
			route.forEach((stop) =>
				L.circleMarker([stop.location.lat, stop.location.lon], {
					radius: 5,
					fillOpacity: 1,
				}).addTo(map),
			);
		}
	});

	return mapDiv;
}

async function showTripInfo(tripID) {
	const data = await get(`https://api.ember.to/v1/trips/${tripID}/`, {
		all: true,
	});

	console.log(data);

	$("main").appendChild(scheduleTitle(data.vehicle, data.route));
	$("main").appendChild(busMap(data.vehicle, data.route));
	$("main").appendChild(scheduleInfo(data.route));
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
