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

function patchApplePayNilRoot(text) {
  if (text.includes("No root view controller for Apple Pay")) return text;
  const pattern =
    /DispatchQueue\.main\.async \{\s*if let rootViewController = (?:UIApplication\.shared\.somnusKeyWindowRootViewController \?\? )?self\.plugin\?\.getRootVC\(\) \{\s*self\.plugin\?\.bridge\?\.saveCall\(call\)\s*self\.payCallId = call\.callbackId\s*applePayContext\.presentApplePay\(on: rootViewController\)\s*\}\s*\}/m;
  const repl = `DispatchQueue.main.async {
                if let rootViewController = UIApplication.shared.somnusKeyWindowRootViewController ?? self.plugin?.getRootVC() {
                    self.plugin?.bridge?.saveCall(call)
                    self.payCallId = call.callbackId
                    applePayContext.presentApplePay(on: rootViewController)
                } else {
                    call.reject("No root view controller for Apple Pay")
                }
            }`;
  if (!pattern.test(text)) {
    console.warn("WARN: could not wrap Apple Pay present with nil-root reject");
    return text;
  }
  return text.replace(pattern, repl);
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
  src = replaceGetRootVc(src);
  src = patchApplePayNilRoot(src);
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
