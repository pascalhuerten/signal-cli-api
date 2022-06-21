import {
  getUserStatus,
  register,
  unregister,
  updateProfile,
  verify,
} from "../src/signal_cli_interface.ts";
import { Webhook } from "../src/classes/webhook.ts";
import { Context } from "https://deno.land/x/oak/mod.ts";

export const getAccount = async ({ response, params }: Context | any) => {
  try {
    const { number } = params;

    const result = await Promise.any([
      getUserStatus(number),
      new Promise((resolve, _reject) => {
        setTimeout(() => {
          resolve(number + ": true\n");
        }, 10000);
      }),
    ]);

    // const result = await getUserStatus(number);

    if (!result) {
      response.body = {
        success: false,
        body: `No Account found with number: ${number}`,
      };
      response.status = 404;
      return;
    }

    response.body = {
      success: true,
      body: result,
    };
    response.status = 200;
  } catch (error) {
    response.body = error;
    response.status = 500;
  }
};

export const createAccount = async (
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
  try {
    const { number } = params;
    const { captcha, use_voice } = await body.value;

    if (!captcha) {
      response.body = {
        success: false,
        body:
          `No captcha given. You can get a valid captcha from: https://signalcaptchas.org/registration/generate.html`,
      };
      response.status = 406;
      return;
    }

    const error = await register(number, captcha, use_voice);
    if (error) {
      if (error == "Invalid captcha given.\r\n") {
        response.body = {
          success: false,
          body:
            `${error} You can get a valid captcha from: https://signalcaptchas.org/registration/generate.html`,
        };
        response.status = 406;
      } else {
        response.body = {
          success: false,
          body: `${error}`,
        };
        response.status = 500;
      }
      return;
    }

    response.body = {
      success: true,
      body: `Account information was created for: ${number}`,
    };
    response.status = 201;
  } catch (error) {
    response.body = error;
    response.status = 500;
  }
};

export const verifyAccount = async (
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

  try {
    const { number } = params;
    const { token } = await body.value;

    if (!token) {
      response.status = 406;
      response.body = {
        success: false,
        message: "Wrong data provided",
      };
      return;
    }
    // TODO: Validate token.

    const error = await verify(number, token);
    if (error) {
      response.body = {
        success: false,
        body: `${error}`,
      };

      response.status = 500;
      return;
    }

    response.status = 204;
  } catch (error) {
    response.body = error;
    response.status = 500;
  }
};

export const updateAccountInfo = async (
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

  try {
    const { number } = params;
    const { name, about } = await body.value;

    if (!name && !about) {
      response.status = 406;
      response.body = {
        success: false,
        message: "Not enough data provided.",
      };
      return;
    }
    // TODO: Validate name and about.

    const error = await updateProfile(number, name, about);
    if (error) {
      response.body = {
        success: false,
        body: `${error}`,
      };

      response.status = 500;
      return;
    }

    response.status = 204;
  } catch (error) {
    response.body = error;
    response.status = 500;
  }
};

export const deleteAccount = async ({ response, params }: Context | any) => {
  try {
    const { number } = params;
    const result = await unregister(number);

    if (!result) {
      response.body = {
        success: false,
        body: `Error deleting account: ${number}`,
      };
      response.status = 400;
      return;
    }

    response.status = 204;
  } catch (error) {
    response.body = error;
    response.status = 500;
  }
};

export const createWebhook = async (
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

  try {
    const { number } = params;
    const { webhook } = await body.value;
    // TODO: Validate webhook.

    const oldwebhook = Webhook.get(number);
    if (oldwebhook) {
      oldwebhook.delete();
    }

    console.log(await body.value);
    console.log("request to set webhook: " + webhook);

    if (!webhook) {
      response.status = 406;
      return;
    }
    new Webhook(webhook, number);

    response.status = 204;
  } catch (error) {
    response.body = error;
    response.status = 500;
  }
};

export const deleteWebhook = ({ response, params }: Context | any) => {
  try {
    const { number } = params;

    const webhook = Webhook.get(number);
    if (webhook) {
      webhook.delete();
      response.status = 204;
      return;
    }

    response.status = 404;
  } catch (error) {
    response.body = error;
    response.status = 500;
  }
};
