import { Context } from "https://deno.land/x/oak/mod.ts";
import * as signal from "../src/signal_cli_interface.ts";

export const receive = async ({ response, params }: Context | any) => {
  const { number } = params;
  // TODO: Get messages from signal-cli
  const messages = await signal.receive(number);
  if (messages === null) {
    response.body = {
      success: false,
      body: `Error receiving messages from: ${number}`,
    };
    response.status = 500;
    return;
  }

  response.body = {
    success: true,
    body: messages,
  };
  response.status = 200;
};

export const send = async ({ request, response, params }: Context | any) => {
  // Require body
  const body = await request.body();
  if (!request.hasBody) {
    response.status = 400;
    response.body = {
      success: false,
      message: "No data provided",
    };
    return;
  }
  const { recipient, message } = await body.value;

  const { number } = params;

  console.log(
    `Sent message from ${number} to ${recipient} with content ${message}`,
  );

  const error = await signal.send(number, message, recipient);

  if (error) {
    console.log("error: ");
    console.log(error);
    response.body = {
      success: false,
      body: `Error sending messages:\n ${error}`,
    };
    response.status = 500;
    return;
  }

  response.body = {
    success: true,
    body: `Sent message from ${number} to ${recipient} with content ${message}`,
  };
  response.status = 200;
};

export const checkConsent = async (
  { request, response, params }: Context | any,
) => {
  // Require body
  const body = await request.body();
  if (!request.hasBody) {
    response.status = 400;
    response.body = {
      success: false,
      message: "No data provided",
    };
    return;
  }
  const {
    recipient,
    consentMessage,
    consentGiven,
    consentDenied,
    consentWord,
    caseSensitive,
  } = await body.value;

  const { number } = params;

  console.log(
    `Sent message from ${number} to ${recipient} with content ${consentMessage}`,
  );

  const error = await signal.send(number, consentMessage, recipient);

  if (error) {
    console.log("error: ");
    console.log(error);
    response.body = {
      success: false,
      body: `Error sending consent message:\n ${error}`,
    };
    response.status = 500;
    return;
  }

  const received = await signal.receiveAndListen(
    number,
    consentWord,
    caseSensitive,
  );

  console.log(received);

  if (!received) {
    signal.send(number, consentDenied, recipient);
    response.body = {
      success: false,
      body: `No consent given from ${recipient}`,
    };
    response.status = 404;
    return;
  }

  signal.send(number, consentGiven, recipient);
  response.body = {
    success: true,
    body: `Consent given from ${recipient} to ${number}`,
  };
  response.status = 200;
};
