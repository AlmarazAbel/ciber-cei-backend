import fs from "node:fs";
import https from "node:https";
import forge from "node-forge";

export interface WsaaCredentials {
  token: string;
  sign: string;
  expirationTime: number;
}

const WSAA_URLS = {
  homologacion: "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
  produccion: "https://wsaa.afip.gov.ar/ws/services/LoginCms",
} as const;

let cachedCredentials: WsaaCredentials | null = null;

function getWsaaUrl(): string {
  const env = process.env.ARCA_ENV === "homologacion" ? "homologacion" : "produccion";
  return WSAA_URLS[env];
}

function formatBuenosAiresIsoOffset(date: Date): string {
  // Buenos Aires es UTC-3 (sin horario de verano)
  const baDate = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${baDate.getUTCFullYear()}-${pad(baDate.getUTCMonth() + 1)}-${pad(baDate.getUTCDate())}` +
    `T${pad(baDate.getUTCHours())}:${pad(baDate.getUTCMinutes())}:${pad(baDate.getUTCSeconds())}-03:00`
  );
}

function buildLoginTicketRequestXml(service = "wsfe"): string {
  const now = new Date();
  const generationTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 min atrás por desfasaje de reloj
  const expirationTime = new Date(now.getTime() + 10 * 60 * 1000);
  const uniqueId = Math.floor(now.getTime() / 1000);

  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${formatBuenosAiresIsoOffset(generationTime)}</generationTime>
    <expirationTime>${formatBuenosAiresIsoOffset(expirationTime)}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
}

function signCmsBase64(xml: string, certPath: string, keyPath: string): string {
  const certPem = fs.readFileSync(certPath, "utf8");
  const keyPem = fs.readFileSync(keyPath, "utf8");

  const cert = forge.pki.certificateFromPem(certPem);
  const privateKey = forge.pki.privateKeyFromPem(keyPem);

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(xml, "utf8");
  p7.addCertificate(cert);
  p7.addSigner({
    key: privateKey,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      {
        type: forge.pki.oids.contentType,
        value: forge.pki.oids.data,
      },
      {
        type: forge.pki.oids.messageDigest,
      },
      {
        type: forge.pki.oids.signingTime,
        value: new Date().toISOString(),
      },
    ],
  });

  p7.sign();
  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return forge.util.encode64(der);
}

function parseWsaaResponse(soapXml: string): WsaaCredentials {
  // WSAA devuelve un XML escapado dentro de <loginCmsReturn>
  const returnMatch = soapXml.match(/<loginCmsReturn>([\s\S]*?)<\/loginCmsReturn>/);
  if (!returnMatch?.[1]) {
    throw new Error("Respuesta WSAA inválida: no se encontró loginCmsReturn");
  }

  const innerXml = returnMatch[1]
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");

  const tokenMatch = innerXml.match(/<token>([\s\S]*?)<\/token>/);
  const signMatch = innerXml.match(/<sign>([\s\S]*?)<\/sign>/);
  const expMatch = innerXml.match(/<expirationTime>([\s\S]*?)<\/expirationTime>/);

  if (!tokenMatch?.[1] || !signMatch?.[1]) {
    throw new Error(`WSAA no devolvió token/sign: ${innerXml}`);
  }

  return {
    token: tokenMatch[1].trim(),
    sign: signMatch[1].trim(),
    expirationTime: expMatch?.[1] ? Date.parse(expMatch[1].trim()) : Date.now() + 11 * 60 * 60 * 1000,
  };
}

function postSoapHttps(urlString: string, headers: Record<string, string>, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlString);

    const req = https.request(
   
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port ? Number(parsedUrl.port) : 443,
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        method: "POST",
        headers: {
          ...headers,
          "Content-Length": Buffer.byteLength(body, "utf8"),
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
            reject(new Error(`Error HTTP WSAA (${statusCode}): ${rawData}`));
            return;
          }
          resolve(rawData);
        });
      }
    );

    req.on("error", (err) => {
      reject(err);
    });

    req.write(body, "utf8");
    req.end();
  });
}

export async function getWsaaCredentials(): Promise<WsaaCredentials> {
  // Renovar 5 minutos antes de vencer
  if (cachedCredentials && Date.now() < cachedCredentials.expirationTime - 5 * 60 * 1000) {
    return cachedCredentials;
  }

  const certPath = process.env.ARCA_CERT_PATH;
  const keyPath = process.env.ARCA_KEY_PATH;

  if (!certPath || !keyPath) {
    throw new Error("Faltan ARCA_CERT_PATH o ARCA_KEY_PATH en las variables de entorno");
  }

  const xml = buildLoginTicketRequestXml("wsfe");
  const cmsBase64 = signCmsBase64(xml, certPath, keyPath);

  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sv.ds.afip.gov">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cmsBase64}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

  const responseText = await postSoapHttps(
    getWsaaUrl(),
    {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: '""',
    },
    soapEnvelope
  );

  cachedCredentials = parseWsaaResponse(responseText);
  return cachedCredentials;
}