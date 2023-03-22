import { executeScraper } from "./scraper";
import { executeUpdateScraper } from "./update_scraper";
import * as cron from "node-cron";
import * as dotenv from "dotenv";

dotenv.config();

const task = cron.schedule("30 17 * * *", () => {
  executeUpdateScraper();
});
