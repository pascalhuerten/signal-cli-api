import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import config from "./config.ts";
import {
  createAccount,
  createWebhook,
  deleteAccount,
  deleteWebhook,
  getAccount,
  verifyAccount,
} from "./routers/account.ts";
import { checkConsent, receive, send } from "./routers/message.ts";

// Get command line argument that specifiys the port number.
if (
  (Deno.args[0] != null) && (Deno.args[0] !== "") &&
  !isNaN(Number(Deno.args[0].toString()))
) {
  config.PORT = +Deno.args[0];
} else {
  throw "Please specify a port";
}

const app = new Application();
const indexRouter = new Router();
const accountsRouter = new Router();
const messagesRouter = new Router();

indexRouter.get("/", (ctx) => {
  ctx.response.body = "Hello from Signal-CLI-API ";
});

accountsRouter
  .get("/accounts/:number", getAccount)
  .post("/accounts/:number", createAccount)
  .patch("/accounts/:number", verifyAccount)
  .delete("/accounts/:number", deleteAccount)
  .post("/accounts/:number/webhook", createWebhook)
  .delete("/accounts/:number/webhook", deleteWebhook);

messagesRouter
  .get("/messages/:number", receive)
  .post("/messages/:number", send)
  .post("/messages/consent/:number", checkConsent);

app.use(messagesRouter.routes());
app.use(messagesRouter.allowedMethods());
app.use(accountsRouter.routes());
app.use(accountsRouter.allowedMethods());
app.use(indexRouter.routes());
app.use(indexRouter.allowedMethods());

app.listen({ port: config.PORT });
console.log(`Server is running on <http://localhost:${config.PORT}/>`);
