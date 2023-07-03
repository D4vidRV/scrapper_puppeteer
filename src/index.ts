import * as dotenv from "dotenv";
import * as cron from "node-cron";
import { executeScraper } from "./scraper";
import { executeUpdateScraper } from "./update_scraper";
import { executeTestScrapper } from "./test_scrapper";

dotenv.config();

const task = cron.schedule("*/2 * * * *", () => {
  executeUpdateScraper();
});
