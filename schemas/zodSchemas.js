const { z } = require('zod');

const TripComponentSchema = z.object({
    Type: z.string().optional().nullable(),
    Name: z.string(),
    Date: z.string().optional().nullable(),
    Time: z.string().optional().nullable(),
    Airline: z.string().optional().nullable(),
    FlightNumber: z.string().optional().nullable(),
    Confirmation: z.string().optional().nullable(),
    Address: z.string().optional().nullable()
});

const TripSchema = z.object({
    TripName: z.string(),
    StartDate: z.string(),
    EndDate: z.string().optional().nullable(),
    Components: z.array(TripComponentSchema).optional().nullable()
});

const TripsResponseSchema = z.array(TripSchema);

module.exports = {
    TripComponentSchema,
    TripSchema,
    TripsResponseSchema
};
