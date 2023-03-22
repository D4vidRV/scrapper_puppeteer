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
Object.defineProperty(exports, "__esModule", { value: true });
exports.testearFechas = void 0;
const testearFechas = () => __awaiter(void 0, void 0, void 0, function* () {
    const fechaString = "2023-01-31";
    const fechaDate = new Date(fechaString);
    console.info(`fechaDate: ${fechaDate}`);
    const toUTCString = new Date(fechaDate).toLocaleString("es-CR", { timeZone: "America/Costa_Rica" });
    console.info(`toUTCString: ${toUTCString}`);
    const test = new Date('2023-01-30T18:00:00.000Z');
    console.info(`test: ${test}`);
    const toISOString = new Date(fechaString).toISOString();
    console.info(`toISOString: ${toISOString}`);
});
exports.testearFechas = testearFechas;
