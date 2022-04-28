import {RPC} from "./rpc.ts";

export const webhooks: Map<string, Webhook> = new Map();

export class Webhook {
  rpc: RPC;
  account: string;
  url: string;

  constructor(url: string, account: string) {
    this.url = url;
    this.account = account;
    this.rpc = new RPC(account);

    this.rpc.on('stdout', async (line) => {
      console.log('sent message to webhook.')
      const resp = await fetch(this.url, {
        method: "POST",
        body: line,
      });
      console.log(await resp.text());
    })

    this.rpc.on('stderr', (line) => {
        console.log("error: " + line)
    })

    this.rpc.on('end', () => {
        console.log("rpc stopped")
    })

    webhooks.set(this.account, this);

    console.log('Webhook "' + this.url + '" set for: "' + this.account + '".')
  }

  delete() {
    this.rpc.stop();
    this.rpc.removeAllListeners();
    webhooks.delete(this.account);
  }

  static get(account: string) {
    return webhooks.get(account);
  }
}
