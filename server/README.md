# Bookly API

API NestJS + Prisma (PostgreSQL) de la app de reservas. Código en `functions/`.

## Variables de entorno

Copia `functions/env.example.yaml` como `functions/env.yaml`, rellénalo y despliega con
`gcloud run deploy bookly-api --source . --region europe-west1 --env-vars-file env.yaml`.
Para cambiar solo variables (sin reconstruir): `gcloud run services update bookly-api --region europe-west1 --env-vars-file env.yaml`.

| Variable | Obligatoria | Para qué sirve |
| --- | --- | --- |
| `DATABASE_URL` | Sí | Conexión PostgreSQL (Neon) |
| `JWT_SECRET` | Sí | Firma de las sesiones. Usa un valor largo y aleatorio |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Para imágenes | Fotos de servicios, equipo, portada y logo |
| `PUBLIC_WEB_URL` | No | URL de la web para los enlaces de los emails (por defecto `https://bookly-39896.web.app`) |
| `RESEND_API_KEY` | Para emails | Confirmaciones, cancelaciones, recordatorios y avisos al negocio |
| `MAIL_FROM` | No | Remitente, p. ej. `Barbería Luna <citas@tudominio.com>` (dominio verificado en Resend) |
| `NOTIFY_EMAIL` | No | Dónde recibir avisos de reservas (por defecto, el email del negocio) |
| `CRON_SECRET` | Para recordatorios | Clave que debe enviar Cloud Scheduler en `X-Cron-Secret` |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | No | Verificación anti-bots en reservas sin cuenta |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Para señales | Cobro de señal online en los servicios que la tengan |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | No | Sincronización con Google Calendar |
| `GOOGLE_CALENDAR_ID` | No | Calendario por defecto si no se indica en la web (Información → Reservas). Cada profesional puede tener el suyo |
| `BUSINESS_TIMEZONE` | No | Zona horaria (por defecto `Europe/Madrid`) |
| `CORS_ORIGINS` | No | Orígenes extra permitidos, separados por comas |

Todo lo opcional se desactiva solo si falta la variable: la API arranca y funciona igualmente.

## Base de datos

Al arrancar, el contenedor ejecuta `prisma db push`, que aplica los cambios del esquema
(nuevas tablas y columnas). Si algún cambio pudiera borrar datos, se niega y la API no arranca,
así que es seguro. No hace falta ninguna migración manual.

## Puesta en marcha de cada función

### Emails (Resend)
1. Crea una cuenta en https://resend.com y una API key → `RESEND_API_KEY`.
2. En **Domains**, añade y verifica tu dominio (registros DNS). Hasta entonces Resend solo
   entrega a tu propio email. Después pon `MAIL_FROM: "Tu negocio <citas@tudominio.com>"`.

### Recordatorios 24 h antes (Cloud Scheduler)
1. Inventa una clave larga → `CRON_SECRET`.
2. Crea la tarea (cada hora):
   ```bash
   gcloud scheduler jobs create http bookly-reminders --location europe-west1 \
     --schedule "0 * * * *" --http-method POST \
     --uri "https://bookly-api-115796447501.europe-west1.run.app/cron/reminders" \
     --headers "X-Cron-Secret=TU_CRON_SECRET"
   ```

### Anti-bots (Cloudflare Turnstile, gratis)
En https://dash.cloudflare.com → Turnstile → añade el sitio `bookly-39896.web.app` y copia
la *site key* → `TURNSTILE_SITE_KEY` y la *secret key* → `TURNSTILE_SECRET_KEY`.

### Señal con tarjeta (Stripe)
1. En https://dashboard.stripe.com → Developers → API keys → *Secret key* → `STRIPE_SECRET_KEY`
   (empieza por `sk_test_` en pruebas y `sk_live_` en real).
2. Developers → Webhooks → Add endpoint:
   `https://bookly-api-115796447501.europe-west1.run.app/payments/webhook`, eventos
   `checkout.session.completed` y `checkout.session.expired`. Copia el *Signing secret* → `STRIPE_WEBHOOK_SECRET`.
3. En la web, edita un servicio y pon un importe en «Señal online».

### Google Calendar
1. La cuenta de servicio (el `client_email` del JSON) necesita permiso sobre el calendario:
   Google Calendar → tu calendario → Configuración y uso compartido → Compartir con personas
   concretas → añade ese email con «Hacer cambios en eventos».
2. Escribe el email/ID del calendario en la web: Información → Editar → Reservas → «Calendario
   de Google» (ahí también se muestra el email de la cuenta de servicio con el que compartirlo).
   Para el calendario propio de un profesional, compártelo igual y pon su ID en Panel → Equipo →
   Opciones avanzadas.

### Profesionales con acceso a su agenda
El profesional se registra en la web; después, en Panel → Equipo → Opciones avanzadas,
pon su email. Al volver a iniciar sesión verá «Mi agenda» solo con sus citas.

### Administrador
```sql
UPDATE "User" SET role = 'admin' WHERE email = 'tu@email.com';
```

## Desarrollo

```bash
cd functions
npm install
npx prisma generate
npm run build && node lib/main.js
```

---

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
