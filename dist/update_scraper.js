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
const random_useragent_1 = __importDefault(require("random-useragent"));
const mongodb_1 = require("mongodb");
const puppeteer_1 = __importDefault(require("puppeteer"));
const chrome_aws_lambda_1 = __importDefault(require("chrome-aws-lambda"));
const executeUpdateScraper = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log("Ejecutando script para actualizar registros!!");
    // MONGODB CONFIG
    const uri = (_a = process.env.MONGODB) !== null && _a !== void 0 ? _a : "";
    const client = new mongodb_1.MongoClient(uri);
    // PUPPETEER CONFIG
    const userAgent = random_useragent_1.default.getRandom();
    const DOCKER_PUPPETER_CONFIG = {
        headless: true,
        args: chrome_aws_lambda_1.default.args,
        defaultViewport: chrome_aws_lambda_1.default.defaultViewport,
        executablePath: "usr/bin/chromium-browser",
    };
    const LOCAL_PUPPETER_CONFIG = {
        headless: true,
        args: [userAgent, "--window-size=1200,800"],
        defaultViewport: { width: 1920, height: 1080 },
    };
    const browser = yield puppeteer_1.default.launch(LOCAL_PUPPETER_CONFIG);
    const page = yield browser.newPage();
    page.setDefaultTimeout(40000);
    const subastas = {
        san_carlos: "http://www.aurora-applnx.com/aurora_clientes/subastas/subastaGanaderaList.php?c=1&h=true",
        el_progreso_barranca: "http://www.aurora-applnx.com/aurora_clientes/subastas/subastaGanaderaList.php?c=2&h=true",
        el_progreso_nicoya: "http://www.aurora-applnx.com/aurora_clientes/subastas/subastaGanaderaList.php?c=3&h=true",
        maleco: "http://www.aurora-applnx.com/aurora_clientes/subastas/subastaGanaderaList.php?c=4&h=true",
        montecillos: "http://www.aurora-applnx.com/aurora_clientes/subastas/subastaGanaderaList.php?c=5&h=true",
        el_progreso_parrita: "http://www.aurora-applnx.com/aurora_clientes/subastas/subastaGanaderaList.php?c=6&h=true",
        el_progreso_limonal: "http://www.aurora-applnx.com/aurora_clientes/subastas/subastaGanaderaList.php?c=7&h=true",
    };
    yield client.connect();
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
                yield page.goto(`${subastas[key]}${queryParameter}${i}`);
                // Wait for the second table of the page
                yield page.waitForSelector("table");
                const tablaFilas = yield page.$x("//table[2]/tbody//tr");
                for (const [index, value] of tablaFilas.entries()) {
                    const celdas = yield value.$x("./td");
                    let tipoAnimalTexto = yield getTextOfcell(page, celdas[0]);
                    tipoAnimalTexto = tipoAnimalTexto.replace(/^\d+\.\s/, "");
                    const rangoPesoTexto = yield getTextOfcell(page, celdas[1]);
                    const precioMaxTexto = yield getTextOfcell(page, celdas[2]);
                    const precioMinTexto = yield getTextOfcell(page, celdas[3]);
                    const precioPromTexto = yield getTextOfcell(page, celdas[4]);
                    const fechaTexto = yield getTextOfcell(page, celdas[5]);
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
                    const auction = yield collection.findOne({ name: key });
                    console.log(`Fecha último registro en BD: ${auction === null || auction === void 0 ? void 0 : auction.last_auction.toISOString()}`);
                    console.log(`Fecha de registro en subasta: ${fechaUTC.toISOString()}`);
                    if ((auction === null || auction === void 0 ? void 0 : auction.last_auction) >= fechaUTC) {
                        console.log(`LOS REGISTROS WEB DE LA SUBASTA ${key} NO SE HAN ACTUALIZADO, FECHA: ${fechaUTC
                            .toISOString()
                            .substring(0, 10)}`);
                        lastDateInBDFound = true;
                        break;
                    }
                    // Add nuevoPrice to array registriesToInsert
                    registriesToInsert.push(nuevoPrice);
                }
            }
            catch (error) {
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
                const result = yield collection.updateOne({ name: key }, {
                    $push: {
                        prices: {
                            $each: [element],
                            $position: 0,
                        },
                    },
                });
                console.log(`Precio agregado con éxito ${registriesToInsert.length - index} / ${registriesToInsert.length}`);
                // Actualizar finalmente el campo last_auction
                if (index === 0) {
                    yield collection.updateOne({
                        name: key,
                    }, {
                        $set: { last_auction: element.date },
                    });
                }
            }
            catch (error) {
                console.log(`Error al insertar en BD: ${error}`);
            }
        }
    }
    client.close();
    browser.close();
});
exports.executeUpdateScraper = executeUpdateScraper;
const getTextOfcell = (page, cell) => __awaiter(void 0, void 0, void 0, function* () {
    return yield page.evaluate((cell) => {
        return cell === null || cell === void 0 ? void 0 : cell.innerText;
    }, cell);
});
function compareObjects(a, b) {
    // Comparar por animaltype primero
    if (a.animaltype < b.animaltype)
        return -1;
    if (a.animaltype > b.animaltype)
        return 1;
    // Si los animaltype son iguales, comparar por weightRange
    if (a.weightRange < b.weightRange)
        return -1;
    if (a.weightRange > b.weightRange)
        return 1;
    // Si ambos son iguales, no hay cambios en el orden
    return 0;
}
