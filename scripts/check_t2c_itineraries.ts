import assert from 'node:assert/strict';

const API_URL = 'https://api.t2c.fr/siv/itineraries';
const DEPARTURE_XY = '3.147658,45.835345';
const ARRIVAL_XY = '3.095336,45.777557';

const PARIS_MINUTE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  hour12: false,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

type ItineraryStep = {
  type: string;
  line_name?: string;
  line_short_name?: string;
  line_direction?: string;
  departure_time?: string;
  arrival_time?: string;
};

type Itinerary = {
  id: string;
  steps?: ItineraryStep[];
};

function getNowParisForQuery(date = new Date()): string {
  const parts = PARIS_MINUTE_FORMATTER.formatToParts(date);
  let year = '1970';
  let month = '01';
  let day = '01';
  let hour = '00';
  let minute = '00';

  for (const part of parts) {
    if (part.type === 'year') year = part.value;
    else if (part.type === 'month') month = part.value;
    else if (part.type === 'day') day = part.value;
    else if (part.type === 'hour') hour = part.value;
    else if (part.type === 'minute') minute = part.value;
  }

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

async function main(): Promise<void> {
  const params = new URLSearchParams({
    departure_xy: DEPARTURE_XY,
    arrival_xy: ARRIVAL_XY,
    departure_time: getNowParisForQuery(),
    max_matches: '5',
  });

  const response = await fetch(`${API_URL}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });

  assert.equal(response.ok, true, `T2C itineraries HTTP ${response.status}`);

  const payload: unknown = await response.json();
  assert.equal(Array.isArray(payload), true, 'Expected itineraries array');

  const e1Steps = (payload as Itinerary[])
    .flatMap((itinerary) => Array.isArray(itinerary.steps) ? itinerary.steps : [])
    .filter((step) => {
      const line = (step.line_short_name || step.line_name || '').trim().toUpperCase();
      return step.type === 'transport' && line === 'E1';
    })
    .map((step) => ({
      departure: step.departure_time,
      arrival: step.arrival_time,
      headsign: step.line_direction,
    }));

  assert.ok(e1Steps.length > 0, 'No E1 departure found in T2C itineraries response');

  console.log('✅ T2C itineraries OK - E1 departures found:', e1Steps.length);
  console.log(JSON.stringify(e1Steps.slice(0, 3), null, 2));
}

void main();
