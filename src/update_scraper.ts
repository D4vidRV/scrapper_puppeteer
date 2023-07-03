import randomUserAgent from "random-useragent";
import { MongoClient } from "mongodb";
import puppeteer from "puppeteer";
import chromium from "chrome-aws-lambda";

export const executeUpdateScraper = async () => {
  console.log("Ejecutando script para actualizar registros!!");

  // MONGODB CONFIG
  const uri = process.env.MONGODB ?? "";
  const client = new MongoClient(uri);

  // PUPPETEER CONFIG
  const userAgent = randomUserAgent.getRandom();

  const DOCKER_PUPPETER_CONFIG = {
    headless: true,
    executablePath: "/usr/bin/google-chrome",
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
  };

  const LOCAL_PUPPETER_CONFIG = {
    headless: true,
    args: [userAgent, "--window-size=1200,800"],
    defaultViewport: { width: 1920, height: 1080 },
  };

  const browser = await puppeteer.launch(DOCKER_PUPPETER_CONFIG);
  const page = await browser.newPage();
  page.setDefaultTimeout(40000);

  const subastas: any = {
    san_carlos:
      "http://www.aurora-applnx.com/aurora_clientes/subastas/subastaGanaderaList.php?c=1&h=true",
    el_progreso_barranca:
      "http://www.aurora-applnx.com/aurora_clientes/subastas/subastaGanaderaList.php?c=2&h=true",
    el_progreso_nicoya:
      "http://www.aurora-applnx.com/aurora_clientes/subastas/subastaGanaderaList.php?c=3&h=true",
    maleco:
      "http://www.aurora-applnx.com/aurora_clientes/subastas/subastaGanaderaList.php?c=4&h=true",
    montecillos:
      "http://www.aurora-applnx.com/aurora_clientes/subastas/subastaGanaderaList.php?c=5&h=true",
    el_progreso_parrita:
      "http://www.aurora-applnx.com/aurora_clientes/subastas/subastaGanaderaList.php?c=6&h=true",
    el_progreso_limonal:
      "http://www.aurora-applnx.com/aurora_clientes/subastas/subastaGanaderaList.php?c=7&h=true",
  };

  await client.connect();
  console.log("Conexión a MongoDB exitosa.");

  for (const key in subastas) {
    console.log(`-----------------${key}----------------------`);
    let lastDateInBDFound = false;
    const registriesToInsert = [];
    const database = client.db("fincaticadb");
    const collection = database.collection("auctions");
    let queryParameter = `&n=`;

    for (let i = 1; !lastDateInBDFound; i += 30) {
      console.log(`IndexToFind: ${i}`);
      console.log(`QueryParameter: ${queryParameter}`);
      try {
        console.log(subastas[key] + queryParameter + `${i}`);
        await page.goto(`${subastas[key]}${queryParameter}${i}`);
        // Wait for the second table of the page
        await page.waitForSelector("table");

        const tablaFilas = await page.$x("//table[2]/tbody//tr");

        for (const [index, value] of tablaFilas.entries()) {
          const celdas: puppeteer.ElementHandle<Element>[] = await value.$x(
            "./td"
          );

          let tipoAnimalTexto = await getTextOfcell(page, celdas[0]);

          tipoAnimalTexto = tipoAnimalTexto.replace(/^\d+\.\s/, "");

          const rangoPesoTexto = await getTextOfcell(page, celdas[1]);

          const precioMaxTexto = await getTextOfcell(page, celdas[2]);

          const precioMinTexto = await getTextOfcell(page, celdas[3]);

          const precioPromTexto = await getTextOfcell(page, celdas[4]);

          const fechaTexto = await getTextOfcell(page, celdas[5]);
          // Date fetching
          const fechaLocal = new Date(Date.parse(fechaTexto.toString()));
          const fechaUTC = new Date(fechaLocal.toISOString());

          const nuevoPrice = {
            animaltype: tipoAnimalTexto,
            weightRange: rangoPesoTexto,
            maxPrice: precioMaxTexto,
            minPrice: precioMinTexto,
            averagePrice: precioPromTexto,
            date: fechaUTC,
          };

          console.log(`Registro ${index + 1} / ${tablaFilas.length}`);

          // Find the document by field "name"
          const auction = await collection.findOne({ name: key });
          console.log(
            `Fecha último registro en BD: ${auction?.last_auction.toISOString()}`
          );
          console.log(
            `Fecha de registro en subasta: ${fechaUTC.toISOString()}`
          );

          if (auction?.last_auction >= fechaUTC) {
            console.log(
              `LOS REGISTROS WEB DE LA SUBASTA ${key} NO SE HAN ACTUALIZADO, FECHA: ${fechaUTC
                .toISOString()
                .substring(0, 10)}`
            );
            lastDateInBDFound = true;
            break;
          }

          // Add nuevoPrice to array registriesToInsert
          registriesToInsert.push(nuevoPrice);
        }
      } catch (error) {
        browser.close();
        console.log("Error al obtener datos", error);
      }
    }

    // Sort Array
    registriesToInsert.sort(compareObjects);

    // ------------INSERT ARRAY IN DB-------------
    for (let index = registriesToInsert.length - 1; index >= 0; index--) {
      const element = registriesToInsert[index];
      try {
        // Update the document with the new registry of prices
        const result = await collection.updateOne(
          { name: key },
          {
            $push: {
              prices: {
                $each: [element],
                $position: 0,
              },
            },
          }
        );

        console.log(
          `Precio agregado con éxito ${registriesToInsert.length - index} / ${
            registriesToInsert.length
          }`
        );

        // Actualizar finalmente el campo last_auction
        if (index === 0) {
          await collection.updateOne(
            {
              name: key,
            },
            {
              $set: { last_auction: element.date },
            }
          );
        }
      } catch (error) {
        console.log(`Error al insertar en BD: ${error}`);
      }
    }
  }
  client.close();
  browser.close();
};

const getTextOfcell = async (
  page: puppeteer.Page,
  cell: puppeteer.ElementHandle
): Promise<String> => {
  return await page.evaluate((cell) => {
    return cell?.innerText;
  }, cell);
};

function compareObjects(a : any, b: any) {
  // Comparar por animaltype primero
  if (a.animaltype < b.animaltype) return -1;
  if (a.animaltype > b.animaltype) return 1;

  // Si los animaltype son iguales, comparar por weightRange
  if (a.weightRange < b.weightRange) return -1;
  if (a.weightRange > b.weightRange) return 1;

  // Si ambos son iguales, no hay cambios en el orden
  return 0;
}
