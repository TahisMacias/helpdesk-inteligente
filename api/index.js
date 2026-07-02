// ============================================================
// HELP DESK INTELIGENTE - Backend API (Node.js + Express)
// Proyecto Cloud Computing - CENESTUR
// Corre como funcion serverless en Vercel
// ============================================================

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(express.json());

// Permitir peticiones desde el frontend (CORS)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  next();
});

// ------------------------------------------------------------
// CONEXION A MONGODB ATLAS (IaaS - base de datos en la nube)
// Se guarda la conexion en cache para no reconectar en cada
// peticion (importante en serverless)
// ------------------------------------------------------------
let cachedClient = null;

async function getDb() {
  if (!cachedClient) {
    cachedClient = new MongoClient(process.env.MONGODB_URI);
    await cachedClient.connect();
  }
  return cachedClient.db("helpdesk");
}

// ------------------------------------------------------------
// AGENTE DE IA (Google Gemini)
// Recibe el titulo y la descripcion del ticket y devuelve un
// JSON con prioridad, categoria, equipo y si debe escalarse
// ------------------------------------------------------------
async function agenteIA(titulo, descripcion, prioridadUsuario) {
  const prompt = `Eres un agente de IA de un Help Desk. Tu trabajo es hacer triage de tickets de soporte.

Analiza este ticket:
Titulo: "${titulo}"
Descripcion: "${descripcion}"
Prioridad indicada por el usuario: "${prioridadUsuario}"

Reglas:
- Si menciona servidor caido, sistema caido o que nadie puede trabajar: prioridad "critica".
- Si menciona "urgente" o afecta a varias personas: prioridad "alta".
- Si es una pregunta del tipo "como hago X": es una pregunta frecuente, prioridad "baja", y debes dar una respuesta corta con pasos.
- El usuario puede exagerar o subestimar la prioridad, tu decides la correcta.
- escalar es true solo si la prioridad es "critica" o "alta".

Responde SOLO con un JSON valido, sin texto adicional ni markdown, con este formato exacto:
{"prioridad":"critica|alta|media|baja","categoria":"hardware|software|red|acceso|infraestructura|otro","equipo":"nivel1|nivel2|devops|infraestructura","es_pregunta_frecuente":true|false,"respuesta_automatica":"texto con la respuesta si es pregunta frecuente, o cadena vacia","escalar":true|false}`;

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

  const respuesta = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error("Error de Gemini: " + detalle);
  }

  const data = await respuesta.json();
  let texto = data.candidates[0].content.parts[0].text;

  // Por si Gemini devuelve el JSON envuelto en ```json ... ```
  texto = texto.replace(/```json|```/g, "").trim();

  return JSON.parse(texto);
}

// ------------------------------------------------------------
// INTEGRACION CON TRELLO (SaaS)
// Busca el tablero "Help Desk Urgente" y crea una tarjeta en
// la primera lista cuando un ticket es urgente
// ------------------------------------------------------------
let cachedListaTrello = null;

async function obtenerListaTrello() {
  if (cachedListaTrello) return cachedListaTrello;

  const auth = `key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;

  // 1. Buscar los tableros del usuario
  const resTableros = await fetch(
    `https://api.trello.com/1/members/me/boards?fields=name&${auth}`
  );
  const tableros = await resTableros.json();

  const tablero =
    tableros.find((t) => t.name.toLowerCase().includes("help desk")) ||
    tableros[0];

  if (!tablero) throw new Error("No se encontro ningun tablero en Trello");

  // 2. Obtener la primera lista del tablero
  const resListas = await fetch(
    `https://api.trello.com/1/boards/${tablero.id}/lists?${auth}`
  );
  const listas = await resListas.json();

  if (!listas.length) throw new Error("El tablero no tiene listas");

  cachedListaTrello = listas[0].id;
  return cachedListaTrello;
}

async function crearTarjetaTrello(ticket, clasificacion) {
  const idLista = await obtenerListaTrello();
  const auth = `key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;

  const nombre = `[${clasificacion.prioridad.toUpperCase()}] ${ticket.titulo}`;
  const desc = `**Descripcion:** ${ticket.descripcion}\n\n**Categoria:** ${clasificacion.categoria}\n**Equipo asignado:** ${clasificacion.equipo}\n**Email del usuario:** ${ticket.email}\n\n_Tarjeta creada automaticamente por el Agente de IA del Help Desk._`;

  const res = await fetch(
    `https://api.trello.com/1/cards?idList=${idLista}&pos=top&${auth}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nombre, desc: desc }),
    }
  );

  if (!res.ok) throw new Error("Error creando tarjeta en Trello");
  const tarjeta = await res.json();
  return tarjeta.shortUrl;
}

// ------------------------------------------------------------
// ENVIO DE CORREOS (Brevo - SaaS de mensajeria)
// Envia la respuesta del agente o la confirmacion del ticket
// al correo del usuario
// ------------------------------------------------------------
async function enviarCorreo(destinatario, asunto, contenidoHtml) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: "Help Desk Inteligente", email: process.env.BREVO_SENDER },
      to: [{ email: destinatario }],
      subject: asunto,
      htmlContent: contenidoHtml,
    }),
  });

  if (!res.ok) {
    const detalle = await res.text();
    throw new Error("Error de Brevo: " + detalle);
  }
  return true;
}

function plantillaCorreo(titulo, cuerpo) {
  return `
  <div style="background:#0d0a14;padding:32px 16px;font-family:Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;background:#1a1626;border:1px solid #3a2f5c;border-radius:14px;padding:28px;color:#f1eefb">
      <h2 style="margin:0 0 6px;color:#a78bfa;font-size:20px">Help Desk Inteligente</h2>
      <p style="margin:0 0 20px;color:#9d94bd;font-size:13px">Respuesta automatica del sistema</p>
      <h3 style="margin:0 0 12px;font-size:17px;color:#f1eefb">${titulo}</h3>
      <div style="font-size:14px;line-height:1.7;color:#d6d0e8">${cuerpo}</div>
      <p style="margin:24px 0 0;font-size:12px;color:#5e5680">Este correo fue generado automaticamente por el agente de IA del Help Desk. Proyecto Cloud Computing - CENESTUR.</p>
    </div>
  </div>`;
}

// ------------------------------------------------------------
// RUTAS DE LA API
// ------------------------------------------------------------

// Health check: sirve para comprobar que la API esta viva
app.get("/api/health", async (req, res) => {
  res.json({ ok: true, mensaje: "API del Help Desk funcionando", fecha: new Date() });
});

// Listar todos los tickets (los mas nuevos primero)
app.get("/api/tickets", async (req, res) => {
  try {
    const db = await getDb();
    const tickets = await db
      .collection("tickets")
      .find({})
      .sort({ creado: -1 })
      .toArray();
    res.json(tickets);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Ver un ticket especifico
app.get("/api/tickets/:id", async (req, res) => {
  try {
    const db = await getDb();
    const ticket = await db
      .collection("tickets")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!ticket) return res.status(404).json({ error: "Ticket no encontrado" });
    res.json(ticket);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Crear un ticket nuevo -> aqui trabaja el agente de IA
app.post("/api/tickets", async (req, res) => {
  try {
    const { titulo, descripcion, prioridad, email } = req.body;

    if (!titulo || !descripcion || !email) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    const db = await getDb();

    // 1. Guardar el ticket en MongoDB con estado inicial
    const ticket = {
      titulo,
      descripcion,
      email,
      prioridad_usuario: prioridad || "normal",
      estado: "abierto",
      creado: new Date(),
    };
    const resultado = await db.collection("tickets").insertOne(ticket);
    ticket._id = resultado.insertedId;

    // 2. Llamar al agente de IA para clasificar
    let clasificacion = null;
    let urlTrello = null;
    let errorAgente = null;

    try {
      clasificacion = await agenteIA(titulo, descripcion, ticket.prioridad_usuario);

      const cambios = {
        prioridad: clasificacion.prioridad,
        categoria: clasificacion.categoria,
        equipo: clasificacion.equipo,
        escalado: clasificacion.escalar,
      };

      // 3. Si es pregunta frecuente, se responde y se cierra solo
      if (clasificacion.es_pregunta_frecuente && clasificacion.respuesta_automatica) {
        cambios.respuesta_automatica = clasificacion.respuesta_automatica;
        cambios.estado = "cerrado";
      }

      // 4. Si es urgente, crear tarjeta en Trello automaticamente
      if (clasificacion.escalar) {
        try {
          urlTrello = await crearTarjetaTrello(ticket, clasificacion);
          cambios.trello = urlTrello;
        } catch (e) {
          errorAgente = "Trello: " + e.message;
        }
      }

      // 5. Enviar correo al usuario con la respuesta o la confirmacion
      let correoEnviado = false;
      try {
        if (cambios.respuesta_automatica) {
          // El agente resolvio el ticket: se envia la solucion
          await enviarCorreo(
            ticket.email,
            `Respuesta a tu ticket: ${ticket.titulo}`,
            plantillaCorreo(
              ticket.titulo,
              `<p>Hola, nuestro agente de IA analizo tu solicitud y encontro la solucion:</p>
               <p style="background:#10281f;border-left:3px solid #34d399;padding:12px 14px;border-radius:0 8px 8px 0">${cambios.respuesta_automatica}</p>
               <p>El ticket quedo cerrado automaticamente. Si el problema continua, puedes crear un nuevo ticket.</p>`
            )
          );
          correoEnviado = true;
        } else {
          // Ticket en proceso: se envia la confirmacion con la clasificacion
          const notaTrello = urlTrello
            ? `<p>Por su urgencia, el caso fue escalado y un agente lo atendera de inmediato.</p>`
            : `<p>Un agente del equipo <strong>${clasificacion.equipo}</strong> lo atendera pronto.</p>`;
          await enviarCorreo(
            ticket.email,
            `Ticket recibido: ${ticket.titulo}`,
            plantillaCorreo(
              ticket.titulo,
              `<p>Hola, recibimos tu ticket y nuestro agente de IA ya lo clasifico:</p>
               <p><strong>Prioridad:</strong> ${clasificacion.prioridad}<br>
               <strong>Categoria:</strong> ${clasificacion.categoria}<br>
               <strong>Numero de ticket:</strong> ${ticket._id}</p>
               ${notaTrello}`
            )
          );
          correoEnviado = true;
        }
        cambios.correo_enviado = correoEnviado;
      } catch (e) {
        errorAgente = (errorAgente ? errorAgente + " | " : "") + "Correo: " + e.message;
      }

      await db
        .collection("tickets")
        .updateOne({ _id: ticket._id }, { $set: cambios });
      Object.assign(ticket, cambios);

      // 5. Guardar log de lo que hizo el agente (auditoria)
      await db.collection("logs").insertOne({
        ticket_id: ticket._id,
        accion: "triage",
        clasificacion,
        trello: urlTrello,
        fecha: new Date(),
      });
    } catch (e) {
      errorAgente = e.message;
    }

    res.status(201).json({
      mensaje: "Ticket creado exitosamente",
      ticket,
      agente: clasificacion,
      trello: urlTrello,
      correo_enviado: ticket.correo_enviado || false,
      error_agente: errorAgente,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Actualizar un ticket (por ejemplo cambiar el estado)
app.put("/api/tickets/:id", async (req, res) => {
  try {
    const db = await getDb();
    const { estado } = req.body;
    await db
      .collection("tickets")
      .updateOne({ _id: new ObjectId(req.params.id) }, { $set: { estado } });
    res.json({ mensaje: "Ticket actualizado" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Eliminar un ticket
app.delete("/api/tickets/:id", async (req, res) => {
  try {
    const db = await getDb();
    await db.collection("tickets").deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ mensaje: "Ticket eliminado" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Endpoint del agente: volver a clasificar un ticket existente
app.post("/api/agent/triage", async (req, res) => {
  try {
    const { ticket_id } = req.body;
    const db = await getDb();
    const ticket = await db
      .collection("tickets")
      .findOne({ _id: new ObjectId(ticket_id) });
    if (!ticket) return res.status(404).json({ error: "Ticket no encontrado" });

    const clasificacion = await agenteIA(
      ticket.titulo,
      ticket.descripcion,
      ticket.prioridad_usuario
    );

    let urlTrello = null;
    if (clasificacion.escalar) {
      try {
        urlTrello = await crearTarjetaTrello(ticket, clasificacion);
      } catch (e) {}
    }

    await db.collection("tickets").updateOne(
      { _id: ticket._id },
      {
        $set: {
          prioridad: clasificacion.prioridad,
          categoria: clasificacion.categoria,
          equipo: clasificacion.equipo,
          escalado: clasificacion.escalar,
          trello: urlTrello || ticket.trello,
        },
      }
    );

    await db.collection("logs").insertOne({
      ticket_id: ticket._id,
      accion: "re-triage",
      clasificacion,
      trello: urlTrello,
      fecha: new Date(),
    });

    res.json({ mensaje: "Triage ejecutado", clasificacion, trello: urlTrello });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Exportar la app para Vercel
module.exports = app;
