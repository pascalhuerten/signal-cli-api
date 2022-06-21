import config from "../config.ts";
import { webhooks } from "../src/classes/webhook.ts";
import { readLines } from "https://deno.land/std@0.79.0/io/bufio.ts";

export const register = async (
  number: string,
  captcha: string,
  use_voice: boolean,
) => {
  const cmd = [
    config.SIGNAL_CLI,
    "-u",
    number,
    "register",
    "--captcha",
    captcha,
  ];
  if (use_voice) {
    cmd.push("--voice");
  }

  console.log(cmd.join(" "));

  const p = Deno.run({ cmd: cmd, stderr: "piped", stdout: "piped" });
  const [status, stderr] = await Promise.all([
    p.status(),
    p.output(),
    p.stderrOutput(),
  ]);
  p.close();
  console.log(status);
  if (!status.success) {
    let error = new TextDecoder().decode(stderr);
    if (!error) error = "unknown error";
    console.log(error);
    return error;
  }
  return null;
};

export const verify = async (number: string, token: string) => {
  const cmd = [config.SIGNAL_CLI, "-u", number, "verify", token];

  console.log(cmd.join(" "));

  const p = Deno.run({ cmd: cmd, stderr: "piped", stdout: "piped" });
  const [status, stderr] = await Promise.all([
    p.status(),
    p.output(),
    p.stderrOutput(),
  ]);
  p.close();
  console.log(status);
  if (!status.success) {
    let error = new TextDecoder().decode(stderr);
    if (!error) error = "unknown error";
    console.log(error);
    return error;
  }
  return null;
};

export const updateProfile = async (
  number: string,
  name: string,
  about: string,
) => {
  const cmd = [
    config.SIGNAL_CLI,
    "-u",
    number,
    "updateProfile",
  ];

  if (name) {
    cmd.push("--name", name);
  }
  if (about) {
    cmd.push("--about", about);
  }

  let webhook;
  console.log(cmd.join(" "));
  if (webhooks.has(number)) {
    webhook = webhooks.get(number);
    if (!webhook) return "webhook does not exist";
    webhook.rpc.stop();
  }
  const p = Deno.run({ cmd: cmd, stderr: "piped", stdout: "piped" });
  const [status, stderr] = await Promise.all([
    p.status(),
    p.output(),
    p.stderrOutput(),
  ]);
  p.close();

  if (webhook) {
    webhook.rpc.run();
  }

  console.log(status);
  if (!status.success) {
    let error = new TextDecoder().decode(stderr);
    if (!error) error = "unknown error";
    console.log(error);
    return error;
  }
  return null;
};

export const getUserStatus = async (number: string) => {
  const cmd = [
    config.SIGNAL_CLI,
    "-u",
    number,
    "getUserStatus",
    number,
  ];

  console.log(cmd.join(" "));

  const p = Deno.run({ cmd: cmd, stderr: "piped", stdout: "piped" });
  const [status, stdout, stderr] = await Promise.all([
    p.status(),
    p.output(),
    p.stderrOutput(),
  ]);
  p.close();
  console.log(status);
  if (!status.success) {
    const error = new TextDecoder().decode(stderr);
    console.log(error);
    return false;
  }

  return new TextDecoder().decode(stdout);
};

export const unregister = async (number: string) => {
  const cmd = [config.SIGNAL_CLI, "-u", number, "unregister"];

  console.log(cmd.join(" "));

  const p = Deno.run({ cmd: cmd, stderr: "piped", stdout: "piped" });
  const [status, stdout, stderr] = await Promise.all([
    p.status(),
    p.output(),
    p.stderrOutput(),
  ]);
  p.close();
  console.log(status);
  if (!status.success) {
    const error = new TextDecoder().decode(stderr);
    console.log(error);
    return false;
  }
  return stdout;
};

export const send = async (
  from: string,
  message: string,
  to: string | string[],
): Promise<string | null> => {
  if (webhooks.has(from)) {
    const webhook = webhooks.get(from);
    if (!webhook) return "webhook does not exist";
    console.log("use jsonrpc send method");
    if (Array.isArray(to)) {
      webhook.rpc.send(to, message);
    } else {
      webhook.rpc.send([to], message);
    }
  } else {
    const cmd = [
      config.SIGNAL_CLI,
      "-u",
      from,
      "send",
      "-m",
      message,
      Array.isArray(to) ? JSON.stringify(to) : to,
    ];

    console.log(cmd.join(" "));

    const p = Deno.run({ cmd: cmd, stderr: "piped", stdout: "piped" });
    const [status, stderr] = await Promise.all([
      p.status(),
      p.stderrOutput(),
    ]);
    p.close();
    console.log(status);
    if (!status.success) {
      const error = new TextDecoder().decode(stderr);
      console.log(error);
      return error;
    }
  }
  return null;
};

export const receive = async (number: string) => {
  const cmd = [
    config.SIGNAL_CLI,
    "-u",
    number,
    "receive",
  ];

  console.log(cmd.join(" "));

  const p = Deno.run({ cmd: cmd, stderr: "piped", stdout: "piped" });
  const [status, stdout, stderr] = await Promise.all([
    p.status(),
    p.output(),
    p.stderrOutput(),
  ]);
  p.close();
  console.log(status);
  if (!status.success) {
    if (!stderr) {
      return "";
    }
    const error = new TextDecoder().decode(stderr);
    console.log(error);
    return null;
  } else {
    return new TextDecoder().decode(stdout);
  }
};

export const receiveAndListen = async (
  number: string,
  search: string,
  caseSensitive: boolean,
) => {
  if (webhooks.has(number)) {
    const webhook = webhooks.get(number);
    if (!webhook) return "webhook does not exist";
    return await Promise.any([
      webhook.rpc.listen(search, caseSensitive),
      new Promise((resolve, _reject) => {
        setTimeout(() => {
          resolve(false);
        }, 60000);
      }),
    ]);
  } else {
    const cmd = [
      config.SIGNAL_CLI,
      "-u",
      number,
      "receive",
      "--timeout",
      "60",
      "--ignore-attachments",
    ];

    console.log(cmd.join(" "));

    const p = Deno.run({
      cmd: cmd,
      stdin: "piped",
      stderr: "piped",
      stdout: "piped",
    });

    for await (const line of readLines(p.stdout)) {
      console.log(line);
      if (line.trim() && line.startsWith("Body: ")) {
        let message = line.substring(6, line.length).trim();
        search = search.trim();
        if (!caseSensitive) {
          message = message.toLowerCase();
          search = search.toLowerCase();
        }
        if (message === search) {
          console.log(message + " === " + search);
          p.close();
          return true;
        } else {
          p.close();
          return false;
        }
      }
    }

    const [status, stderr] = await Promise.all([
      p.status(),
      p.stderrOutput(),
    ]);
    p.close();

    console.log(status);
    if (stderr) {
      const error = new TextDecoder().decode(stderr);
      console.log(error);
    }
  }
  return false;
};
