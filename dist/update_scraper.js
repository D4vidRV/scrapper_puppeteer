"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeUpdateScraper = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const random_useragent_1 = __importDefault(require("random-useragent"));
const mongodb_1 = require("mongodb");
const executeUpdateScraper = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // PUPPETEER CONFIG
    const userAgent = random_useragent_1.default.getRandom();
    const CONFIG_PUPPETER = {
        headless: true,
        args: [userAgent, "--window-size=1200,800"],
    };
    // MONGODB CONFIG
    const uri = (_a = process.env.MONGODB) !== null && _a !== void 0 ? _a : "";
    const client = new mongodb_1.MongoClient(uri);
    console.log("Ejecutando script para actualizar registros!!");
    const browser = yield puppeteer_1.default.launch(CONFIG_PUPPETER);
    const page = yield browser.newPage();
    page.setDefaultTimeout(40000);
    page.setViewport({ width: 1920, height: 1080 });
    const subastas = {
        san_carlos: "http://www.aurora-applnx.com/aurora_clientes/subastas/index.php?c=1",
        el_progreso_barranca: "http://www.aurora-applnx.com/aurora_clientes/subastas/index.php?c=2",
        el_progreso_nicoya: "http://www.aurora-applnx.com/aurora_clientes/subastas/index.php?c=3",
        maleco: "http://www.aurora-applnx.com/aurora_clientes/subastas/index.php?c=4",
        montecillos: "http://www.aurora-applnx.com/aurora_clientes/subastas/index.php?c=5",
        el_progreso_limonal: "http://www.aurora-applnx.com/aurora_clientes/subastas/index.php?c=7",
        el_progreso_parrita: "http://www.aurora-applnx.com/aurora_clientes/subastas/index.php?c=6",
    };
    yield client.connect();
    console.log("Conexión a MongoDB exitosa.");
    for (const key in subastas) {
        console.log(`-----------------${key}----------------------`);
        try {
            yield page.goto(subastas[key]);
            yield page.waitForSelector("table");
            const tablaFilas = yield page.$x("//tbody//tr");
            let celdaTipoAnimal;
            let celdaRangoPeso;
            let celdaPrecioMax;
            let celdaPrecioMin;
            let celdaPrecioProm;
            let celdaFecha;
            const database = client.db("fincaticadb");
            const collection = database.collection("auctions");
            for (const [index, value] of tablaFilas.reverse().entries()) {
                const celdas = yield value.$x("./td");
                celdaTipoAnimal = celdas[0];
                celdaRangoPeso = celdas[1];
                celdaPrecioMax = celdas[2];
                celdaPrecioMin = celdas[3];
                celdaPrecioProm = celdas[4];
                celdaFecha = celdas[5];
                let tipoAnimalTexto = yield page.evaluate((celdaTipoAnimal) => {
                    return celdaTipoAnimal === null || celdaTipoAnimal === void 0 ? void 0 : celdaTipoAnimal.innerText;
                }, celdaTipoAnimal);
                tipoAnimalTexto = tipoAnimalTexto.replace(/^\d+\.\s/, "");
                const rangoPesoTexto = yield page.evaluate((celdaRangoPeso) => {
                    return celdaRangoPeso === null || celdaRangoPeso === void 0 ? void 0 : celdaRangoPeso.innerText;
                }, celdaRangoPeso);
                const precioMaxTexto = yield page.evaluate((celdaPrecioMax) => {
                    return celdaPrecioMax === null || celdaPrecioMax === void 0 ? void 0 : celdaPrecioMax.innerText;
                }, celdaPrecioMax);
                const precioMinTexto = yield page.evaluate((celdaPrecioMin) => {
                    return celdaPrecioMin === null || celdaPrecioMin === void 0 ? void 0 : celdaPrecioMin.innerText;
                }, celdaPrecioMin);
                const precioPromTexto = yield page.evaluate((celdaPrecioProm) => {
                    return celdaPrecioProm === null || celdaPrecioProm === void 0 ? void 0 : celdaPrecioProm.innerText;
                }, celdaPrecioProm);
                const fechaTexto = yield page.evaluate((celdaFecha) => {
                    return celdaFecha === null || celdaFecha === void 0 ? void 0 : celdaFecha.innerText;
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
                const auction = yield collection.findOne({ name: key });
                console.log(auction === null || auction === void 0 ? void 0 : auction.last_auction);
                console.log(fechaUTC);
                if ((auction === null || auction === void 0 ? void 0 : auction.last_auction) >= fechaUTC) {
                    console.log(`LOS REGISTROS DE LA WEB DE LA SUBASTA ${key} NO SE HAN ACTUALIZADO, FECHA: ${fechaUTC
                        .toISOString()
                        .substring(0, 10)}`);
                    break;
                }
                // Update the document with the new registry of prices
                const result = yield collection.updateOne({ name: key }, {
                    $push: {
                        prices: {
                            $each: [nuevoPrice],
                            $position: 0,
                        },
                    },
                });
                if (!result) {
                    console.log("Error al agregar el nuevo precio");
                }
                console.log(`Precio agregado con éxito ${index + 1} / ${tablaFilas.length}`);
                // Actualizar finalmente el campo last_auction
                if (index === tablaFilas.length - 1) {
                    yield collection.updateOne(filtro, {
                        $set: { last_auction: fechaUTC },
                    });
                }
            }
        }
        catch (error) {
            browser.close();
            console.log("Error al obtener datos", error);
        }
    }
    client.close();
    browser.close();
});
exports.executeUpdateScraper = executeUpdateScraper;
