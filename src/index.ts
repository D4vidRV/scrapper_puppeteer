import { executeScraper } from "./scraper";
import { executeUpdateScraper } from "./update_scraper";

function init(): void {
  executeUpdateScraper();
}

init();
