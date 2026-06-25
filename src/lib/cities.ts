// ══════════════════════════════════════════════════════════
// Legatree – World Cities Database (for autocomplete)
// ~250 major cities across all continents.
// ══════════════════════════════════════════════════════════

export interface City {
  name: string;
  region: string;
  country: string;
  countryCode: string;
  label: string; // "City, Region, Country"
}

const RAW: [string, string, string, string][] = [
  // North America
  ["New York", "NY", "USA", "USA"],
  ["Los Angeles", "CA", "USA", "USA"],
  ["Chicago", "IL", "USA", "USA"],
  ["Houston", "TX", "USA", "USA"],
  ["Dallas", "TX", "USA", "USA"],
  ["Fort Worth", "TX", "USA", "USA"],
  ["Plano", "TX", "USA", "USA"],
  ["Arlington", "TX", "USA", "USA"],
  ["Irving", "TX", "USA", "USA"],
  ["Frisco", "TX", "USA", "USA"],
  ["Phoenix", "AZ", "USA", "USA"],
  ["Philadelphia", "PA", "USA", "USA"],
  ["San Antonio", "TX", "USA", "USA"],
  ["San Diego", "CA", "USA", "USA"],
  ["San Francisco", "CA", "USA", "USA"],
  ["Austin", "TX", "USA", "USA"],
  ["El Paso", "TX", "USA", "USA"],
  ["Seattle", "WA", "USA", "USA"],
  ["Denver", "CO", "USA", "USA"],
  ["Washington", "DC", "USA", "USA"],
  ["Boston", "MA", "USA", "USA"],
  ["Nashville", "TN", "USA", "USA"],
  ["Portland", "OR", "USA", "USA"],
  ["Las Vegas", "NV", "USA", "USA"],
  ["Atlanta", "GA", "USA", "USA"],
  ["Miami", "FL", "USA", "USA"],
  ["Minneapolis", "MN", "USA", "USA"],
  ["Detroit", "MI", "USA", "USA"],
  ["Charlotte", "NC", "USA", "USA"],
  ["Salt Lake City", "UT", "USA", "USA"],
  ["Honolulu", "HI", "USA", "USA"],
  // USA metros / anchor cities over ~800k population.
  ["Dallas-Fort Worth", "TX", "USA", "USA"],
  ["Miami-Fort Lauderdale", "FL", "USA", "USA"],
  ["Fort Lauderdale", "FL", "USA", "USA"],
  ["Washington-Arlington-Alexandria", "DC/VA/MD", "USA", "USA"],
  ["Riverside-San Bernardino", "CA", "USA", "USA"],
  ["Riverside", "CA", "USA", "USA"],
  ["San Bernardino", "CA", "USA", "USA"],
  ["Anaheim", "CA", "USA", "USA"],
  ["Oakland", "CA", "USA", "USA"],
  ["Minneapolis-St. Paul", "MN", "USA", "USA"],
  ["St. Paul", "MN", "USA", "USA"],
  ["Tampa-St. Petersburg", "FL", "USA", "USA"],
  ["St. Petersburg", "FL", "USA", "USA"],
  ["Virginia Beach-Norfolk", "VA", "USA", "USA"],
  ["Virginia Beach", "VA", "USA", "USA"],
  ["Norfolk", "VA", "USA", "USA"],
  ["Providence", "RI", "USA", "USA"],
  ["Oklahoma City", "OK", "USA", "USA"],
  ["Richmond", "VA", "USA", "USA"],
  ["Louisville", "KY", "USA", "USA"],
  ["Hartford", "CT", "USA", "USA"],
  ["Buffalo", "NY", "USA", "USA"],
  ["Birmingham", "AL", "USA", "USA"],
  ["Rochester", "NY", "USA", "USA"],
  ["Grand Rapids", "MI", "USA", "USA"],
  ["Tulsa", "OK", "USA", "USA"],
  ["Fresno", "CA", "USA", "USA"],
  ["Worcester", "MA", "USA", "USA"],
  ["Omaha", "NE", "USA", "USA"],
  ["Bridgeport-Stamford", "CT", "USA", "USA"],
  ["Bridgeport", "CT", "USA", "USA"],
  ["Stamford", "CT", "USA", "USA"],
  ["Albuquerque", "NM", "USA", "USA"],
  ["Greenville", "SC", "USA", "USA"],
  ["Bakersfield", "CA", "USA", "USA"],
  ["Albany", "NY", "USA", "USA"],
  ["Knoxville", "TN", "USA", "USA"],
  ["McAllen", "TX", "USA", "USA"],
  ["Baton Rouge", "LA", "USA", "USA"],
  ["Allentown", "PA", "USA", "USA"],
  ["Columbia", "SC", "USA", "USA"],
  ["Dayton", "OH", "USA", "USA"],
  ["North Port-Sarasota", "FL", "USA", "USA"],
  ["Sarasota", "FL", "USA", "USA"],
  ["Greensboro", "NC", "USA", "USA"],
  ["Charleston", "SC", "USA", "USA"],
  ["Cape Coral", "FL", "USA", "USA"],
  ["Lakeland", "FL", "USA", "USA"],
  ["Colorado Springs", "CO", "USA", "USA"],
  ["Des Moines", "IA", "USA", "USA"],
  ["Akron", "OH", "USA", "USA"],
  ["New Haven", "CT", "USA", "USA"],
  ["Ogden", "UT", "USA", "USA"],
  ["Provo", "UT", "USA", "USA"],
  ["Madison", "WI", "USA", "USA"],
  ["Durham", "NC", "USA", "USA"],
  ["Winston-Salem", "NC", "USA", "USA"],
  ["Syracuse", "NY", "USA", "USA"],
  ["Wichita", "KS", "USA", "USA"],
  ["Toledo", "OH", "USA", "USA"],
  ["Poughkeepsie", "NY", "USA", "USA"],
  ["Palm Bay", "FL", "USA", "USA"],
  ["Harrisburg", "PA", "USA", "USA"],
  ["Little Rock", "AR", "USA", "USA"],
  ["Augusta", "GA", "USA", "USA"],
  ["Chattanooga", "TN", "USA", "USA"],
  ["Spokane", "WA", "USA", "USA"],
  ["Scranton", "PA", "USA", "USA"],
  ["Reno", "NV", "USA", "USA"],
  ["Toronto", "ON", "Canada", "CAN"],
  ["Vancouver", "BC", "Canada", "CAN"],
  ["Montreal", "QC", "Canada", "CAN"],
  ["Calgary", "AB", "Canada", "CAN"],
  ["Ottawa", "ON", "Canada", "CAN"],
  ["Ottawa-Gatineau", "ON/QC", "Canada", "CAN"],
  ["Gatineau", "QC", "Canada", "CAN"],
  ["Hamilton", "ON", "Canada", "CAN"],
  ["Kitchener-Cambridge-Waterloo", "ON", "Canada", "CAN"],
  ["Kitchener", "ON", "Canada", "CAN"],
  ["Cambridge", "ON", "Canada", "CAN"],
  ["Waterloo", "ON", "Canada", "CAN"],
  ["Mexico City", "", "Mexico", "MEX"],
  ["Guadalajara", "", "Mexico", "MEX"],
  ["Monterrey", "", "Mexico", "MEX"],
  // Europe
  ["London", "", "United Kingdom", "GBR"],
  ["Manchester", "", "United Kingdom", "GBR"],
  ["Greater Manchester", "", "United Kingdom", "GBR"],
  ["Edinburgh", "", "United Kingdom", "GBR"],
  ["Birmingham", "", "United Kingdom", "GBR"],
  ["West Midlands", "", "United Kingdom", "GBR"],
  ["Glasgow", "", "United Kingdom", "GBR"],
  ["Liverpool", "", "United Kingdom", "GBR"],
  ["Bristol", "", "United Kingdom", "GBR"],
  ["Leeds", "", "United Kingdom", "GBR"],
  ["Leeds-Bradford", "", "United Kingdom", "GBR"],
  ["Bradford", "", "United Kingdom", "GBR"],
  ["Southampton-Portsmouth", "", "United Kingdom", "GBR"],
  ["Southampton", "", "United Kingdom", "GBR"],
  ["Portsmouth", "", "United Kingdom", "GBR"],
  ["Newcastle upon Tyne", "", "United Kingdom", "GBR"],
  ["Sheffield", "", "United Kingdom", "GBR"],
  ["Nottingham", "", "United Kingdom", "GBR"],
  ["Oxford", "", "United Kingdom", "GBR"],
  ["Cambridge", "", "United Kingdom", "GBR"],
  ["Bath", "", "United Kingdom", "GBR"],
  ["Paris", "", "France", "FRA"],
  ["Lyon", "", "France", "FRA"],
  ["Marseille", "", "France", "FRA"],
  ["Nice", "", "France", "FRA"],
  ["Toulouse", "", "France", "FRA"],
  ["Berlin", "", "Germany", "DEU"],
  ["Munich", "", "Germany", "DEU"],
  ["Hamburg", "", "Germany", "DEU"],
  ["Frankfurt", "", "Germany", "DEU"],
  ["Cologne", "", "Germany", "DEU"],
  ["Stuttgart", "", "Germany", "DEU"],
  ["Madrid", "", "Spain", "ESP"],
  ["Barcelona", "", "Spain", "ESP"],
  ["Valencia", "", "Spain", "ESP"],
  ["Seville", "", "Spain", "ESP"],
  ["Rome", "", "Italy", "ITA"],
  ["Milan", "", "Italy", "ITA"],
  ["Florence", "", "Italy", "ITA"],
  ["Naples", "", "Italy", "ITA"],
  ["Venice", "", "Italy", "ITA"],
  ["Amsterdam", "", "Netherlands", "NLD"],
  ["Rotterdam", "", "Netherlands", "NLD"],
  ["Brussels", "", "Belgium", "BEL"],
  ["Zurich", "", "Switzerland", "CHE"],
  ["Geneva", "", "Switzerland", "CHE"],
  ["Vienna", "", "Austria", "AUT"],
  ["Prague", "", "Czech Republic", "CZE"],
  ["Warsaw", "", "Poland", "POL"],
  ["Krakow", "", "Poland", "POL"],
  ["Budapest", "", "Hungary", "HUN"],
  ["Lisbon", "", "Portugal", "PRT"],
  ["Porto", "", "Portugal", "PRT"],
  ["Dublin", "", "Ireland", "IRL"],
  ["Copenhagen", "", "Denmark", "DNK"],
  ["Stockholm", "", "Sweden", "SWE"],
  ["Oslo", "", "Norway", "NOR"],
  ["Helsinki", "", "Finland", "FIN"],
  ["Athens", "", "Greece", "GRC"],
  ["Bucharest", "", "Romania", "ROU"],
  ["Istanbul", "", "Turkey", "TUR"],
  ["Ankara", "", "Turkey", "TUR"],
  // Asia
  ["Tokyo", "", "Japan", "JPN"],
  ["Osaka", "", "Japan", "JPN"],
  ["Kyoto", "", "Japan", "JPN"],
  ["Seoul", "", "South Korea", "KOR"],
  ["Busan", "", "South Korea", "KOR"],
  ["Beijing", "", "China", "CHN"],
  ["Shanghai", "", "China", "CHN"],
  ["Shenzhen", "", "China", "CHN"],
  ["Guangzhou", "", "China", "CHN"],
  ["Hong Kong", "", "China", "HKG"],
  ["Taipei", "", "Taiwan", "TWN"],
  ["Singapore", "", "Singapore", "SGP"],
  ["Bangkok", "", "Thailand", "THA"],
  ["Chiang Mai", "", "Thailand", "THA"],
  ["Kuala Lumpur", "", "Malaysia", "MYS"],
  ["Jakarta", "", "Indonesia", "IDN"],
  ["Bali", "", "Indonesia", "IDN"],
  ["Manila", "", "Philippines", "PHL"],
  ["Ho Chi Minh City", "", "Vietnam", "VNM"],
  ["Hanoi", "", "Vietnam", "VNM"],
  ["Mumbai", "Maharashtra", "India", "IND"],
  ["Delhi", "NCR", "India", "IND"],
  ["New Delhi", "NCR", "India", "IND"],
  ["Bangalore", "Karnataka", "India", "IND"],
  ["Chennai", "Tamil Nadu", "India", "IND"],
  ["Kolkata", "West Bengal", "India", "IND"],
  ["Hyderabad", "Telangana", "India", "IND"],
  ["Pune", "Maharashtra", "India", "IND"],
  ["Ahmedabad", "Gujarat", "India", "IND"],
  ["Surat", "Gujarat", "India", "IND"],
  ["Jaipur", "Rajasthan", "India", "IND"],
  ["Lucknow", "Uttar Pradesh", "India", "IND"],
  ["Kanpur", "Uttar Pradesh", "India", "IND"],
  ["Nagpur", "Maharashtra", "India", "IND"],
  ["Indore", "Madhya Pradesh", "India", "IND"],
  ["Bhopal", "Madhya Pradesh", "India", "IND"],
  ["Patna", "Bihar", "India", "IND"],
  ["Vadodara", "Gujarat", "India", "IND"],
  ["Coimbatore", "Tamil Nadu", "India", "IND"],
  ["Kochi", "Kerala", "India", "IND"],
  ["Thiruvananthapuram", "Kerala", "India", "IND"],
  ["Visakhapatnam", "Andhra Pradesh", "India", "IND"],
  ["Vijayawada", "Andhra Pradesh", "India", "IND"],
  ["Guntur", "Andhra Pradesh", "India", "IND"],
  ["Nellore", "Andhra Pradesh", "India", "IND"],
  ["Kurnool", "Andhra Pradesh", "India", "IND"],
  ["Rajahmundry", "Andhra Pradesh", "India", "IND"],
  ["Kakinada", "Andhra Pradesh", "India", "IND"],
  ["Tirupati", "Andhra Pradesh", "India", "IND"],
  ["Anantapur", "Andhra Pradesh", "India", "IND"],
  ["Kadapa", "Andhra Pradesh", "India", "IND"],
  ["Eluru", "Andhra Pradesh", "India", "IND"],
  ["Ongole", "Andhra Pradesh", "India", "IND"],
  ["Vizianagaram", "Andhra Pradesh", "India", "IND"],
  ["Warangal", "Telangana", "India", "IND"],
  ["Karimnagar", "Telangana", "India", "IND"],
  ["Nizamabad", "Telangana", "India", "IND"],
  ["Khammam", "Telangana", "India", "IND"],
  ["Ramagundam", "Telangana", "India", "IND"],
  ["Mahbubnagar", "Telangana", "India", "IND"],
  ["Nalgonda", "Telangana", "India", "IND"],
  ["Adilabad", "Telangana", "India", "IND"],
  ["Siddipet", "Telangana", "India", "IND"],
  ["Suryapet", "Telangana", "India", "IND"],
  ["Madurai", "Tamil Nadu", "India", "IND"],
  ["Tiruchirappalli", "Tamil Nadu", "India", "IND"],
  ["Hubballi-Dharwad", "Karnataka", "India", "IND"],
  ["Chandigarh", "Punjab/Haryana", "India", "IND"],
  ["Amritsar", "Punjab", "India", "IND"],
  ["Ludhiana", "Punjab", "India", "IND"],
  ["Jalandhar", "Punjab", "India", "IND"],
  ["Patiala", "Punjab", "India", "IND"],
  ["Dehradun", "Uttarakhand", "India", "IND"],
  ["Shimla", "Himachal Pradesh", "India", "IND"],
  ["Srinagar", "J&K", "India", "IND"],
  ["Jammu", "J&K", "India", "IND"],
  ["Varanasi", "Uttar Pradesh", "India", "IND"],
  ["Agra", "Uttar Pradesh", "India", "IND"],
  ["Allahabad", "Uttar Pradesh", "India", "IND"],
  ["Noida", "Uttar Pradesh", "India", "IND"],
  ["Gurgaon", "Haryana", "India", "IND"],
  ["Faridabad", "Haryana", "India", "IND"],
  ["Ranchi", "Jharkhand", "India", "IND"],
  ["Guwahati", "Assam", "India", "IND"],
  ["Bhubaneswar", "Odisha", "India", "IND"],
  ["Mysore", "Karnataka", "India", "IND"],
  ["Mangalore", "Karnataka", "India", "IND"],
  ["Udaipur", "Rajasthan", "India", "IND"],
  ["Jodhpur", "Rajasthan", "India", "IND"],
  ["Goa", "Goa", "India", "IND"],
  ["Rishikesh", "Uttarakhand", "India", "IND"],
  ["Islamabad", "", "Pakistan", "PAK"],
  ["Lahore", "Punjab", "Pakistan", "PAK"],
  ["Karachi", "Sindh", "Pakistan", "PAK"],
  ["Rawalpindi", "Punjab", "Pakistan", "PAK"],
  ["Faisalabad", "Punjab", "Pakistan", "PAK"],
  ["Dhaka", "", "Bangladesh", "BGD"],
  ["Colombo", "", "Sri Lanka", "LKA"],
  ["Kathmandu", "", "Nepal", "NPL"],
  // Middle East
  ["Dubai", "", "UAE", "ARE"],
  ["Abu Dhabi", "", "UAE", "ARE"],
  ["Riyadh", "", "Saudi Arabia", "SAU"],
  ["Jeddah", "", "Saudi Arabia", "SAU"],
  ["Doha", "", "Qatar", "QAT"],
  ["Tel Aviv", "", "Israel", "ISR"],
  ["Jerusalem", "", "Israel", "ISR"],
  ["Amman", "", "Jordan", "JOR"],
  ["Beirut", "", "Lebanon", "LBN"],
  ["Kuwait City", "", "Kuwait", "KWT"],
  // Africa
  ["Cairo", "", "Egypt", "EGY"],
  ["Alexandria", "", "Egypt", "EGY"],
  ["Lagos", "", "Nigeria", "NGA"],
  ["Abuja", "", "Nigeria", "NGA"],
  ["Nairobi", "", "Kenya", "KEN"],
  ["Johannesburg", "", "South Africa", "ZAF"],
  ["Cape Town", "", "South Africa", "ZAF"],
  ["Durban", "", "South Africa", "ZAF"],
  ["Accra", "", "Ghana", "GHA"],
  ["Addis Ababa", "", "Ethiopia", "ETH"],
  ["Casablanca", "", "Morocco", "MAR"],
  ["Marrakech", "", "Morocco", "MAR"],
  ["Tunis", "", "Tunisia", "TUN"],
  ["Dar es Salaam", "", "Tanzania", "TZA"],
  ["Kampala", "", "Uganda", "UGA"],
  ["Kigali", "", "Rwanda", "RWA"],
  ["Dakar", "", "Senegal", "SEN"],
  // Oceania
  ["Sydney", "NSW", "Australia", "AUS"],
  ["Melbourne", "VIC", "Australia", "AUS"],
  ["Brisbane", "QLD", "Australia", "AUS"],
  ["Perth", "WA", "Australia", "AUS"],
  ["Adelaide", "SA", "Australia", "AUS"],
  ["Auckland", "", "New Zealand", "NZL"],
  ["Wellington", "", "New Zealand", "NZL"],
  // South America
  ["São Paulo", "", "Brazil", "BRA"],
  ["Rio de Janeiro", "", "Brazil", "BRA"],
  ["Brasília", "", "Brazil", "BRA"],
  ["Buenos Aires", "", "Argentina", "ARG"],
  ["Mendoza", "", "Argentina", "ARG"],
  ["Santiago", "", "Chile", "CHL"],
  ["Lima", "", "Peru", "PER"],
  ["Bogotá", "", "Colombia", "COL"],
  ["Medellín", "", "Colombia", "COL"],
  ["Quito", "", "Ecuador", "ECU"],
  ["Montevideo", "", "Uruguay", "URY"],
  ["Caracas", "", "Venezuela", "VEN"],
  // Central America & Caribbean
  ["San José", "", "Costa Rica", "CRI"],
  ["Panama City", "", "Panama", "PAN"],
  ["Havana", "", "Cuba", "CUB"],
  ["Kingston", "", "Jamaica", "JAM"],
  ["San Juan", "PR", "USA", "USA"],
  // More US cities
  ["New Orleans", "LA", "USA", "USA"],
  ["Raleigh", "NC", "USA", "USA"],
  ["Columbus", "OH", "USA", "USA"],
  ["Indianapolis", "IN", "USA", "USA"],
  ["San Jose", "CA", "USA", "USA"],
  ["Jacksonville", "FL", "USA", "USA"],
  ["Tampa", "FL", "USA", "USA"],
  ["Orlando", "FL", "USA", "USA"],
  ["Pittsburgh", "PA", "USA", "USA"],
  ["Cleveland", "OH", "USA", "USA"],
  ["Cincinnati", "OH", "USA", "USA"],
  ["Kansas City", "MO", "USA", "USA"],
  ["St. Louis", "MO", "USA", "USA"],
  ["Milwaukee", "WI", "USA", "USA"],
  ["Sacramento", "CA", "USA", "USA"],
  ["Tucson", "AZ", "USA", "USA"],
  ["Memphis", "TN", "USA", "USA"],
  ["Baltimore", "MD", "USA", "USA"],
  ["Boise", "ID", "USA", "USA"],
  ["Anchorage", "AK", "USA", "USA"],
  // More Europe
  ["Reykjavik", "", "Iceland", "ISL"],
  ["Tallinn", "", "Estonia", "EST"],
  ["Riga", "", "Latvia", "LVA"],
  ["Vilnius", "", "Lithuania", "LTU"],
  ["Ljubljana", "", "Slovenia", "SVN"],
  ["Zagreb", "", "Croatia", "HRV"],
  ["Belgrade", "", "Serbia", "SRB"],
  ["Sofia", "", "Bulgaria", "BGR"],
  ["Bratislava", "", "Slovakia", "SVK"],
  ["Tbilisi", "", "Georgia", "GEO"],
  ["Yerevan", "", "Armenia", "ARM"],
  ["Baku", "", "Azerbaijan", "AZE"],
  ["Kyiv", "", "Ukraine", "UKR"],
  ["Moscow", "", "Russia", "RUS"],
  ["St. Petersburg", "", "Russia", "RUS"],
  // More Asia
  ["Nagoya", "", "Japan", "JPN"],
  ["Yokohama", "", "Japan", "JPN"],
  ["Fukuoka", "", "Japan", "JPN"],
  ["Hangzhou", "", "China", "CHN"],
  ["Chengdu", "", "China", "CHN"],
  ["Wuhan", "", "China", "CHN"],
  ["Nanjing", "", "China", "CHN"],
  ["Suzhou", "", "China", "CHN"],
  ["Phnom Penh", "", "Cambodia", "KHM"],
  ["Vientiane", "", "Laos", "LAO"],
  ["Yangon", "", "Myanmar", "MMR"],
  ["Ulaanbaatar", "", "Mongolia", "MNG"],
  // More Africa
  ["Lusaka", "", "Zambia", "ZMB"],
  ["Harare", "", "Zimbabwe", "ZWE"],
  ["Maputo", "", "Mozambique", "MOZ"],
  ["Windhoek", "", "Namibia", "NAM"],
  ["Luanda", "", "Angola", "AGO"],
  ["Kinshasa", "", "DR Congo", "COD"],
  ["Algiers", "", "Algeria", "DZA"],
  ["Tripoli", "", "Libya", "LBY"],
  // More Middle East
  ["Muscat", "", "Oman", "OMN"],
  ["Manama", "", "Bahrain", "BHR"],
  ["Baghdad", "", "Iraq", "IRQ"],
  ["Tehran", "", "Iran", "IRN"],
  // More South America
  ["Asunción", "", "Paraguay", "PRY"],
  ["La Paz", "", "Bolivia", "BOL"],
  ["Georgetown", "", "Guyana", "GUY"],
  ["Cartagena", "", "Colombia", "COL"],
  ["Cali", "", "Colombia", "COL"],
  ["Cusco", "", "Peru", "PER"],
  ["Valparaíso", "", "Chile", "CHL"],
  ["Córdoba", "", "Argentina", "ARG"],
  ["Salvador", "", "Brazil", "BRA"],
  ["Fortaleza", "", "Brazil", "BRA"],
  ["Curitiba", "", "Brazil", "BRA"],
  ["Recife", "", "Brazil", "BRA"],
  // More Canada
  ["Edmonton", "AB", "Canada", "CAN"],
  ["Winnipeg", "MB", "Canada", "CAN"],
  ["Quebec City", "QC", "Canada", "CAN"],
  ["Halifax", "NS", "Canada", "CAN"],
  ["Victoria", "BC", "Canada", "CAN"],
];

export const WORLD_CITIES: City[] = RAW.map(([name, region, country, countryCode]) => ({
  name,
  region,
  country,
  countryCode,
  label: region
    ? `${name}, ${region}, ${country}`
    : `${name}, ${country}`,
}));

const PRIORITY_COUNTRIES = new Set([
  "USA",
  "CAN",
  "IND",
  "GBR",
  "FRA",
  "DEU",
  "ESP",
  "ITA",
  "NLD",
  "BEL",
  "CHE",
  "AUT",
  "CZE",
  "POL",
  "HUN",
  "PRT",
  "IRL",
  "DNK",
  "SWE",
  "NOR",
  "FIN",
  "GRC",
  "ROU",
]);

const REGION_ALIASES: Record<string, string[]> = {
  TX: ["texas"],
  CA: ["california"],
  NY: ["new york state"],
  IL: ["illinois"],
  AZ: ["arizona"],
  PA: ["pennsylvania"],
  WA: ["washington state"],
  CO: ["colorado"],
  FL: ["florida"],
  NC: ["north carolina"],
  TN: ["tennessee"],
  MA: ["massachusetts"],
  OR: ["oregon"],
  NV: ["nevada"],
  GA: ["georgia"],
  DC: ["district of columbia", "washington dc"],
  ON: ["ontario"],
  BC: ["british columbia"],
  QC: ["quebec"],
  AB: ["alberta"],
  NS: ["nova scotia"],
  MB: ["manitoba"],
  NCR: ["delhi ncr", "national capital region"],
  "Punjab/Haryana": ["punjab", "haryana"],
  Telangana: ["telangana", "hyderabad state"],
  "Andhra Pradesh": ["andhra", "andhra pradesh", "ap"],
  "Tamil Nadu": ["tamil nadu", "tn"],
  Karnataka: ["karnataka"],
  Kerala: ["kerala"],
};

const FEATURED_CITY_NAMES = new Set([
  "New York",
  "Los Angeles",
  "Chicago",
  "Houston",
  "Dallas",
  "Plano",
  "San Francisco",
  "Toronto",
  "Vancouver",
  "London",
  "Paris",
  "Berlin",
  "Madrid",
  "Rome",
  "Amsterdam",
  "Dublin",
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Hyderabad",
  "Vijayawada",
  "Visakhapatnam",
  "Chandigarh",
]);

function cityScore(city: City, q: string): number {
  const name = normalize(city.name);
  const region = normalize(city.region);
  const country = normalize(city.country);
  const label = normalize(city.label);
  const aliasBucket = REGION_ALIASES[city.region] || [];
  const aliases = aliasBucket.map((a) => a.toLowerCase());
  const priorityBonus = PRIORITY_COUNTRIES.has(city.countryCode) ? 12 : 0;

  if (!q) {
    const featuredBonus = FEATURED_CITY_NAMES.has(city.name) ? 60 : 0;
    return featuredBonus + priorityBonus + (city.countryCode === "USA" ? 8 : 0);
  }

  let score = 0;
  if (name === q) score += 140;
  if (name.startsWith(q)) score += 90;
  if (name.includes(q)) score += 55;
  if (region.includes(q)) score += 40;
  if (country.includes(q)) score += 38;
  if (label.includes(q)) score += 25;
  if (aliases.some((a) => a.includes(q))) score += 45;

  if (score > 0) {
    score += priorityBonus;
  }

  return score;
}

export function getPopularCities(limit = 14): City[] {
  return WORLD_CITIES
    .map((city) => ({ city, score: cityScore(city, "") }))
    .sort((a, b) => b.score - a.score || a.city.name.localeCompare(b.city.name))
    .slice(0, limit)
    .map((entry) => entry.city);
}

/**
 * Search cities by query string with priority ranking for
 * USA, Canada, Europe, and India. Empty query returns popular cities.
 */
export function searchCities(query: string, limit = 14): City[] {
  const q = normalize(query.trim());
  if (!q) return getPopularCities(limit);

  return WORLD_CITIES
    .map((city) => ({ city, score: cityScore(city, q) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.city.name.localeCompare(b.city.name))
    .slice(0, limit)
    .map((entry) => entry.city);
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findCityByInput(value: string): City | null {
  const q = normalize(value);
  if (!q) return null;

  for (const city of WORLD_CITIES) {
    if (normalize(city.label) === q) return city;
  }

  const exactNameMatches = WORLD_CITIES.filter((city) => normalize(city.name) === q);
  if (exactNameMatches.length > 0) {
    return exactNameMatches
      .map((city) => ({ city, score: cityScore(city, q) }))
      .sort((a, b) => b.score - a.score || a.city.label.localeCompare(b.city.label))[0].city;
  }

  const ranked = searchCities(normalize(value), 1);
  return ranked[0] || null;
}

export function inferCountryCodeFromCity(value: string): string | null {
  const matched = findCityByInput(value);
  return matched?.countryCode || null;
}

/** [lat, lng] for major cities. Keys are normalize(label). GeoJSON/D3 use [lng, lat] – invert when projecting. */
const CITY_COORDINATES: Record<string, [number, number]> = {
  "dallas tx usa": [32.7767, -96.797],
  "dallas tx": [32.7767, -96.797],
  "dallas": [32.7767, -96.797],
  "new york ny usa": [40.7128, -74.006],
  "los angeles ca usa": [34.0522, -118.2437],
  "chicago il usa": [41.8781, -87.6298],
  "houston tx usa": [29.7604, -95.3698],
  "phoenix az usa": [33.4484, -112.074],
  "philadelphia pa usa": [39.9526, -75.1652],
  "san antonio tx usa": [29.4241, -98.4936],
  "san diego ca usa": [32.7157, -117.1611],
  "san francisco ca usa": [37.7749, -122.4194],
  "san jose ca usa": [37.3382, -121.8863],
  "san jose": [37.3382, -121.8863],
  "cleveland oh usa": [41.4993, -81.6944],
  "cleveland": [41.4993, -81.6944],
  "austin tx usa": [30.2672, -97.7431],
  "el paso tx usa": [31.7619, -106.485],
  "el paso tx": [31.7619, -106.485],
  "el paso": [31.7619, -106.485],
  "seattle wa usa": [47.6062, -122.3321],
  "denver co usa": [39.7392, -104.9903],
  "washington dc usa": [38.9072, -77.0369],
  "boston ma usa": [42.3601, -71.0589],
  "miami fl usa": [25.7617, -80.1918],
  "atlanta ga usa": [33.749, -84.388],
  "london": [51.5074, -0.1278],
  "paris": [48.8566, 2.3522],
  "berlin": [52.52, 13.405],
  "madrid": [40.4168, -3.7038],
  "rome": [41.9028, 12.4964],
  "amsterdam": [52.3676, 4.9041],
  "dublin": [53.3498, -6.2603],
  "sydney nsw australia": [-33.8688, 151.2093],
  "melbourne vic australia": [-37.8136, 144.9631],
  "toronto on canada": [43.6532, -79.3832],
  "vancouver bc canada": [49.2827, -123.1207],
  "montreal qc canada": [45.5017, -73.5673],
  "tokyo": [35.6762, 139.6503],
  "mumbai maharashtra india": [19.076, 72.8777],
  "delhi ncr india": [28.7041, 77.1025],
  "bangalore karnataka india": [12.9716, 77.5946],
  "hyderabad telangana india": [17.385, 78.4867],
  "visakhapatnam andhra pradesh india": [17.6868, 83.2185],
  "vijayawada andhra pradesh india": [16.5062, 80.648],
  "guntur andhra pradesh india": [16.3067, 80.4365],
  "nellore andhra pradesh india": [14.4426, 79.9865],
  "kurnool andhra pradesh india": [15.8281, 78.0373],
  "rajahmundry andhra pradesh india": [17.0005, 81.804],
  "kakinada andhra pradesh india": [16.9891, 82.2475],
  "tirupati andhra pradesh india": [13.6288, 79.4192],
  "anantapur andhra pradesh india": [14.6819, 77.6006],
  "kadapa andhra pradesh india": [14.4673, 78.8242],
  "eluru andhra pradesh india": [16.7107, 81.0952],
  "ongole andhra pradesh india": [15.5057, 80.0499],
  "vizianagaram andhra pradesh india": [18.1067, 83.3956],
  "warangal telangana india": [17.9689, 79.5941],
  "karimnagar telangana india": [18.4386, 79.1288],
  "nizamabad telangana india": [18.6725, 78.0941],
  "khammam telangana india": [17.2473, 80.1514],
  "ramagundam telangana india": [18.8008, 79.4521],
  "mahbubnagar telangana india": [16.7375, 78.0081],
  "nalgonda telangana india": [17.0575, 79.2684],
  "adilabad telangana india": [19.6641, 78.532],
  "siddipet telangana india": [18.1018, 78.852],
  "suryapet telangana india": [17.1314, 79.6336],
  "madurai tamil nadu india": [9.9252, 78.1198],
  "tiruchirappalli tamil nadu india": [10.7905, 78.7047],
  "hubballi dharwad karnataka india": [15.3647, 75.124],
};

export function getCityCoordinates(locationCity: string): [number, number] | null {
  const q = normalize(locationCity);
  if (!q) return null;
  const exact = CITY_COORDINATES[q];
  if (exact) return exact;
  const city = findCityByInput(locationCity);
  if (city) {
    const labelNorm = normalize(city.label);
    const nameNorm = normalize(city.name);
    return CITY_COORDINATES[labelNorm] || CITY_COORDINATES[nameNorm] || null;
  }

  // Fallback for full addresses or slightly noisier location strings:
  // find the longest known city/label token embedded in the input.
  let bestKey: string | null = null;
  let bestLength = 0;
  for (const knownKey of Object.keys(CITY_COORDINATES)) {
    if (q.includes(knownKey) || knownKey.includes(q)) {
      if (knownKey.length > bestLength) {
        bestKey = knownKey;
        bestLength = knownKey.length;
      }
    }
  }
  return bestKey ? CITY_COORDINATES[bestKey] : null;
}
