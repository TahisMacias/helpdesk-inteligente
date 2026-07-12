// ============================================================
// HELP DESK INTELIGENTE - Ejecucion local
// Este archivo permite correr la API en la propia computadora
// con "npm start" (http://localhost:3000). En la nube no se
// usa: Vercel carga directamente api/index.js como funcion
// serverless.
// ============================================================

const app = require("./api/index.js");

const PUERTO = process.env.PORT || 3000;

app.listen(PUERTO, () => {
  console.log(`Help Desk Inteligente corriendo en http://localhost:${PUERTO}`);
  console.log("Recuerda definir las variables de entorno antes de iniciar.");
});
