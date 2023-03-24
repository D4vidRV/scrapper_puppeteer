import puppeteer from "puppeteer";
import randomUserAgent from "random-useragent";
import { MongoClient } from "mongodb";
import chromium from "chrome-aws-lambda";

export const executeTestScrapper = async () => {
  console.log("Ejecutando test");

  const userAgent = randomUserAgent.getRandom();
  // MONGODB CONFIG
  const uri = process.env.MONGODB ?? "";
  const client = new MongoClient(uri);

  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: '/usr/bin/chromium-browser',
    headless: true,
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(40000);

  const subastas: any = {
    san_carlos:
      "http://www.aurora-applnx.com/aurora_clientes/subastas/index.php?c=1",
    el_progreso_barranca:
      "http://www.aurora-applnx.com/aurora_clientes/subastas/index.php?c=2",
    el_progreso_nicoya:
      "http://www.aurora-applnx.com/aurora_clientes/subastas/index.php?c=3",
    maleco:
      "http://www.aurora-applnx.com/aurora_clientes/subastas/index.php?c=4",
    montecillos:
      "http://www.aurora-applnx.com/aurora_clientes/subastas/index.php?c=5",
    el_progreso_limonal:
      "http://www.aurora-applnx.com/aurora_clientes/subastas/index.php?c=7",
    el_progreso_parrita:
      "http://www.aurora-applnx.com/aurora_clientes/subastas/index.php?c=6",
  };

  for (const key in subastas) {
    console.log(`-----------------${key}----------------------`);

    try {
      await page.goto(subastas[key]);
      await page.waitForSelector("table");

      const tablaFilas = await page.$x("//tbody//tr");
      let celdaTipoAnimal;
      let celdaRangoPeso;
      let celdaPrecioMax;
      let celdaPrecioMin;
      let celdaPrecioProm;
      let celdaFecha;

      for (const [index, value] of tablaFilas.reverse().entries()) {
        const celdas = await value.$x("./td");

        celdaTipoAnimal = celdas[0];
        celdaRangoPeso = celdas[1];
        celdaPrecioMax = celdas[2];
        celdaPrecioMin = celdas[3];
        celdaPrecioProm = celdas[4];
        celdaFecha = celdas[5];

        let tipoAnimalTexto = await page.evaluate((celdaTipoAnimal: any) => {
          return celdaTipoAnimal?.innerText;
        }, celdaTipoAnimal);

        tipoAnimalTexto = tipoAnimalTexto.replace(/^\d+\.\s/, "");

        const rangoPesoTexto = await page.evaluate((celdaRangoPeso: any) => {
          return celdaRangoPeso?.innerText;
        }, celdaRangoPeso);

        const precioMaxTexto = await page.evaluate((celdaPrecioMax: any) => {
          return celdaPrecioMax?.innerText;
        }, celdaPrecioMax);

        const precioMinTexto = await page.evaluate((celdaPrecioMin: any) => {
          return celdaPrecioMin?.innerText;
        }, celdaPrecioMin);

        const precioPromTexto = await page.evaluate((celdaPrecioProm: any) => {
          return celdaPrecioProm?.innerText;
        }, celdaPrecioProm);

        const fechaTexto = await page.evaluate((celdaFecha: any) => {
          return celdaFecha?.innerText;
        }, celdaFecha);

        console.log(`TIPO ANIMAL: ${tipoAnimalTexto}`);
      }
    } catch (error) {
      console.log(error);
    }
  }
  browser.close();
};
