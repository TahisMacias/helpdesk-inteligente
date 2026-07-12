# Help Desk Inteligente con Agente de IA ☁️

Proyecto final de Cloud Computing - Instituto Superior Tecnológico CENESTUR

Un sistema de mesa de ayuda 100% en la nube. Los usuarios crean tickets de soporte y un agente de IA basado en Google Gemini los clasifica por prioridad y categoría. Si el ticket es urgente, el sistema crea una tarjeta en Trello de forma automática y, en todos los casos, el usuario recibe una notificación por correo. Las preguntas frecuentes las responde la misma IA sin que intervenga un agente humano.

Aplicación en vivo: https://helpdesk-inteligente.vercel.app

## Servicios utilizados (todos gratuitos)

| Servicio | Rol | Modelo cloud |
|---|---|---|
| Vercel | Hosting del frontend y la API serverless | PaaS |
| MongoDB Atlas | Base de datos de tickets y logs | IaaS |
| GitHub | Control de versiones y CI/CD | SaaS |
| Google Gemini | Agente de IA para el triage | SaaS |
| Trello | Tablero de emergencias | SaaS |
| Brevo | Envío de correos automáticos | SaaS |

## Estructura del proyecto

```
index.js              → El cerebro (API) para ejecución local
api/index.js          → El cerebro para Vercel (Express, MongoDB, Gemini, Trello, Brevo)
public/index.html     → La página para crear tickets
public/admin.html     → El panel de agentes
public/dashboard.html → El panel de estadísticas
public/script.js      → La lógica de la página web
public/style.css      → Estilos
vercel.json           → Instrucciones para Vercel
package.json          → Lista de cosas que necesita Node.js
```

## Variables de entorno necesarias en Vercel

- `MONGODB_URI` → cadena de conexión de MongoDB Atlas
- `GEMINI_API_KEY` → clave de la API de Google Gemini
- `TRELLO_KEY` → clave de API de Trello
- `TRELLO_TOKEN` → token de Trello
- `BREVO_API_KEY` → clave de la API de Brevo
- `BREVO_SENDER` → correo remitente validado en Brevo
- `ADMIN_KEY` → clave de administrador del panel

## Endpoints de la API

- `GET /api/health` → comprobar que la API está viva
- `GET /api/tickets` → listar todos los tickets
- `GET /api/tickets/:id` → ver un ticket
- `POST /api/tickets` → crear ticket (activa al agente de IA, envía correo y escala a Trello si es urgente)
- `PUT /api/tickets/:id` → actualizar estado (requiere clave de administrador)
- `DELETE /api/tickets/:id` → eliminar (requiere clave de administrador)
- `POST /api/agent/triage` → volver a clasificar un ticket (requiere clave de administrador)

## Ejecución local

```
npm install
npm start
```

La API queda disponible en http://localhost:3000 (definir antes las variables de entorno).

Autora: Britany Tahis Macias Tapuy
