import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE } from '../utils/api';

export default function Header({ context, setContext, isZenMode, setIsZenMode }) {
    const { authStatus, requireAuth } = useAuth();
    const [timeStr, setTimeStr] = useState('--:--');
    const [dateStr, setDateStr] = useState('Loading Date...');
    const [weather, setWeather] = useState('--°C');

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setDateStr(now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }));
            setTimeStr(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }));
        };
        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=51.5085&longitude=-0.1257&current=temperature_2m,weather_code');
                const data = await res.json();
                const temp = Math.round(data.current.temperature_2m);
                const code = data.current.weather_code;

                let emoji = '🌤️';
                if (code === 0) emoji = '☀️';
                else if (code >= 1 && code <= 3) emoji = '☁️';
                else if (code >= 45 && code <= 48) emoji = '🌫️';
                else if (code >= 51 && code <= 67) emoji = '🌧️';
                else if (code >= 71 && code <= 77) emoji = '❄️';
                else if (code >= 80 && code <= 82) emoji = '🌦️';
                else if (code >= 95) emoji = '⚡';

                setWeather(`${emoji} ${temp}°C`);
            } catch (err) {
                console.error("Failed to fetch weather", err);
            }
        };
        fetchWeather();
        const interval = setInterval(fetchWeather, 15 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const handleAuthClick = () => {
        if (!authStatus.includes('Connected')) {
            requireAuth();
        }
    };

    return (
        <div className="w-full max-w-[1400px] flex flex-col md:flex-row justify-between items-center mb-8 gap-6 md:gap-0 transition-all duration-700 relative z-50">
            <h1 className={`text-4xl font-display font-bold tracking-tight text-white transition-opacity duration-500 text-center md:text-left ${isZenMode ? 'opacity-0 pointer-events-none scale-95' : ''}`}>
                Sabrina's <span className="text-neon-indigo transition-colors duration-800">Control Centre</span>
            </h1>

            <div className={`hidden md:flex flex-col items-center justify-center text-white/60 transition-opacity duration-500 cursor-default ${isZenMode ? 'opacity-0 pointer-events-none scale-95' : ''}`}>
                <div className="flex items-center space-x-3 text-sm font-medium tracking-wide">
                    <span className="uppercase text-white/50 text-xs">{dateStr}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                    <span className="text-white/80 font-bold text-lg">{timeStr}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                    <span className="flex items-center text-sm">{weather}</span>
                </div>
                <div className="flex items-center space-x-2 mt-0.5">
                    <div className="text-[10px] text-white/30 tracking-widest uppercase">London, UK</div>
                </div>
            </div>

            <div className={`flex flex-wrap justify-center items-center gap-4 ${isZenMode ? 'opacity-0 pointer-events-none scale-95' : ''}`}>
                <div className="flat-panel flex items-center rounded-full p-1 transition-opacity duration-500">
                    <button onClick={() => setContext('professional')} className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${context === 'professional' ? 'bg-white/10 text-white/90' : 'text-white/40 hover:text-white/70'}`}>Professional</button>
                    <button onClick={() => setContext('personal')} className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${context === 'personal' ? 'bg-white/10 text-white/90' : 'text-white/40 hover:text-white/70'}`}>Personal</button>
                </div>

                <button
                    onClick={handleAuthClick}
                    className={`text-sm font-medium px-4 py-2 rounded-full flat-panel transition-opacity duration-500 ${authStatus.includes('Connected') ? 'border-green-500/30 text-green-400 cursor-default' : 'border-red-500/30 text-red-400 cursor-pointer hover:bg-red-500/10 active:scale-95'}`}>
                    {authStatus}
                </button>

                <button onClick={() => setIsZenMode(!isZenMode)} className="flat-panel px-6 py-2 rounded-full font-medium text-sm hover:bg-white/10 transition-colors flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                    <span>{isZenMode ? 'Exit Zen Mode' : 'Enter Zen Mode'}</span>
                </button>
            </div>
        </div>
    );
}
