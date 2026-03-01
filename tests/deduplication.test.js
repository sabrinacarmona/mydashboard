const { deduplicateTrips } = require('../utils/deduplication');

describe('deduplicateTrips', () => {
    it('should not merge trips that are far apart', () => {
        const input = [
            {
                TripName: "San Francisco",
                StartDate: "2024-05-01",
                EndDate: "2024-05-05",
                Components: [{ Name: "Flight to SFO" }]
            },
            {
                TripName: "London",
                StartDate: "2024-06-01",
                EndDate: "2024-06-10",
                Components: [{ Name: "Flight to LHR" }]
            }
        ];

        const result = deduplicateTrips(input);
        expect(result.length).toBe(2);
        expect(result[0].TripName).toBe("San Francisco");
        expect(result[1].TripName).toBe("London");
    });

    it('should merge trips that are within 2 days of each other and combine names', () => {
        const input = [
            {
                TripName: "San Francisco",
                StartDate: "2024-05-01",
                EndDate: "2024-05-05",
                Components: [{ Name: "Flight to SFO" }]
            },
            {
                TripName: "Las Vegas",
                StartDate: "2024-05-06",
                EndDate: "2024-05-08",
                Components: [{ Name: "Flight to LAS" }]
            }
        ];

        const result = deduplicateTrips(input);
        expect(result.length).toBe(1);
        expect(result[0].TripName).toBe("San Francisco & Las Vegas");
        expect(result[0].EndDate).toBe("2024-05-08"); // Extended end date
        expect(result[0].Components.length).toBe(2);
    });

    it('should ignore duplicate components when merging', () => {
        const input = [
            {
                TripName: "London",
                StartDate: "2024-05-01",
                EndDate: "2024-05-05",
                Components: [{ Name: "Flight to LHR" }, { Name: "Hotel Booking" }]
            },
            {
                TripName: "London", // Second detection of the same trip
                StartDate: "2024-05-02",
                EndDate: "2024-05-05",
                Components: [{ Name: "Flight to LHR" }, { Name: "Dinner Reservation" }]
            }
        ];

        const result = deduplicateTrips(input);
        expect(result.length).toBe(1);
        // Because "London" is same, name won't be appended
        expect(result[0].TripName).toBe("London");

        // "Flight to LHR" should not be duplicated
        expect(result[0].Components.length).toBe(3);
        const compNames = result[0].Components.map(c => c.Name);
        expect(compNames).toContain("Flight to LHR");
        expect(compNames).toContain("Hotel Booking");
        expect(compNames).toContain("Dinner Reservation");
    });

    it('should return empty array for empty input', () => {
        expect(deduplicateTrips([])).toEqual([]);
        expect(deduplicateTrips(null)).toEqual([]);
    });
});
