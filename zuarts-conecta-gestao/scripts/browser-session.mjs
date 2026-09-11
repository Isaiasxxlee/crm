import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export async function until(check) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Browser check timed out.");
}

export async function withBrowser(browserPath, run) {
  if (!browserPath) throw new Error("Pass the Chrome executable as the first argument.");
  const directory = await mkdtemp(path.join(tmpdir(), "zuarts-plans-ui-"));
  const browser = spawn(browserPath, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${directory}`, "--no-first-run", "--no-default-browser-check", "about:blank"], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let socket;
  try {
    let endpoint;
    let stderr = "";
    browser.stderr.on("data", (chunk) => {
      stderr += chunk;
      endpoint = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1];
    });
    await until(() => endpoint);
    const host = new URL(endpoint).host;
    const tabs = await (await fetch(`http://${host}/json/list`)).json();
    socket = new WebSocket(tabs.find((tab) => tab.type === "page").webSocketDebuggerUrl);
    await once(socket, "open");
    let sequence = 0;
    const pending = new Map();
    const errors = [];
    socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
      if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
        errors.push(message.params.args.map((argument) => argument.value).join(" "));
      }
      const callback = pending.get(message.id);
      if (callback) {
        clearTimeout(callback.timer);
        pending.delete(message.id);
        if (message.error) callback.reject(new Error(message.error.message));
        else callback.resolve(message.result);
      }
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Browser command timed out: ${method}`));
      }, 15000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    await send("Runtime.enable");
    await send("Page.enable");
    await run({ send, evaluate, directory, errors });
  } finally {
    socket?.close();
    browser.kill();
  }
}
