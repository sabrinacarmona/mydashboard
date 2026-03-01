const SQLite = require('better-sqlite3');
const db = new SQLite('database.db');
const rowProf = db.prepare('SELECT trip_data FROM grouped_trips WHERE context_mode = ?').get('professional');
const rowPers = db.prepare('SELECT trip_data FROM grouped_trips WHERE context_mode = ?').get('personal');

let combined = [];
if (rowProf && rowProf.trip_data) combined.push(...JSON.parse(rowProf.trip_data));
if (rowPers && rowPers.trip_data) combined.push(...JSON.parse(rowPers.trip_data));

if (combined.length > 0) {
    combined.sort((a, b) => new Date(a.StartDate) - new Date(b.StartDate));
    let finalTrips = [combined[0]];
    
    for (let i = 1; i < combined.length; i++) {
        const current = combined[i];
        const last = finalTrips[finalTrips.length - 1];
        const lastEnd = new Date(last.EndDate || last.StartDate);
        const currentStart = new Date(current.StartDate);
        
        const diffTime = Math.abs(currentStart - lastEnd);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 2) {
            const lastBaseName = last.TripName.split(' & ')[0];
            const currentBaseName = current.TripName.split(' & ')[0];
            if (!last.TripName.includes(currentBaseName)) {
                last.TripName = `${lastBaseName} & ${currentBaseName}`;
            }
            if (new Date(current.EndDate || current.StartDate) > lastEnd) {
                last.EndDate = current.EndDate || current.StartDate;
            }
        } else {
            finalTrips.push(current);
        }
    }
    console.log(finalTrips.map(t => t.TripName));
} else {
    console.log("No data");
}
