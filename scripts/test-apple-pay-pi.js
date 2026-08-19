require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

(async () => {
  const pi = await stripe.paymentIntents.create({
    amount: 10000,
    currency: "mxn",
    automatic_payment_methods: { enabled: true },
    metadata: { test: "apple-pay-debug" },
  });
  console.log("id:", pi.id);
  console.log("status:", pi.status);
  console.log("payment_method_types:", pi.payment_method_types);
  console.log("client_secret prefix:", pi.client_secret.slice(0, 30));

  const methods = await stripe.paymentIntents.retrieve(pi.id, {
    expand: ["payment_method_options"],
  });
  console.log("payment_method_options keys:", Object.keys(methods.payment_method_options || {}));

  await stripe.paymentIntents.cancel(pi.id);
  console.log("cancelled test PI");
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
