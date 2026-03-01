import { useDataFetch } from '../hooks/useDataFetch';

export default function FocusHeatmap({ context }) {
    const { data: statsData, isLoading, error } = useDataFetch('pomodoros/stats', context);

    const MAX_EXPECTED_MINS = 240;

    const heatmapData = statsData?.heatmap || Array(52).fill({ minutes: 0, date: new Date().toISOString() });

    // Calculate today's formatted time
    const todayMinutes = statsData?.today || 0;
    const todayHrs = Math.floor(todayMinutes / 60);
    const todayMinsStr = todayMinutes % 60;
    const todayText = todayHrs > 0 ? `${todayHrs}h ${todayMinsStr}m TODAY` : `${todayMinsStr}m TODAY`;

    return (
        <div className="mb-6 pb-6 border-b border-white/10 shrink-0">
            <h2 className="text-sm font-semibold flex items-center justify-between text-white/90 mb-4">
                <span className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-neon-indigo" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                    Focus Heatmap
                    {isLoading && (
                        <svg className="w-3 h-3 ml-2 animate-spin text-white/40" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    )}
                </span>
                <span className="text-xs text-white/50 font-mono tracking-wider">{todayText}</span>
            </h2>
            {error && <div className="text-red-400 text-xs mb-2">Error loading stats...</div>}

            <div className="grid gap-[2px] w-full" style={{ gridTemplateColumns: 'repeat(52, minmax(0, 1fr))', height: '100px' }}>
                {heatmapData.map((dayData, index) => {
                    const dateObj = new Date(dayData.date);
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
                    const intensity = Math.min((dayData.minutes / MAX_EXPECTED_MINS) * 100, 100);

                    const hrs = Math.floor(dayData.minutes / 60);
                    const mins = dayData.minutes % 60;
                    const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                    return (
                        <div key={index} className="flex flex-col items-center justify-end w-full h-full group relative cursor-pointer">
                            {/* Tooltip */}
                            <div className="absolute -top-8 bg-charcoal border border-white/10 text-white/90 text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                {dateStr}: {timeStr}
                            </div>
                            {/* Bar */}
                            <div
                                className={`w-full bg-neon-indigo transition-all duration-500 rounded-t-sm ${dayData.minutes > 0 ? 'opacity-80 group-hover:opacity-100' : 'opacity-20'}`}
                                style={{ height: `${Math.max(intensity, 5)}%` }}
                            ></div>
                            <span className="text-[9px] text-white/30 mt-1 uppercase font-medium">{dayName}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
