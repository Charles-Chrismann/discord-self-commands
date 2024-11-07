declare namespace NodeJS {
  interface ProcessEnv {
    DISCORD_TOKEN: string;
    SELF_DISCORD_ID: string;
    BASE_API_URL: string;
    COMMAND_PREFIX: string;
    LOG_OP: "true" | "false";
    LOG_DATA: "true" | "false";
  }
}