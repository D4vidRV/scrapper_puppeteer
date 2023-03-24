import randomUserAgent from "random-useragent";
import { MongoClient } from "mongodb";
import chromium from "chrome-aws-lambda";

export const executeUpdateScraper = async () => {
  console.log("Ejecutando script para actualizar registros!!");

  // PUPPETEER CONFIG
  const userAgent = randomUserAgent.getRandom();

  // MONGODB CONFIG
  const uri = process.env.MONGODB ?? "";
  const client = new MongoClient(uri);

  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: "usr/bin/chromium-browser",
    headless: true,
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(40000);
  page.setViewport({ width: 1920, height: 1080 });

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

  await client.connect();
  console.log("Conexión a MongoDB exitosa.");

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

      const database = client.db("fincaticadb");
      const collection = database.collection("auctions");

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

        // Date fetching
        const fechaLocal = new Date(Date.parse(fechaTexto));
        const fechaUTC = new Date(fechaLocal.toISOString());

        const filtro = {
          name: key,
        };

        const nuevoPrice = {
          animaltype: tipoAnimalTexto,
          weightRange: rangoPesoTexto,
          maxPrice: precioMaxTexto,
          minPrice: precioMinTexto,
          averagePrice: precioPromTexto,
          date: fechaUTC,
        };

        // Find the document by field "name"
        const auction = await collection.findOne({ name: key });

        console.log(auction?.last_auction);
        console.log(fechaUTC);

        if (auction?.last_auction >= fechaUTC) {
          console.log(
            `LOS REGISTROS DE LA WEB DE LA SUBASTA ${key} NO SE HAN ACTUALIZADO, FECHA: ${fechaUTC
              .toISOString()
              .substring(0, 10)}`
          );
          break;
        }

        // Update the document with the new registry of prices
        const result = await collection.updateOne(
          { name: key },
          {
            $push: {
              prices: {
                $each: [nuevoPrice],
                $position: 0,
              },
            },
          }
        );

        if (!result) {
          console.log("Error al agregar el nuevo precio");
        }
        console.log(
          `Precio agregado con éxito ${index + 1} / ${tablaFilas.length}`
        );

        // Actualizar finalmente el campo last_auction
        if (index === tablaFilas.length - 1) {
          await collection.updateOne(filtro, {
            $set: { last_auction: fechaUTC },
          });
        }
      }
    } catch (error) {
      browser.close();
      console.log("Error al obtener datos", error);
    }
  }
  client.close();
  browser.close();
};
