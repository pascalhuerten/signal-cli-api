import config from "../../config.ts";
import { readLines } from "https://deno.land/std@0.79.0/io/bufio.ts";
import EventEmitter from "https://deno.land/std@0.79.0/node/events.ts";

export class RPC extends EventEmitter {
  account: string;
  process: Deno.Process | null = null;

  _id = 0;

  get_id = () => {
    return ++this._id;
  };

  constructor(account: string) {
    super();

    this.account = account;

    this.run();
  }

  async run() {
    const cmd = [
      config.SIGNAL_CLI,
      "-u",
      this.account,
      "jsonRpc",
    ];

    console.log(cmd.join(" "));

    const p = Deno.run({
      cmd: cmd,
      stdin: "piped",
      stderr: "piped",
      stdout: "piped",
    });
    this.process = p;
    console.log("RPC started, PID: " + p.pid);
    for await (const line of readLines(p.stdout)) {
      if (line.trim()) super.emit("stdout", line);
    }
    for await (const line of readLines(p.stderr)) {
      if (line.trim()) super.emit("stderr", line);
    }
  }

  stop() {
    if (!this.process) return;

    this.process.kill("SIGTERM");
    this.process.stdin?.close();
    this.process.close();

    super.emit("end");
  }

  async send(recipient: string[], message: string) {
    if (!this.process) return;

    const request = {
      "jsonrpc": "2.0",
      "method": "send",
      "params": { "recipient": recipient, "message": message },
      "id": this.get_id(),
    };
    const cmd = JSON.stringify(request);
    console.log(cmd);

    console.log(
      await this.process.stdin?.write(new TextEncoder().encode(`${cmd}\n`)),
    );
  }

  async write(request: Record<string, unknown>) {
    if (!this.process) return;
    request.id = this.get_id();
    const command = JSON.stringify(request);
    console.log(command);
    console.log(
      await this.process.stdin?.write(new TextEncoder().encode(`${command}\n`)),
    );
  }

  listen(searchPhrase: string, caseSensitive: boolean) {
    return new Promise((resolve, _reject) => {
      searchPhrase = searchPhrase.trim();
      if (!caseSensitive) {
        searchPhrase = searchPhrase.toLowerCase();
      }

      const search = (line: string) => {
        let message = JSON.parse(line);
        if (message.method == "receive") {
          if (
            message.params &&
            message.params.envelope &&
            message.params.envelope.dataMessage
          ) {
            message = message.params.envelope.dataMessage.message;

            if (!caseSensitive) {
              message = message.toLowerCase();
            }
            console.log(message + " =? " + searchPhrase);
            this.off("stdout", search);
            return resolve(message === searchPhrase);
          }
        }
      };

      this.on("stdout", search);
    });
  }
}
