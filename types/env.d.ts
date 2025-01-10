declare global {
  namespace NodeJS {
    interface ProcessEnv {
      WEATHER_API_BASE_URL: string;
      WEATHER_API_KEY: string;
      WEATHER_API_UNITS: string;
    }
  }
}

export {};
