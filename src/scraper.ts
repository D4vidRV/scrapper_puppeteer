import puppeteer from "puppeteer";
import randomUserAgent from "random-useragent";
import { Filter, MongoClient, MongoClientOptions, UpdateFilter } from "mongodb";

// PUPPETEER CONFIG
const userAgent = randomUserAgent.getRandom();
const CONFIG_PUPPETER = {
  headless: true,
  args: [userAgent, "--window-size=1200,800"],
};

// MONGODB CONFIG

const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);

export const executeScraper = async () => {
  console.log("Ejecutando funcion visitar pagina!!");

  const browser = await puppeteer.launch(CONFIG_PUPPETER);
  const page = await browser.newPage();
  page.setDefaultTimeout(40000);
  page.setViewport({ width: 1920, height: 1080 });

  const subastas: any = {
    san_carlos:
      "http://www.aurora-applnx.com/aurora_clientes/subastas/preciosViewHistorico.php?c=1",
    el_progreso_barranca:
      "http://www.aurora-applnx.com/aurora_clientes/subastas/preciosViewHistorico.php?c=2",
    el_progreso_nicoya:
      "http://www.aurora-applnx.com/aurora_clientes/subastas/preciosViewHistorico.php?c=3",
    maleco:
      "http://www.aurora-applnx.com/aurora_clientes/subastas/preciosViewHistorico.php?c=4",
    montecillos:
      "http://www.aurora-applnx.com/aurora_clientes/subastas/preciosViewHistorico.php?c=5",
    el_progreso_limonal:
      "http://www.aurora-applnx.com/aurora_clientes/subastas/preciosViewHistorico.php?c=7",
    el_progreso_parrita:
      "http://www.aurora-applnx.com/aurora_clientes/subastas/preciosViewHistorico.php?c=6",
  };

  client.connect();
  console.log("Conexión a MongoDB exitosa.");

  for (const key in subastas) {
    console.log(`-----------------${key}----------------------`);

    try {
      await page.goto(subastas[key]);
      await page.waitForSelector("table");

      const tablaFilas = await page.$x("//tbody//tr");

      for (const [index, value] of tablaFilas.entries()) {
        const celdas = await value.$x("./td");

        const celdaTipoAnimal = celdas[0];
        const celdaRangoPeso = celdas[1];
        const celdaPrecioMax = celdas[2];
        const celdaPrecioMin = celdas[3];
        const celdaPrecioProm = celdas[4];
        const celdaFecha = celdas[5];

        const tipoAnimalTexto = await page.evaluate((celdaTipoAnimal) => {
          return celdaTipoAnimal?.innerText;
        }, celdaTipoAnimal);

        const rangoPesoTexto = await page.evaluate((celdaRangoPeso) => {
          return celdaRangoPeso?.innerText;
        }, celdaRangoPeso);

        const precioMaxTexto = await page.evaluate((celdaPrecioMax) => {
          return celdaPrecioMax?.innerText;
        }, celdaPrecioMax);

        const precioMinTexto = await page.evaluate((celdaPrecioMin) => {
          return celdaPrecioMin?.innerText;
        }, celdaPrecioMin);

        const precioPromTexto = await page.evaluate((celdaPrecioProm) => {
          return celdaPrecioProm?.innerText;
        }, celdaPrecioProm);

        const fechaTexto = await page.evaluate((celdaFecha) => {
          return celdaFecha?.innerText;
        }, celdaFecha);

        // Date fetching
        const fecha = new Date(Date.parse(fechaTexto));

        const database = client.db("fincaticadb");
        const collection = database.collection("subastas");
        const filtro = {
          name: key,
        };

        const nuevoPrice = {
          animaltype: tipoAnimalTexto,
          weightRange: rangoPesoTexto,
          maxPrice: precioMaxTexto,
          minPrice: precioMinTexto,
          averagePrice: precioPromTexto,
          date: fecha,
        };

        const result = await collection.updateOne(
          filtro,
          {
            $push: { prices: nuevoPrice },
          },
          { upsert: true }
        );

        if (!result) {
          console.log("Error al agregar el nuevo precio");
        }

        console.log(
          `Precio agregado con éxito ${index} / ${tablaFilas.length}`
        );
      }
    } catch (error) {
      browser.close();
      console.log("Error al obtener datos", error);
    }
  }
  client.close();
  browser.close();
};

async function insertOrUpdateCollection(
  collectionName: string,
  filter: Filter<any>,
  update: UpdateFilter<any>
) {
  try {
    await client.connect();
    console.log("Conexión a MongoDB exitosa.");
    const database = client.db("SubastasDB");
    const collection = database.collection(collectionName);
    const result = await collection.updateOne(filter, update, { upsert: true });
    console.log(
      `Colección ${collectionName} actualizada o insertada con éxito: ${result}`
    );
  } catch (e) {
    console.log(e);
  } finally {
    // client.close();
  }
}
