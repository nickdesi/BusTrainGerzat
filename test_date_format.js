
const formatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

const parts = formatter.formatToParts(new Date());
const year = parts.find(p => p.type === 'year')?.value;
const month = parts.find(p => p.type === 'month')?.value;
const day = parts.find(p => p.type === 'day')?.value;

const result = `${year}${month}${day}`;

console.log("Parts:", parts);
console.log("Year:", year);
console.log("Month:", month);
console.log("Day:", day);
console.log("Result:", result);

if (result.length !== 8) {
    console.error("ERROR: Result is not 8 characters long!");
}
if (isNaN(Number(result))) {
    console.error("ERROR: Result is not a number!");
}
