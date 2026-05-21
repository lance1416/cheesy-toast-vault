import type { KnipConfig } from "knip";

const config: KnipConfig = {
  ignoreDependencies: [
    "@prisma/client", // runtime peer dep for generated client at src/generated/prisma/
    "pino-pretty", // loaded dynamically via pino transport string, never imported directly
  ],
};

export default config;
