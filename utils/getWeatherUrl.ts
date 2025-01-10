export const getWeatherUrl = (lat: number, long: number): string => {
  const url =
    new URL("/weather", process.env.WEATHER_API_BASE_URL as string).toString() +
    `?units=${process.env.WEATHER_API_UNITS}` +
    `&lat=${lat}` +
    `&lon=${long}` +
    `&appid=${process.env.WEATHER_API_KEY}`;
  console.log("Generated url:", url);
  return url;
};
