import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.SMOKE_BASE_URL || "https://somnus.live";
const OUT = path.resolve("scripts/_smoke-out");
const stamp = Date.now();
const email = `smoke+${stamp}@somnus.live`;
const password = "SmokeTest123!";
const name = "Smoke Tester";

const results = [];

function log(step, ok, detail = "") {
  const row = { step, ok, detail };
  results.push(row);
  console.log(`${ok ? "PASS" : "FAIL"} | ${step}${detail ? " — " + detail : ""}`);
}

async function shot(page, name) {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "es-MX",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);

  // --- Public pages ---
  for (const [label, url] of [
    ["home", "/"],
    ["login_page", "/login"],
    ["register_page", "/register"],
    ["galeria", "/galeria"],
  ]) {
    try {
      const res = await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
      await shot(page, label);
      log(`page ${url}`, !!res && res.ok(), `status=${res?.status()} url=${page.url()}`);
    } catch (e) {
      log(`page ${url}`, false, e.message);
    }
  }

  // --- Register ---
  try {
    await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
    await page.fill('input[placeholder="Tu nombre"]', name);
    await page.fill('input[type="email"]', email);
    await page.fill('input[placeholder="Mínimo 8 caracteres"]', password);
    await page.fill('input[placeholder="Repite tu contraseña"]', password);

    const [regResp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/auth/register") && r.request().method() === "POST",
        { timeout: 30000 }
      ),
      page.click('button[type="submit"]'),
    ]);
    const regStatus = regResp.status();
    const regText = await regResp.text().catch(() => "");
    let regJson = {};
    try {
      regJson = JSON.parse(regText || "{}");
    } catch {
      regJson = {};
    }
    await page.waitForTimeout(2500);
    await shot(page, "after-register");
    const landed = page.url();
    const session1 = await context.request.get(`${BASE}/api/auth/session`);
    const sess1 = await session1.json();
    const regOk =
      regStatus === 200 &&
      !sess1?.user &&
      landed.includes("/verificar-email");
    log(
      "register requires OTP verification",
      regOk,
      `api=${regStatus} requiresVerification=${!!regJson?.requiresVerification} session=${sess1?.user?.email || "null"} landed=${landed} body=${regText.slice(0, 160)}`
    );
  } catch (e) {
    await shot(page, "register-error");
    log("register requires OTP verification", false, e.message);
  }

  // --- Logout (debe quedar sin sesión; registro ya no abre sesión) ---
  try {
    const logoutResp = await context.request.post(`${BASE}/api/auth/logout`);
    await context.clearCookies();
    const session2 = await context.request.get(`${BASE}/api/auth/session`);
    const sess2 = await session2.json();
    log("logout / no session", !sess2?.user, `api=${logoutResp.status()} session=${sess2?.user ? "still" : "null"}`);
  } catch (e) {
    log("logout / no session", false, e.message);
  }

  // --- Login sin verificar: debe bloquear y mandar a /verificar-email ---
  try {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    const [loginResp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/auth/login") && r.request().method() === "POST",
        { timeout: 30000 }
      ),
      page.click('button[type="submit"]'),
    ]);
    const loginStatus = loginResp.status();
    const loginText = await loginResp.text().catch(() => "");
    let loginJson = {};
    try {
      loginJson = JSON.parse(loginText || "{}");
    } catch {
      loginJson = {};
    }
    await page.waitForTimeout(2500);
    await shot(page, "after-login-unverified");
    const landed = page.url();
    const session3 = await context.request.get(`${BASE}/api/auth/session`);
    const sess3 = await session3.json();
    const loginOk =
      loginStatus === 403 &&
      !sess3?.user &&
      landed.includes("/verificar-email");
    log(
      "login blocked until email verified",
      loginOk,
      `api=${loginStatus} code=${loginJson?.code || "?"} session=${sess3?.user?.email || "null"} landed=${landed} body=${loginText.slice(0, 160)}`
    );
  } catch (e) {
    await shot(page, "login-error");
    log("login blocked until email verified", false, e.message);
  }

  // --- Forgot password (from login, needs email filled) ---
  try {
    await context.clearCookies();
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', email);
    const [fpResp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/auth/forgot-password") && r.request().method() === "POST",
        { timeout: 30000 }
      ),
      page.getByRole("button", { name: /Olvidaste tu contraseña/i }).click(),
    ]);
    const fpStatus = fpResp.status();
    const fpJson = await fpResp.json().catch(() => ({}));
    await page.waitForTimeout(1500);
    await shot(page, "after-forgot-password");
    log(
      "forgot-password",
      fpStatus === 200 && !!fpJson?.success,
      `api=${fpStatus} msg=${fpJson?.message || fpJson?.error || ""}`
    );
  } catch (e) {
    await shot(page, "forgot-error");
    log("forgot-password", false, e.message);
  }

  // --- OTP verify schema smoke (UI page loads; send OTP via API) ---
  try {
    await page.goto(`${BASE}/verificar-email?email=${encodeURIComponent(email)}`, {
      waitUntil: "networkidle",
    });
    await shot(page, "verificar-email");
    const send = await context.request.post(`${BASE}/api/auth/otp/send`, {
      data: { email },
    });
    const sendJson = await send.json().catch(() => ({}));
    log(
      "otp send",
      send.ok() && !!sendJson?.success,
      `api=${send.status()} msg=${sendJson?.message || sendJson?.error || ""}`
    );

    // Bad field name should 400 Datos inválidos
    const bad = await context.request.post(`${BASE}/api/auth/otp/verify`, {
      data: { email, token: "12345678" },
    });
    const badJson = await bad.json().catch(() => ({}));
    log(
      "otp verify rejects token field",
      bad.status() === 400 && /inválidos|invalidos/i.test(JSON.stringify(badJson)),
      `api=${bad.status()} body=${JSON.stringify(badJson).slice(0, 120)}`
    );

    // Valid field, wrong code
    const wrong = await context.request.post(`${BASE}/api/auth/otp/verify`, {
      data: { email, code: "12345678" },
    });
    const wrongJson = await wrong.json().catch(() => ({}));
    log(
      "otp verify accepts code field",
      wrong.status() === 400 && /inválido|expirado/i.test(JSON.stringify(wrongJson)),
      `api=${wrong.status()} body=${JSON.stringify(wrongJson).slice(0, 120)}`
    );
  } catch (e) {
    log("otp flow", false, e.message);
  }

  // --- Social buttons present ---
  try {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    const google = await page.getByRole("button", { name: /Google/i }).count();
    const apple = await page.getByRole("button", { name: /Apple/i }).count();
    await shot(page, "social-buttons");
    log("social buttons visible", google > 0 && apple > 0, `google=${google} apple=${apple}`);
  } catch (e) {
    log("social buttons visible", false, e.message);
  }

  await browser.close();

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  const summary = {
    base: BASE,
    email,
    password,
    passed,
    failed,
    results,
    screenshots: OUT,
  };
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(summary, null, 2));
  console.log("\n==== SUMMARY ====");
  console.log(`passed=${passed} failed=${failed}`);
  console.log(`test user: ${email} / ${password}`);
  console.log(`screenshots: ${OUT}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
