import https from "node:https";
import { getWsaaCredentials } from "./wsaaService.js";

const WSFE_URLS = {
  homologacion: "https://wswhomo.afip.gov.ar/wsfev1/service.asmx",
  produccion: "https://servicios1.afip.gov.ar/wsfev1/service.asmx",
} as const;

export const CBTE_TIPO_FACTURA_C = 11;

export interface EmitirFacturaCInput {
  importeTotal: number;
  concepto?: 1 | 2 | 3; // 1: Productos, 2: Servicios, 3: Productos y Servicios
  docTipo?: number; // 99: Consumidor Final sin identificar, 80: CUIT, 96: DNI
  docNro?: number; // 0 cuando DocTipo es 99
  condicionIvaReceptorId?: number; // 5: Consumidor Final (ajusta según tu payload)
  fechaComprobante?: string; // YYYYMMDD, por defecto hoy en Argentina
}

export interface EmitirFacturaCResult {
  cae: string;
  caeFchVto: string;
  cbteNro: number;
  ptoVta: number;
  cbteTipo: number;
  impTotal: number;
  resultado: string;
  observaciones: string[];
  qrPayloadBase64: string;
}

function getWsfeUrl(): string {
  const env = process.env.ARCA_ENV === "homologacion" ? "homologacion" : "produccion";
  return WSFE_URLS[env];
}

function getTodayArgentinaYyyymmdd(): string {
  const baDate = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const y = baDate.getUTCFullYear();
  const m = String(baDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(baDate.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

async function callWsfe(soapAction: string, bodyXml: string): Promise<string> {
  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    ${bodyXml}
  </soap:Body>
</soap:Envelope>`;

  const parsedUrl = new URL(getWsfeUrl());

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port ? Number(parsedUrl.port) : 443,
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: `"http://ar.gov.afip.dif.FEV1/${soapAction}"`,
          "Content-Length": Buffer.byteLength(soapEnvelope, "utf8"),
        },
        ciphers: "DEFAULT@SECLEVEL=0",
        rejectUnauthorized: false,
      },
      (res) => {
        let rawData = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          rawData += chunk;
        });
        res.on("end", () => {
          const statusCode = res.statusCode ?? 500;
          if (statusCode < 200 || statusCode >= 300) {
            reject(new Error(`Error HTTP WSFE (${statusCode}): ${rawData}`));
            return;
          }
          resolve(rawData);
        });
      }
    );

    req.on("error", (err) => {
      reject(err);
    });

    req.write(soapEnvelope, "utf8");
    req.end();
  });
}

export async function obtenerUltimoComprobante(ptoVta: number, cbteTipo = CBTE_TIPO_FACTURA_C): Promise<number> {
  const { token, sign } = await getWsaaCredentials();
  const cuit = Number(process.env.ARCA_CUIT);

  const xml = await callWsfe(
    "FECompUltimoAutorizado",
    `<FECompUltimoAutorizado xmlns="http://ar.gov.afip.dif.FEV1/">
      <Auth>
        <Token>${token}</Token>
        <Sign>${sign}</Sign>
        <Cuit>${cuit}</Cuit>
      </Auth>
      <PtoVta>${ptoVta}</PtoVta>
      <CbteTipo>${cbteTipo}</CbteTipo>
    </FECompUltimoAutorizado>`
  );

  const match = xml.match(/<CbteNro>(\d+)<\/CbteNro>/);
  if (!match?.[1]) {
    throw new Error(`No se pudo obtener CbteNro en FECompUltimoAutorizado: ${xml}`);
  }

  return Number(match[1]);
}

export async function emitirFacturaC(input: EmitirFacturaCInput): Promise<EmitirFacturaCResult> {
  const { token, sign } = await getWsaaCredentials();
  const cuit = Number(process.env.ARCA_CUIT);
  const ptoVta = Number(process.env.ARCA_PUNTO_VENTA);

  if (!cuit || !ptoVta) {
    throw new Error("Faltan ARCA_CUIT o ARCA_PUNTO_VENTA en las variables de entorno");
  }

  const ultimoNro = await obtenerUltimoComprobante(ptoVta, CBTE_TIPO_FACTURA_C);
  const cbteNro = ultimoNro + 1;

  const importeTotal = Number(input.importeTotal.toFixed(2));
  const concepto = input.concepto ?? 1;
  const docTipo = input.docTipo ?? 99;
  const docNro = docTipo === 99 ? 0 : (input.docNro ?? 0);
  const cbteFch = input.fechaComprobante ?? getTodayArgentinaYyyymmdd();
  const condicionIvaReceptorId = input.condicionIvaReceptorId ?? 5;

  // En Factura C (Monotributo), el importe neto gravado coincide con el total y el IVA es 0
  const servicioFechasXml =
    concepto === 2 || concepto === 3
      ? `<FchServDesde>${cbteFch}</FchServDesde>
         <FchServHasta>${cbteFch}</FchServHasta>
         <FchVtoPago>${cbteFch}</FchVtoPago>`
      : "";

  const xml = await callWsfe(
    "FECAESolicitar",
    `<FECAESolicitar xmlns="http://ar.gov.afip.dif.FEV1/">
      <Auth>
        <Token>${token}</Token>
        <Sign>${sign}</Sign>
        <Cuit>${cuit}</Cuit>
      </Auth>
      <FeCAEReq>
        <FeCabReq>
          <CantReg>1</CantReg>
          <PtoVta>${ptoVta}</PtoVta>
          <CbteTipo>${CBTE_TIPO_FACTURA_C}</CbteTipo>
        </FeCabReq>
        <FeDetReq>
          <FECAEDetRequest>
            <Concepto>${concepto}</Concepto>
            <DocTipo>${docTipo}</DocTipo>
            <DocNro>${docNro}</DocNro>
            <CbteDesde>${cbteNro}</CbteDesde>
            <CbteHasta>${cbteNro}</CbteHasta>
            <CbteFch>${cbteFch}</CbteFch>
            <ImpTotal>${importeTotal}</ImpTotal>
            <ImpTotConc>0</ImpTotConc>
            <ImpNeto>${importeTotal}</ImpNeto>
            <ImpOpEx>0</ImpOpEx>
            <ImpIVA>0</ImpIVA>
            <ImpTrib>0</ImpTrib>
            <MonId>PES</MonId>
            <MonCotiz>1</MonCotiz>
            <CondicionIVAReceptorId>${condicionIvaReceptorId}</CondicionIVAReceptorId>
            ${servicioFechasXml}
          </FECAEDetRequest>
        </FeDetReq>
      </FeCAEReq>
    </FECAESolicitar>`
  );

  const resultadoMatch = xml.match(/<Resultado>([A-Z])<\/Resultado>/);
  const caeMatch = xml.match(/<CAE>([^<]+)<\/CAE>/);
  const caeVtoMatch = xml.match(/<CAEFchVto>([^<]+)<\/CAEFchVto>/);

  const observaciones = Array.from(xml.matchAll(/<Msg>([\s\S]*?)<\/Msg>/g)).map((m) => m[1].trim());
  const errores = Array.from(xml.matchAll(/<Err>[\s\S]*?<Msg>([\s\S]*?)<\/Msg>[\s\S]*?<\/Err>/g)).map((m) =>
    m[1].trim()
  );

  const resultado = resultadoMatch?.[1] ?? "R";
  const cae = caeMatch?.[1]?.trim() ?? "";
  const caeFchVto = caeVtoMatch?.[1]?.trim() ?? "";

  if (resultado !== "A" || !cae) {
    const detalle = [...errores, ...observaciones].join(" | ") || "Comprobante rechazado por ARCA";
    throw new Error(`ARCA rechazó la Factura C: ${detalle}`);
  }

  const fechaIso = `${cbteFch.slice(0, 4)}-${cbteFch.slice(4, 6)}-${cbteFch.slice(6, 8)}`;
  const qrData = {
    ver: 1,
    fecha: fechaIso,
    cuit,
    ptoVta,
    tipoCmp: CBTE_TIPO_FACTURA_C,
    nroCmp: cbteNro,
    importe: importeTotal,
    moneda: "PES",
    ctz: 1,
    tipoDocRec: docTipo,
    nroDocRec: docNro,
    tipoCodAut: "E",
    codAut: Number(cae),
  };

  const qrPayloadBase64 = Buffer.from(JSON.stringify(qrData), "utf8").toString("base64");

  return {
    cae,
    caeFchVto,
    cbteNro,
    ptoVta,
    cbteTipo: CBTE_TIPO_FACTURA_C,
    impTotal: importeTotal,
    resultado,
    observaciones,
    qrPayloadBase64,
  };
}