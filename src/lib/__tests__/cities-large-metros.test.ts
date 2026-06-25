import { describe, expect, it } from "vitest";

import { findCityByInput, getCityCoordinates, searchCities } from "../cities";

const LARGE_USA_CITY_AND_METRO_INPUTS = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Dallas-Fort Worth",
  "Houston",
  "Washington-Arlington-Alexandria",
  "Philadelphia",
  "Atlanta",
  "Miami-Fort Lauderdale",
  "Phoenix",
  "Boston",
  "Riverside-San Bernardino",
  "San Francisco",
  "Detroit",
  "Seattle",
  "Minneapolis-St. Paul",
  "San Diego",
  "Tampa-St. Petersburg",
  "Denver",
  "Baltimore",
  "St. Louis",
  "Orlando",
  "Charlotte",
  "San Antonio",
  "Portland",
  "Sacramento",
  "Pittsburgh",
  "Austin",
  "Las Vegas",
  "Cincinnati",
  "Kansas City",
  "Columbus",
  "Indianapolis",
  "Cleveland",
  "San Jose",
  "Nashville",
  "Virginia Beach",
  "Providence",
  "Jacksonville",
  "Milwaukee",
  "Oklahoma City",
  "Raleigh",
  "Memphis",
  "Richmond",
  "Louisville",
  "New Orleans",
  "Salt Lake City",
  "Hartford",
  "Buffalo",
  "Birmingham, AL",
  "Rochester",
  "Grand Rapids",
  "Tucson",
  "Honolulu",
  "Tulsa",
  "Fresno",
  "Worcester",
  "Omaha",
  "Bridgeport-Stamford",
  "Albuquerque",
  "Greenville",
  "Bakersfield",
  "Albany",
  "Knoxville",
  "McAllen",
  "Baton Rouge",
  "Allentown",
  "El Paso",
  "Columbia",
  "Dayton",
  "North Port-Sarasota",
  "Greensboro",
  "Charleston",
  "Cape Coral",
  "Lakeland",
  "Colorado Springs",
  "Des Moines",
  "Akron",
  "New Haven",
  "Ogden",
  "Provo",
  "Madison",
  "Durham",
  "Winston-Salem",
  "Syracuse",
  "Wichita",
  "Toledo",
  "Poughkeepsie",
  "Palm Bay",
  "Harrisburg",
  "Little Rock",
  "Augusta",
  "Chattanooga",
  "Spokane",
  "Scranton",
  "Reno",
];

const LARGE_CANADA_CITY_AND_METRO_INPUTS = [
  "Toronto",
  "Montreal",
  "Vancouver",
  "Ottawa-Gatineau",
  "Calgary",
  "Edmonton",
  "Quebec City",
  "Winnipeg",
  "Hamilton",
  "Kitchener-Cambridge-Waterloo",
];

const LARGE_UK_CITY_AND_METRO_INPUTS = [
  "London",
  "Greater Manchester",
  "Manchester",
  "Birmingham, United Kingdom",
  "West Midlands",
  "Leeds-Bradford",
  "Leeds",
  "Bradford",
  "Glasgow",
  "Southampton-Portsmouth",
  "Southampton",
  "Portsmouth",
  "Liverpool",
  "Newcastle upon Tyne",
  "Sheffield",
  "Nottingham",
];

const LARGE_INDIAN_PUNJAB_CITY_INPUTS = [
  "Ludhiana",
  "Amritsar",
  "Jalandhar",
];

const SOUTH_INDIAN_CITY_INPUTS = [
  "Vijayawada",
  "Guntur",
  "Nellore",
  "Kurnool",
  "Rajahmundry",
  "Kakinada",
  "Tirupati",
  "Anantapur",
  "Kadapa",
  "Eluru",
  "Ongole",
  "Vizianagaram",
  "Warangal",
  "Karimnagar",
  "Nizamabad",
  "Khammam",
  "Ramagundam",
  "Mahbubnagar",
  "Nalgonda",
  "Adilabad",
  "Siddipet",
  "Suryapet",
  "Madurai",
  "Tiruchirappalli",
  "Hubballi-Dharwad",
];

describe("large city and metro coverage", () => {
  it.each([
    ["USA", LARGE_USA_CITY_AND_METRO_INPUTS, "USA"],
    ["Canada", LARGE_CANADA_CITY_AND_METRO_INPUTS, "CAN"],
    ["United Kingdom", LARGE_UK_CITY_AND_METRO_INPUTS, "GBR"],
    ["Indian Punjab", LARGE_INDIAN_PUNJAB_CITY_INPUTS, "IND"],
    ["South India", SOUTH_INDIAN_CITY_INPUTS, "IND"],
  ])("makes large %s city/metro inputs choosable", (_name, inputs, countryCode) => {
    for (const input of inputs) {
      const found = findCityByInput(input);
      expect(found, input).toBeTruthy();
      expect(found?.countryCode, input).toBe(countryCode);
    }
  });

  it("surfaces newly added metro names in search results", () => {
    expect(searchCities("kitchener", 5).some((city) => city.name === "Kitchener-Cambridge-Waterloo")).toBe(true);
    expect(searchCities("leeds bradford", 5).some((city) => city.name === "Leeds-Bradford")).toBe(true);
    expect(searchCities("riverside san bernardino", 5).some((city) => city.name === "Riverside-San Bernardino")).toBe(true);
  });

  it("finds coordinates for major Telangana and Andhra Pradesh cities", () => {
    for (const input of ["Vijayawada", "Warangal", "Tirupati", "Khammam", "Rajahmundry"]) {
      expect(getCityCoordinates(input), input).toBeTruthy();
    }
  });
});
