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
exports.executeTestScrapper = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const random_useragent_1 = __importDefault(require("random-useragent"));
const mongodb_1 = require("mongodb");
const chrome_aws_lambda_1 = __importDefault(require("chrome-aws-lambda"));
const executeTestScrapper = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log("Ejecutando test");
    const userAgent = random_useragent_1.default.getRandom();
    // MONGODB CONFIG
    console.log(`CNN MONGO: ${process.env.MONGODB}`);
    const uri = (_a = process.env.MONGODB) !== null && _a !== void 0 ? _a : "";
    const client = new mongodb_1.MongoClient(uri);
    const browser = yield puppeteer_1.default.launch({
        args: chrome_aws_lambda_1.default.args,
        defaultViewport: chrome_aws_lambda_1.default.defaultViewport,
        executablePath: '/usr/bin/chromium-browser',
        headless: true,
    });
    const page = yield browser.newPage();
    page.setDefaultTimeout(40000);
    const subastas = {
        san_carlos: "http://www.aurora-applnx.com/aurora_clientes/subastas/index.php?c=1",
        el_progreso_barranca: "http://www.aurora-applnx.com/aurora_clientes/subastas/index.php?c=2",
        el_progreso_nicoya: "http://www.aurora-applnx.com/aurora_clientes/subastas/index.php?c=3",
        maleco: "http://www.aurora-applnx.com/aurora_clientes/subastas/index.php?c=4",
        montecillos: "http://www.aurora-applnx.com/aurora_clientes/subastas/index.php?c=5",
        el_progreso_limonal: "http://www.aurora-applnx.com/aurora_clientes/subastas/index.php?c=7",
        el_progreso_parrita: "http://www.aurora-applnx.com/aurora_clientes/subastas/index.php?c=6",
    };
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
                console.log(`TIPO ANIMAL: ${tipoAnimalTexto}`);
            }
        }
        catch (error) {
            console.log(error);
        }
    }
    browser.close();
});
exports.executeTestScrapper = executeTestScrapper;
