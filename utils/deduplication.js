function deduplicateTrips(parsedTrips) {
    let groupedTrips = [];
    if (Array.isArray(parsedTrips) && parsedTrips.length > 0) {
        // Clone to avoid mutating original payload directly before sorting
        const sortedTrips = [...parsedTrips].sort((a, b) => new Date(a.StartDate) - new Date(b.StartDate));

        groupedTrips.push(sortedTrips[0]);

        for (let i = 1; i < sortedTrips.length; i++) {
            const current = sortedTrips[i];
            const last = groupedTrips[groupedTrips.length - 1];
            const lastEnd = new Date(last.EndDate || last.StartDate);
            const currentStart = new Date(current.StartDate);

            let diffDays = 0;
            if (currentStart > lastEnd) {
                // Next trip starts after the previous ends
                const diffTime = currentStart - lastEnd;
                diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            } else {
                // Next trip starts during or before previous ends (overlap)!
                diffDays = 0;
            }

            if (diffDays <= 2) {
                // Merge into last trip
                const lastBaseName = last.TripName.split(' & ')[0];
                const currentBaseName = current.TripName.split(' & ')[0];

                if (!last.TripName.includes(currentBaseName) && lastBaseName !== currentBaseName) {
                    last.TripName = `${lastBaseName} & ${currentBaseName}`;
                }

                if (new Date(current.EndDate || current.StartDate) > lastEnd) {
                    last.EndDate = current.EndDate || current.StartDate;
                }

                // Important: Check for duplicate components before merging
                const existingTitles = new Set((last.Components || []).map(c => c.Name));
                const uniqueNewComps = (current.Components || []).filter(c => !existingTitles.has(c.Name));
                last.Components = [...(last.Components || []), ...uniqueNewComps];
            } else {
                groupedTrips.push(current);
            }
        }
    }
    return groupedTrips;
}

module.exports = { deduplicateTrips };
