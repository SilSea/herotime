import { startApp } from "./app.js";
import { installErrorReporting } from "./errors.js";

installErrorReporting();

startApp(document.getElementById("app") as HTMLElement);
