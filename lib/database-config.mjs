import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadCaCertificate() {
  const inlineCertificate = process.env.DATABASE_CA_CERT;

  if (inlineCertificate) {
    return inlineCertificate.replace(/\\n/g, "\n");
  }

  const certificatePath = process.env.DATABASE_CA_CERT_PATH;

  if (certificatePath) {
    return readFileSync(resolve(certificatePath), "utf8");
  }

  return undefined;
}

function connectionStringWithoutSslOptions(connectionString) {
  const url = new URL(connectionString);

  // pg-connection-string lets SSL options in the URL override the explicit
  // `ssl` object. Remove them when we supply Aiven's CA ourselves.
  for (const option of [
    "sslmode",
    "sslcert",
    "sslkey",
    "sslrootcert",
    "uselibpqcompat",
  ]) {
    url.searchParams.delete(option);
  }

  return url.toString();
}

export function getDatabaseConfig() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }

  const ca = loadCaCertificate();

  if (!ca) {
    return {
      connectionString,
      connectionTimeoutMillis: 10000,
    };
  }

  return {
    connectionString: connectionStringWithoutSslOptions(connectionString),
    connectionTimeoutMillis: 10000,
    ssl: {
      ca,
      rejectUnauthorized: true,
    },
  };
}
