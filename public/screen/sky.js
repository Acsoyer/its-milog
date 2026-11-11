(() => {
// Dynamic sky-gradient engine — a faithful port of the astronomy + keyframe
// color model from times_v3.html. Given a city (lat/lng/timezone) and a date,
// it computes sunrise/solar-noon/sunset and interpolates a 5-stop vertical sky
// gradient for the current minute, so the header color flows with the sun.
// City database (same list as the HTML prototype).
const CITIES = [
    // Türkiye
    { id: 'istanbul', name: 'İstanbul', group: 'Türkiye', lat: 41.0082, lng: 28.9784, tz: 'Europe/Istanbul' },
    { id: 'ankara', name: 'Ankara', group: 'Türkiye', lat: 39.9334, lng: 32.8597, tz: 'Europe/Istanbul' },
    { id: 'izmir', name: 'İzmir', group: 'Türkiye', lat: 38.4237, lng: 27.1428, tz: 'Europe/Istanbul' },
    { id: 'kars', name: 'Kars', group: 'Türkiye', lat: 40.6013, lng: 43.0975, tz: 'Europe/Istanbul' },
    { id: 'edirne', name: 'Edirne', group: 'Türkiye', lat: 41.6771, lng: 26.5557, tz: 'Europe/Istanbul' },
    { id: 'antalya', name: 'Antalya', group: 'Türkiye', lat: 36.8969, lng: 30.7133, tz: 'Europe/Istanbul' },
    { id: 'trabzon', name: 'Trabzon', group: 'Türkiye', lat: 41.0027, lng: 39.7168, tz: 'Europe/Istanbul' },
    { id: 'gaziantep', name: 'Gaziantep', group: 'Türkiye', lat: 37.0662, lng: 37.3833, tz: 'Europe/Istanbul' },
    // Avrupa
    { id: 'london', name: 'Londra', group: 'Avrupa', lat: 51.5074, lng: -0.1278, tz: 'Europe/London' },
    { id: 'paris', name: 'Paris', group: 'Avrupa', lat: 48.8566, lng: 2.3522, tz: 'Europe/Paris' },
    { id: 'berlin', name: 'Berlin', group: 'Avrupa', lat: 52.52, lng: 13.405, tz: 'Europe/Berlin' },
    { id: 'rome', name: 'Roma', group: 'Avrupa', lat: 41.9028, lng: 12.4964, tz: 'Europe/Rome' },
    { id: 'madrid', name: 'Madrid', group: 'Avrupa', lat: 40.4168, lng: -3.7038, tz: 'Europe/Madrid' },
    { id: 'lisbon', name: 'Lizbon', group: 'Avrupa', lat: 38.7223, lng: -9.1393, tz: 'Europe/Lisbon' },
    { id: 'porto', name: 'Porto', group: 'Avrupa', lat: 41.1579, lng: -8.6291, tz: 'Europe/Lisbon' },
    { id: 'helsinki', name: 'Helsinki', group: 'Avrupa', lat: 60.1699, lng: 24.9384, tz: 'Europe/Helsinki' },
    { id: 'oslo', name: 'Oslo', group: 'Avrupa', lat: 59.9139, lng: 10.7522, tz: 'Europe/Oslo' },
    { id: 'athens', name: 'Atina', group: 'Avrupa', lat: 37.9838, lng: 23.7275, tz: 'Europe/Athens' },
    { id: 'vienna', name: 'Viyana', group: 'Avrupa', lat: 48.2082, lng: 16.3738, tz: 'Europe/Vienna' },
    { id: 'moscow', name: 'Moskova', group: 'Avrupa', lat: 55.7558, lng: 37.6173, tz: 'Europe/Moscow' },
    // Kuzey Amerika & Kanada
    { id: 'toronto', name: 'Toronto', group: 'Kuzey Amerika', lat: 43.6532, lng: -79.3832, tz: 'America/Toronto' },
    { id: 'vancouver', name: 'Vancouver', group: 'Kuzey Amerika', lat: 49.2827, lng: -123.1207, tz: 'America/Vancouver' },
    { id: 'montreal', name: 'Montreal', group: 'Kuzey Amerika', lat: 45.5017, lng: -73.5673, tz: 'America/Toronto' },
    { id: 'newyork', name: 'New York', group: 'Kuzey Amerika', lat: 40.7128, lng: -74.006, tz: 'America/New_York' },
    { id: 'losangeles', name: 'Los Angeles', group: 'Kuzey Amerika', lat: 34.0522, lng: -118.2437, tz: 'America/Los_Angeles' },
    { id: 'chicago', name: 'Chicago', group: 'Kuzey Amerika', lat: 41.8781, lng: -87.6298, tz: 'America/Chicago' },
    { id: 'mexicocity', name: 'Mexico City', group: 'Kuzey Amerika', lat: 19.4326, lng: -99.1332, tz: 'America/Mexico_City' },
    // Güney Amerika
    { id: 'saopaulo', name: 'São Paulo', group: 'Güney Amerika', lat: -23.5505, lng: -46.6333, tz: 'America/Sao_Paulo' },
    { id: 'buenosaires', name: 'Buenos Aires', group: 'Güney Amerika', lat: -34.6037, lng: -58.3816, tz: 'America/Argentina/Buenos_Aires' },
    { id: 'bogota', name: 'Bogotá', group: 'Güney Amerika', lat: 4.711, lng: -74.0721, tz: 'America/Bogota' },
    { id: 'lima', name: 'Lima', group: 'Güney Amerika', lat: -12.0464, lng: -77.0428, tz: 'America/Lima' },
    { id: 'santiago', name: 'Santiago', group: 'Güney Amerika', lat: -33.4489, lng: -70.6693, tz: 'America/Santiago' },
    // Orta Doğu & Arap Yarımadası
    { id: 'dubai', name: 'Dubai', group: 'Orta Doğu', lat: 25.2048, lng: 55.2708, tz: 'Asia/Dubai' },
    { id: 'riyadh', name: 'Riyad', group: 'Orta Doğu', lat: 24.7136, lng: 46.6753, tz: 'Asia/Riyadh' },
    { id: 'mecca', name: 'Mekke', group: 'Orta Doğu', lat: 21.3891, lng: 39.8579, tz: 'Asia/Riyadh' },
    { id: 'cairo', name: 'Kahire', group: 'Orta Doğu', lat: 30.0444, lng: 31.2357, tz: 'Africa/Cairo' },
    { id: 'beirut', name: 'Beyrut', group: 'Orta Doğu', lat: 33.8938, lng: 35.5018, tz: 'Asia/Beirut' },
    { id: 'baghdad', name: 'Bağdat', group: 'Orta Doğu', lat: 33.3152, lng: 44.3661, tz: 'Asia/Baghdad' },
    { id: 'doha', name: 'Doha', group: 'Orta Doğu', lat: 25.2854, lng: 51.531, tz: 'Asia/Qatar' },
    // Orta Asya & Kafkaslar
    { id: 'tashkent', name: 'Taşkent', group: 'Orta Asya', lat: 41.2995, lng: 69.2401, tz: 'Asia/Tashkent' },
    { id: 'almaty', name: 'Almatı', group: 'Orta Asya', lat: 43.222, lng: 76.8512, tz: 'Asia/Almaty' },
    { id: 'astana', name: 'Astana', group: 'Orta Asya', lat: 51.1694, lng: 71.4491, tz: 'Asia/Almaty' },
    { id: 'bishkek', name: 'Bişkek', group: 'Orta Asya', lat: 42.8746, lng: 74.5698, tz: 'Asia/Bishkek' },
    { id: 'ashgabat', name: 'Aşkabat', group: 'Orta Asya', lat: 37.9601, lng: 58.3261, tz: 'Asia/Ashgabat' },
    { id: 'dushanbe', name: 'Duşanbe', group: 'Orta Asya', lat: 38.5598, lng: 68.787, tz: 'Asia/Dushanbe' },
    { id: 'baku', name: 'Bakü', group: 'Orta Asya', lat: 40.4093, lng: 49.8671, tz: 'Asia/Baku' },
    // Güney Asya
    { id: 'newdelhi', name: 'Yeni Delhi', group: 'Güney Asya', lat: 28.6139, lng: 77.209, tz: 'Asia/Kolkata' },
    { id: 'mumbai', name: 'Mumbai', group: 'Güney Asya', lat: 19.076, lng: 72.8777, tz: 'Asia/Kolkata' },
    { id: 'karachi', name: 'Karaçi', group: 'Güney Asya', lat: 24.8607, lng: 67.0011, tz: 'Asia/Karachi' },
    { id: 'islamabad', name: 'İslamabad', group: 'Güney Asya', lat: 33.6844, lng: 73.0479, tz: 'Asia/Karachi' },
    { id: 'dhaka', name: 'Dakka', group: 'Güney Asya', lat: 23.8103, lng: 90.4125, tz: 'Asia/Dhaka' },
    { id: 'colombo', name: 'Kolombo', group: 'Güney Asya', lat: 6.9271, lng: 79.8612, tz: 'Asia/Colombo' },
    { id: 'kathmandu', name: 'Katmandu', group: 'Güney Asya', lat: 27.7172, lng: 85.324, tz: 'Asia/Kathmandu' },
    // Doğu & Güneydoğu Asya
    { id: 'tokyo', name: 'Tokyo', group: 'Doğu Asya', lat: 35.6762, lng: 139.6503, tz: 'Asia/Tokyo' },
    { id: 'beijing', name: 'Pekin', group: 'Doğu Asya', lat: 39.9042, lng: 116.4074, tz: 'Asia/Shanghai' },
    { id: 'shanghai', name: 'Şanghay', group: 'Doğu Asya', lat: 31.2304, lng: 121.4737, tz: 'Asia/Shanghai' },
    { id: 'seoul', name: 'Seul', group: 'Doğu Asya', lat: 37.5665, lng: 126.978, tz: 'Asia/Seoul' },
    { id: 'singapore', name: 'Singapur', group: 'Doğu Asya', lat: 1.3521, lng: 103.8198, tz: 'Asia/Singapore' },
    { id: 'bangkok', name: 'Bangkok', group: 'Doğu Asya', lat: 13.7563, lng: 100.5018, tz: 'Asia/Bangkok' },
    { id: 'jakarta', name: 'Cakarta', group: 'Doğu Asya', lat: -6.2088, lng: 106.8456, tz: 'Asia/Jakarta' },
    // Afrika
    { id: 'lagos', name: 'Lagos', group: 'Afrika', lat: 6.5244, lng: 3.3792, tz: 'Africa/Lagos' },
    { id: 'johannesburg', name: 'Johannesburg', group: 'Afrika', lat: -26.2041, lng: 28.0473, tz: 'Africa/Johannesburg' },
    { id: 'capetown', name: 'Cape Town', group: 'Afrika', lat: -33.9249, lng: 18.4241, tz: 'Africa/Johannesburg' },
    { id: 'nairobi', name: 'Nairobi', group: 'Afrika', lat: -1.2921, lng: 36.8219, tz: 'Africa/Nairobi' },
    { id: 'casablanca', name: 'Kazablanka', group: 'Afrika', lat: 33.5731, lng: -7.5898, tz: 'Africa/Casablanca' },
    { id: 'addisababa', name: 'Addis Ababa', group: 'Afrika', lat: 9.03, lng: 38.74, tz: 'Africa/Addis_Ababa' },
    { id: 'tunis', name: 'Tunus', group: 'Afrika', lat: 36.8065, lng: 10.1815, tz: 'Africa/Tunis' },
    // Okyanusya
    { id: 'sydney', name: 'Sydney', group: 'Okyanusya', lat: -33.8688, lng: 151.2093, tz: 'Australia/Sydney' },
    { id: 'melbourne', name: 'Melbourne', group: 'Okyanusya', lat: -37.8136, lng: 144.9631, tz: 'Australia/Melbourne' },
    { id: 'auckland', name: 'Auckland', group: 'Okyanusya', lat: -36.8485, lng: 174.7633, tz: 'Pacific/Auckland' },
];
const DEFAULT_CITY_ID = 'istanbul';
function cityById(id) {
    return CITIES.find((c) => c.id === id) ?? CITIES[0];
}
// Safely compute the timezone offset (minutes) for a given IANA zone at a given
// date, WITHOUT `Date.toLocaleString(timeZone)` which can produce Invalid Date
// (NaN) on Hermes. Uses Intl.DateTimeFormat.formatToParts and falls back to the
// device offset — never returns NaN.
function tzOffsetMinutes(timeZone, dateObj) {
    try {
        const fmt = new Intl.DateTimeFormat('en-US', {
            timeZone,
            hour12: false,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
        const parts = fmt.formatToParts(dateObj);
        const get = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0);
        const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
        if (!Number.isFinite(asUTC))
            return -dateObj.getTimezoneOffset();
        const deviceOffsetMin = -dateObj.getTimezoneOffset();
        return Math.round((asUTC - dateObj.getTime()) / 60000) + deviceOffsetMin;
    }
    catch {
        return -dateObj.getTimezoneOffset();
    }
}
// Astronomical sunrise/sunset/noon (minutes of local day) — mirrors the HTML.
function calculateSunTimes(lat, lng, dateObj, timeZone) {
    const startOfYear = new Date(dateObj.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((dateObj.getTime() - startOfYear.getTime()) / 86400000);
    const rad = Math.PI / 180;
    const declination = 23.45 * Math.sin(rad * (360 / 365) * (dayOfYear - 81));
    const latRad = lat * rad;
    const decRad = declination * rad;
    let cosHA = (Math.sin(-0.833 * rad) - Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad));
    cosHA = Math.max(-1, Math.min(1, cosHA));
    const haDeg = Math.acos(cosHA) * (180 / Math.PI);
    const b = (2 * Math.PI * (dayOfYear - 81)) / 365;
    const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
    const solarNoonUTC = 720 - lng * 4 - eot;
    const sunriseUTC = solarNoonUTC - haDeg * 4;
    const sunsetUTC = solarNoonUTC + haDeg * 4;
    const tzOffsetMin = tzOffsetMinutes(timeZone, dateObj);
    return {
        sunrise: (sunriseUTC + tzOffsetMin + 1440) % 1440,
        sunset: (sunsetUTC + tzOffsetMin + 1440) % 1440,
        solarNoon: (solarNoonUTC + tzOffsetMin + 1440) % 1440,
    };
}
// Keyframe color profiles keyed to the sun's position (RGB stops, top->bottom).
function buildDynamicKeyframes(sunData) {
    const sr = sunData.sunrise;
    const ss = sunData.sunset;
    const sn = sunData.solarNoon;
    const dawn = (sr - 40 + 1440) % 1440;
    const morning = sr + (sn - sr) * 0.4;
    const afternoon = sn + (ss - sn) * 0.6;
    const dusk = (ss + 40) % 1440;
    const rawFrames = [
        { minute: 0, colors: [[4, 6, 20], [8, 12, 35], [12, 18, 50], [15, 22, 60], [18, 25, 70]] },
        { minute: dawn, colors: [[10, 15, 35], [20, 22, 50], [35, 30, 65], [60, 40, 80], [90, 50, 85]] },
        { minute: sr, colors: [[24, 26, 64], [74, 48, 109], [184, 82, 122], [232, 128, 106], [245, 180, 120]] },
        { minute: morning, colors: [[30, 87, 153], [32, 124, 202], [80, 160, 225], [140, 200, 240], [180, 225, 250]] },
        { minute: sn, colors: [[18, 68, 131], [37, 116, 196], [93, 165, 232], [168, 216, 248], [210, 238, 255]] },
        { minute: afternoon, colors: [[30, 64, 109], [66, 97, 137], [147, 133, 150], [214, 163, 130], [240, 190, 140]] },
        { minute: ss, colors: [[19, 28, 71], [61, 43, 86], [163, 72, 94], [217, 105, 81], [245, 166, 91]] },
        { minute: dusk, colors: [[15, 20, 53], [36, 26, 62], [80, 41, 74], [120, 59, 78], [150, 80, 80]] },
        { minute: 1440, colors: [[4, 6, 20], [8, 12, 35], [12, 18, 50], [15, 22, 60], [18, 25, 70]] },
    ];
    return rawFrames.sort((a, b) => a.minute - b.minute);
}
function lerp(a, b, f) {
    return a + (b - a) * f;
}
function interpolateColor(c1, c2, f) {
    return [Math.round(lerp(c1[0], c2[0], f)), Math.round(lerp(c1[1], c2[1], f)), Math.round(lerp(c1[2], c2[2], f))];
}
function rgbToHex(c) {
    return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
function luminance(c) {
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
}
// A guaranteed-valid fallback gradient (daytime sky blue), used whenever the
// astronomical computation or timezone lookup fails for any reason.
const FALLBACK_COLORS = ['#1E447F', '#2574CA', '#50A0E1', '#8CC8F0', '#B4E1FA'];
function makeProfile(colors, minute, sunrise, sunset, solarNoon) {
    const topHex = colors[0];
    const r = parseInt(topHex.slice(1, 3), 16);
    const g = parseInt(topHex.slice(3, 5), 16);
    const b = parseInt(topHex.slice(5, 7), 16);
    const lum = Number.isFinite(r) ? 0.299 * r + 0.587 * g + 0.114 * b : 0;
    return {
        colors,
        sunrise,
        sunset,
        solarNoon,
        minute,
        textColor: lum > 140 ? '#171716' : '#FFFDF8',
        bottomColor: colors[colors.length - 1],
        darkestColor: colors[colors.length - 1],
    };
}
// Compute the 5-stop sky gradient for the current minute at the given city.
// Never throws: on any error it returns the fallback daytime gradient.
function skyProfileForCity(cityId, now = new Date()) {
    try {
        const city = cityById(cityId);
        const sunData = calculateSunTimes(city.lat, city.lng, now, city.tz);
        const keyframes = buildDynamicKeyframes(sunData);
        const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
        const tzOffsetMin = tzOffsetMinutes(city.tz, now);
        const minute = (utcMin + tzOffsetMin + 1440) % 1440;
        let prev = keyframes[0];
        let next = keyframes[keyframes.length - 1];
        for (let i = 0; i < keyframes.length - 1; i++) {
            if (minute >= keyframes[i].minute && minute <= keyframes[i + 1].minute) {
                prev = keyframes[i];
                next = keyframes[i + 1];
                break;
            }
        }
        const dur = next.minute - prev.minute;
        const factor = dur === 0 ? 0 : (minute - prev.minute) / dur;
        const profile = prev.colors.map((_, i) => interpolateColor(prev.colors[i], next.colors[i], factor));
        // Clamp to valid 0..255 in case of any float/NaN edge case.
        const clamp = (v) => (Number.isFinite(v) ? Math.max(0, Math.min(255, Math.round(v))) : 0);
        const colors = profile.map((c) => rgbToHex([clamp(c[0]), clamp(c[1]), clamp(c[2])]));
        return makeProfile(colors, minute, sunData.sunrise, sunData.sunset, sunData.solarNoon);
    }
    catch {
        return makeProfile(FALLBACK_COLORS, new Date().getHours() * 60 + new Date().getMinutes(), 0, 0, 0);
    }
}
window.MilogSky = { CITIES, DEFAULT_CITY_ID, skyProfileForCity };
})();
