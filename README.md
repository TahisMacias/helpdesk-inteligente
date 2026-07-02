# Help Desk Inteligente con Agente de IA ☁️

Proyecto final de Cloud Computing - Instituto Superior Tecnológico CENESTUR

Un sistema de mesa de ayuda 100% en la nube. Los usuarios crean tickets de soporte y un agente de IA basado en Google Gemini los clasifica por prioridad y categoría. Si el ticket es urgente, el sistema crea una tarjeta en Trello de forma automática. Las preguntas frecuentes las responde la misma IA sin que intervenga un agente humano.

## Servicios utilizados (todos gratuitos)

| Servicio | Rol | Modelo cloud |
|---|---|---|
| Vercel | Hosting del frontend y la API serverless | PaaS |
| MongoDB Atlas | Base de datos de tickets y logs | IaaS |
| GitHub | Control de versiones y CI/CD | SaaS |
| Google Gemini | Agente de IA para el triage | SaaS |
| Trello | Tablero de emergencias | SaaS |

## Estructura del proyecto

```
api/index.js          → Backend (Express, MongoDB, Gemini, Trello)
public/index.html     → Página para crear tickets
public/admin.html     → Panel de agentes
public/dashboard.html → Dashboard de métricas
public/style.css      → Estilos
vercel.json           → Configuración de Vercel
```

## Variables de entorno necesarias en Vercel

- `MONGODB_URI` → cadena de conexión de MongoDB Atlas
- `GEMINI_API_KEY` → clave de la API de Google Gemini
- `TRELLO_KEY` → clave de API de Trello
- `TRELLO_TOKEN` → token de Trello

## Endpoints de la API

- `GET /api/health` → comprobar que la API está viva
- `GET /api/tickets` → listar todos los tickets
- `GET /api/tickets/:id` → ver un ticket
- `POST /api/tickets` → crear ticket (activa al agente de IA)
- `PUT /api/tickets/:id` → actualizar estado
- `DELETE /api/tickets/:id` → eliminar
- `POST /api/agent/triage` → volver a clasificar un ticket

Autora: Britany Tahis Macias Tapuy
