// ============================================================
// HELP DESK INTELIGENTE - Logica de la pagina web
// Este archivo contiene el JavaScript de las tres pantallas:
// index.html (crear ticket), admin.html (panel de agentes)
// y dashboard.html (metricas). Cada bloque se activa solo si
// sus elementos existen en la pagina actual.
// ============================================================

// ---------- Utilidades compartidas ----------

// Protege contra inyeccion de HTML (XSS): todo texto que
// escribio un usuario se muestra como texto plano
function limpiar(texto) {
  const div = document.createElement("div");
  div.textContent = texto == null ? "" : String(texto);
  return div.innerHTML;
}

// Iconos SVG reutilizables
const ICONOS = {
  check: '<svg class="ico ico-lg" viewBox="0 0 24 24" style="stroke:var(--baja)"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
  checkChico: '<svg class="ico" viewBox="0 0 24 24" style="width:14px;height:14px"><path d="M20 6 9 17l-5-5"/></svg>',
  alert: '<svg class="ico ico-lg" viewBox="0 0 24 24" style="stroke:var(--critica)"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  bot: '<svg class="ico" viewBox="0 0 24 24"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
  botChico: '<svg class="ico" viewBox="0 0 24 24" style="width:14px;height:14px"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
  mail: '<svg class="ico" viewBox="0 0 24 24" style="width:13px;height:13px"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
  trello: '<svg class="ico" viewBox="0 0 24 24" style="width:13px;height:13px"><rect width="18" height="18" x="3" y="3" rx="2"/><rect width="3" height="9" x="7" y="7"/><rect width="3" height="5" x="14" y="7"/></svg>',
  external: '<svg class="ico" viewBox="0 0 24 24" style="width:12px;height:12px"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
  trash: '<svg class="ico" viewBox="0 0 24 24" style="width:14px;height:14px"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
};

// ============================================================
// PAGINA 1: CREAR TICKET (index.html)
// ============================================================

const form = document.getElementById("formulario");

if (form) {
  const boton = document.getElementById("boton");
  const resultado = document.getElementById("resultado");
  const botonHTML = boton.innerHTML;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    boton.disabled = true;
    boton.innerHTML = '<span class="spinner"></span> El agente de IA está analizando tu ticket...';
    // Se oculta usando solo la clase CSS (un estilo directo
    // tendria prioridad y dejaria el cuadro invisible)
    resultado.className = "";

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: document.getElementById("titulo").value,
          descripcion: document.getElementById("descripcion").value,
          prioridad: document.getElementById("prioridad").value,
          email: document.getElementById("email").value,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error del servidor");

      let html = `<h3>${ICONOS.check} Ticket creado exitosamente</h3>`;
      html += `<div class="fila-dato"><span class="k">ID del ticket</span><span class="v">${data.ticket._id}</span></div>`;

      if (data.agente) {
        html += `<div class="fila-dato"><span class="k">Prioridad asignada por la IA</span><span class="v"><span class="badge ${limpiar(data.agente.prioridad)}">${limpiar(data.agente.prioridad)}</span></span></div>`;
        html += `<div class="fila-dato"><span class="k">Categoría</span><span class="v">${limpiar(data.agente.categoria)}</span></div>`;
        html += `<div class="fila-dato"><span class="k">Equipo asignado</span><span class="v">${limpiar(data.agente.equipo)}</span></div>`;

        if (data.trello) {
          html += `<div class="fila-dato"><span class="k">Ticket escalado a Trello</span><span class="v"><a href="${limpiar(data.trello)}" target="_blank" rel="noopener">Ver tarjeta ${ICONOS.external}</a></span></div>`;
        }

        if (data.correo_enviado) {
          html += `<div class="fila-dato"><span class="k">Notificación por correo</span><span class="v" style="color:var(--baja)">Enviada a tu email</span></div>`;
        }

        if (data.agente.es_pregunta_frecuente && data.agente.respuesta_automatica) {
          html += `<div class="nota-ia">${ICONOS.bot} <strong>Respuesta automática del agente:</strong><br>${limpiar(data.agente.respuesta_automatica)}<br><br><em>El ticket se cerró automáticamente porque el agente pudo resolverlo.</em></div>`;
        }
      } else if (data.error_agente) {
        html += `<div class="fila-dato"><span class="k">Nota</span><span class="v">El ticket se guardó pero el agente tuvo un problema: ${limpiar(data.error_agente)}</span></div>`;
      }

      resultado.innerHTML = html;
      resultado.className = "ok";
      form.reset();
    } catch (err) {
      resultado.innerHTML = `<h3>${ICONOS.alert} Ocurrió un error</h3><p style="color:var(--texto-suave);font-size:14px">${limpiar(err.message)}</p>`;
      resultado.className = "error";
    }

    boton.disabled = false;
    boton.innerHTML = botonHTML;
    resultado.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

// ============================================================
// PAGINA 2: PANEL DE AGENTES (admin.html)
// ============================================================

const contenidoPanel = document.getElementById("contenido");

async function cargar() {
  const cont = document.getElementById("contenido");
  if (!cont) return;
  cont.innerHTML = '<p class="vacio">Cargando tickets...</p>';

  try {
    const res = await fetch("/api/tickets");
    if (!res.ok) throw new Error("La API respondio con error " + res.status);
    const tickets = await res.json();

    if (!tickets.length) {
      cont.innerHTML = '<p class="vacio">Todavía no hay tickets. Crea el primero desde la página principal.</p>';
      return;
    }

    let html = `<table>
      <tr>
        <th>Ticket</th>
        <th>Prioridad IA</th>
        <th>Categoría</th>
        <th>Equipo</th>
        <th>Estado</th>
        <th>Acciones</th>
      </tr>`;

    for (const t of tickets) {
      const prioridad = t.prioridad
        ? `<span class="badge ${limpiar(t.prioridad)}">${limpiar(t.prioridad)}</span>`
        : '<span style="color:var(--texto-suave)">sin clasificar</span>';

      const trello = t.trello
        ? `<div style="margin-top:8px"><a href="${limpiar(t.trello)}" target="_blank" rel="noopener">${ICONOS.trello} Ver tarjeta en Trello ${ICONOS.external}</a></div>`
        : "";

      const respuesta = t.respuesta_automatica
        ? `<div class="respuesta-ia">${ICONOS.botChico} ${limpiar(t.respuesta_automatica)}</div>`
        : "";

      html += `<tr>
        <td>
          <div class="titulo-t">${limpiar(t.titulo)}</div>
          <div class="desc">${limpiar(t.descripcion)}</div>
          <div class="desc">${ICONOS.mail} ${limpiar(t.email)}</div>
          ${respuesta}
          ${trello}
        </td>
        <td>${prioridad}</td>
        <td>${limpiar(t.categoria) || "—"}</td>
        <td>${limpiar(t.equipo) || "—"}</td>
        <td><span class="badge ${limpiar(t.estado)}">${limpiar(t.estado)}</span></td>
        <td>
          ${t.estado === "abierto"
            ? `<button class="secundario" onclick="cerrar('${t._id}')">${ICONOS.checkChico} Cerrar</button><div style="height:8px"></div>`
            : ""}
          <button class="peligro" onclick="eliminar('${t._id}')">${ICONOS.trash} Eliminar</button>
        </td>
      </tr>`;
    }

    html += "</table>";
    cont.innerHTML = html;
  } catch (e) {
    cont.innerHTML = `<p class="vacio">Error cargando tickets: ${limpiar(e.message)}</p>`;
  }
}

// ------ Autenticacion simple del panel ------
// La clave se pide en CADA accion de administrador.
// No se guarda en el navegador.
async function accionAdmin(url, opciones) {
  const clave = prompt("Clave de administrador:");
  if (!clave) return;
  opciones.headers = Object.assign({}, opciones.headers, { "x-admin-key": clave });
  const res = await fetch(url, opciones);
  if (res.status === 401) {
    alert("Clave incorrecta. Accion denegada.");
    return;
  }
  cargar();
}

async function cerrar(id) {
  await accionAdmin("/api/tickets/" + id, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado: "cerrado" }),
  });
}

async function eliminar(id) {
  if (!confirm("¿Seguro que quieres eliminar este ticket?")) return;
  await accionAdmin("/api/tickets/" + id, { method: "DELETE" });
}

if (contenidoPanel) cargar();

// ============================================================
// PAGINA 3: DASHBOARD DE METRICAS (dashboard.html)
// ============================================================

const contenedorMetricas = document.getElementById("metricas");

if (contenedorMetricas) {
  const coloresPrioridad = ["critica", "alta", "media", "baja"];

  const iconMetrica = {
    total: '<svg class="ico" viewBox="0 0 24 24" style="stroke:var(--acento)"><path d="M13 5H2v14h20V5h-3"/><path d="M13 5a2 2 0 1 0-4 0v0"/><path d="M6 9h12"/><path d="M6 13h8"/></svg>',
    abiertos: '<svg class="ico" viewBox="0 0 24 24" style="stroke:var(--media)"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    cerrados: '<svg class="ico" viewBox="0 0 24 24" style="stroke:var(--baja)"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
    escalados: '<svg class="ico" viewBox="0 0 24 24" style="stroke:var(--critica)"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    ia: '<svg class="ico" viewBox="0 0 24 24" style="stroke:var(--acento)"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
  };

  function contar(lista, campo) {
    const conteo = {};
    for (const item of lista) {
      const valor = item[campo] || "sin clasificar";
      conteo[valor] = (conteo[valor] || 0) + 1;
    }
    return conteo;
  }

  function barras(conteo, total, usarColores) {
    const entradas = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
    if (!entradas.length) return '<p class="vacio">Sin datos todavía</p>';
    let html = "";
    for (const [nombre, cantidad] of entradas) {
      const pct = Math.round((cantidad / total) * 100);
      const clase = usarColores && coloresPrioridad.includes(nombre) ? nombre : "";
      html += `<div class="barra-fila">
        <span class="nombre">${limpiar(nombre)}</span>
        <div class="barra-fondo"><div class="barra-relleno ${clase}" style="width:${pct}%"></div></div>
        <span>${cantidad}</span>
      </div>`;
    }
    return html;
  }

  async function cargarDashboard() {
    try {
      const res = await fetch("/api/tickets");
      if (!res.ok) throw new Error("La API respondio con error " + res.status);
      const tickets = await res.json();

      const abiertos = tickets.filter((t) => t.estado === "abierto").length;
      const cerrados = tickets.filter((t) => t.estado === "cerrado").length;
      const escalados = tickets.filter((t) => t.escalado).length;
      const automaticos = tickets.filter((t) => t.respuesta_automatica).length;

      document.getElementById("metricas").innerHTML = `
        <div class="metrica"><div class="numero">${tickets.length}</div><div class="etiqueta">${iconMetrica.total} Tickets totales</div></div>
        <div class="metrica"><div class="numero">${abiertos}</div><div class="etiqueta">${iconMetrica.abiertos} Abiertos</div></div>
        <div class="metrica"><div class="numero">${cerrados}</div><div class="etiqueta">${iconMetrica.cerrados} Cerrados</div></div>
        <div class="metrica"><div class="numero">${escalados}</div><div class="etiqueta">${iconMetrica.escalados} Escalados a Trello</div></div>
        <div class="metrica"><div class="numero">${automaticos}</div><div class="etiqueta">${iconMetrica.ia} Resueltos por la IA</div></div>
      `;

      document.getElementById("porPrioridad").innerHTML = barras(
        contar(tickets, "prioridad"),
        tickets.length || 1,
        true
      );
      document.getElementById("porCategoria").innerHTML = barras(
        contar(tickets, "categoria"),
        tickets.length || 1,
        false
      );
    } catch (e) {
      document.getElementById("porPrioridad").innerHTML =
        `<p class="vacio">Error: ${limpiar(e.message)}</p>`;
    }
  }

  cargarDashboard();
}
