// ─────────────────────────────────────────────────────────────
// CONECTA-LT — Configurar CORS en bucket R2 (ejecutar UNA vez)
// ─────────────────────────────────────────────────────────────
// Este script configura las reglas CORS necesarias para que el
// navegador pueda hacer PUT directos con URLs firmadas.
//
// Ejecutar: bun run scripts/setup-r2-cors.ts
// ─────────────────────────────────────────────────────────────

import {
  S3Client,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
} from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function main() {
  console.log(`\n🪣 Configurando CORS en bucket: ${R2_BUCKET_NAME}`);
  console.log(`📡 Endpoint: https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`);

  try {
    // Leer CORS actual (si existe)
    try {
      const current = await s3.send(
        new GetBucketCorsCommand({ Bucket: R2_BUCKET_NAME }),
      );
      console.log('\n📋 CORS actual:', JSON.stringify(current.CORSRules, null, 2));
    } catch {
      console.log('\n📋 No hay CORS configurado aún.');
    }

    // Configurar CORS nuevo
    await s3.send(
      new PutBucketCorsCommand({
        Bucket: R2_BUCKET_NAME,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: ['*'],
              AllowedMethods: ['PUT', 'GET', 'HEAD', 'DELETE'],
              AllowedHeaders: ['*'],
              ExposeHeaders: ['ETag', 'x-amz-request-id'],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      }),
    );

    console.log('\n✅ CORS configurado exitosamente en el bucket R2!');
    console.log('\n   Reglas aplicadas:');
    console.log('   • Orígenes permitidos: * (todos)');
    console.log('   • Métodos: PUT, GET, HEAD, DELETE');
    console.log('   • Headers: * (todos)');
    console.log('   • Max-Age: 3600s (1 hora)');
    console.log('\n   Esto permite que el navegador suba imágenes directamente a R2.');
  } catch (error) {
    console.error('\n❌ Error configurando CORS:', error);
    process.exit(1);
  }
}

main();
