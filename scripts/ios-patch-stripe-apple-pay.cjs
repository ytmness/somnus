#!/usr/bin/env node
/**
 * Parchea @capacitor-community/stripe (iOS):
 * 1) presentApplePay cuelga si getRootVC() es nil (iOS 17+).
 * 2) amount entero a veces no caste a NSNumber y el force-unwrap crashea.
 *
 * Idempotente. Tras `npm ci` (y de nuevo en ios-postadd).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const APPLE = path.join(
  ROOT,
  "node_modules/@capacitor-community/stripe/ios/Sources/StripePlugin/ApplePay/ApplePayExecutor.swift"
);
const SHEET = path.join(
  ROOT,
  "node_modules/@capacitor-community/stripe/ios/Sources/StripePlugin/PaymentSheet/PaymentSheetExecutor.swift"
);

const KEY_WINDOW_HELPER = `
extension UIApplication {
    var somnusKeyWindowRootViewController: UIViewController? {
        let scenes = connectedScenes.compactMap { $0 as? UIWindowScene }
        let active = scenes.first(where: { $0.activationState == .foregroundActive }) ?? scenes.first
        let window = active?.windows.first(where: \\.isKeyWindow) ?? active?.windows.first
        return window?.rootViewController
    }
}
`;

function ensureHelper(text) {
  if (text.includes("somnusKeyWindowRootViewController")) return text;
  const idx = text.search(/\nclass /);
  if (idx < 0) throw new Error("no class found to insert UIApplication helper");
  return text.slice(0, idx) + "\n" + KEY_WINDOW_HELPER + text.slice(idx);
}

function replaceGetRootVc(text) {
  const old = "if let rootViewController = self.plugin?.getRootVC() {";
  const neu =
    "if let rootViewController = UIApplication.shared.somnusKeyWindowRootViewController ?? self.plugin?.getRootVC() {";
  return text.includes(old) ? text.split(old).join(neu) : text;
}

function patchAmount(text) {
  if (text.includes("var amountD: NSDecimalNumber? = nil")) return text;
  const fragile = `                let label = item["label"] as? String ?? ""
                let amount = item["amount"] as? NSNumber
                let amountD: NSDecimalNumber

                amountD = NSDecimalNumber(decimal: amount!.decimalValue)

                if (item["label"] != nil) && (item["amount"] != nil) {
                    paymentSummaryItems.append(PKPaymentSummaryItem(label: label, amount: amountD))
                }`;
  const robust = `                let label = item["label"] as? String ?? ""
                var amountD: NSDecimalNumber? = nil
                if let amount = item["amount"] as? NSNumber {
                    amountD = NSDecimalNumber(decimal: amount.decimalValue)
                } else if let amount = item["amount"] as? Double {
                    amountD = NSDecimalNumber(value: amount)
                } else if let amount = item["amount"] as? Int {
                    amountD = NSDecimalNumber(value: amount)
                } else if let amount = item["amount"] as? String, let d = Double(amount) {
                    amountD = NSDecimalNumber(value: d)
                }
                if let amountD = amountD, !label.isEmpty {
                    paymentSummaryItems.append(PKPaymentSummaryItem(label: label, amount: amountD))
                }`;
  if (!text.includes(fragile)) {
    console.warn("WARN: amount parse block not found");
    return text;
  }
  return text.split(fragile).join(robust);
}

function extractFunction(text, signature) {
  const start = text.indexOf(signature);
  if (start < 0) return null;
  const brace = text.indexOf("{", start);
  if (brace < 0) return null;
  let depth = 0;
  for (let i = brace; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return { start, end: i + 1 };
      }
    }
  }
  return null;
}

function patchEmptyItems(text) {
  if (text.includes("paymentSummaryItems could not be parsed")) return text;
  const needle = `        let merchantIdentifier = call.getString("merchantIdentifier") ?? ""`;
  if (!text.includes(needle)) {
    console.warn("WARN: merchantIdentifier block not found");
    return text;
  }
  const insert = `        if paymentSummaryItems.isEmpty {
            call.reject("Invalid Params. paymentSummaryItems could not be parsed")
            return
        }

        `;
  return text.replace(needle, insert + needle);
}

function patchRetainContext(text) {
  if (text.includes("presentedApplePayContext")) return text;
  const needle = "    private var shippingHandlerWorkItem: DispatchWorkItem?";
  if (!text.includes(needle)) {
    console.warn("WARN: shippingHandlerWorkItem not found");
    return text;
  }
  return text.replace(
    needle,
    needle + "\n    private var presentedApplePayContext: STPApplePayContext?"
  );
}

function patchPresentApplePay(text) {
  const signature = "    func presentApplePay(_ call: CAPPluginCall) {";
  const range = extractFunction(text, signature);
  if (!range) {
    console.warn("WARN: presentApplePay not found");
    return text;
  }
  const next = `    func presentApplePay(_ call: CAPPluginCall) {
        guard let paymentRequest = self.paymentRequest else {
            call.reject("You should run createApplePay befor presentApplePay")
            return
        }
        guard let applePayContext = STPApplePayContext(paymentRequest: paymentRequest, delegate: self) else {
            call.reject("STPApplePayContext is failed")
            return
        }
        self.presentedApplePayContext = applePayContext
        DispatchQueue.main.async {
            var presenter = UIApplication.shared.somnusKeyWindowRootViewController ?? self.plugin?.getRootVC()
            while let presented = presenter?.presentedViewController {
                presenter = presented
            }
            guard let presenter = presenter else {
                call.reject("No root view controller for Apple Pay")
                return
            }
            self.plugin?.bridge?.saveCall(call)
            self.payCallId = call.callbackId
            applePayContext.presentApplePay(on: presenter)
        }
    }`;
  return text.slice(0, range.start) + next + text.slice(range.end);
}

function stripKeyWindowHelper(text) {
  const pattern =
    /\nextension UIApplication \{\n    var somnusKeyWindowRootViewController: UIViewController\? \{[\s\S]*?\n    \}\n\}\n/;
  return pattern.test(text) ? text.replace(pattern, "\n") : text;
}

function main() {
  if (!fs.existsSync(APPLE)) {
    console.warn(`WARN: missing ${APPLE}`);
    return;
  }

  let src = fs.readFileSync(APPLE, "utf8");
  src = ensureHelper(src);
  src = patchAmount(src);
  src = patchEmptyItems(src);
  src = patchRetainContext(src);
  src = replaceGetRootVc(src);
  src = patchPresentApplePay(src);
  fs.writeFileSync(APPLE, src);
  console.log(`OK: ${APPLE}`);

  if (fs.existsSync(SHEET)) {
    let sheet = fs.readFileSync(SHEET, "utf8");
    // Mismo target Swift: la extension solo puede vivir en un archivo.
    sheet = stripKeyWindowHelper(sheet);
    sheet = replaceGetRootVc(sheet);
    fs.writeFileSync(SHEET, sheet);
    console.log(`OK: ${SHEET}`);
  }
}

main();
