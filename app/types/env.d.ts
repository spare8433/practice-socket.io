declare namespace NodeJS {
  interface ProcessEnv {
    readonly MONGODB_URL: string;
    readonly MONGODB_NAME: string;
  }
}
