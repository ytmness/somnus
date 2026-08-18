/**
 * Verificación unificada del coordinador Somnus.
 * Ejecutar: npm run verify
 */
import { execSync } from "node:child_process";

const steps: { name: string; cmd: string }[] = [
  { name: "TypeScript", cmd: "npx tsc --noEmit" },
  { name: "ESLint", cmd: "npm run lint" },
  { name: "Auth logic", cmd: "npm run test:auth" },
  { name: "Production build", cmd: "npm run build" },
];

let failed = 0;

console.log("\n=== Coordinador Somnus — verificación ===\n");

for (const step of steps) {
  process.stdout.write(`▶ ${step.name}... `);
  try {
    execSync(step.cmd, { stdio: "pipe", encoding: "utf8" });
    console.log("OK");
  } catch (err) {
    failed++;
    console.log("FALLÓ");
    const output =
      err instanceof Error && "stdout" in err
        ? String((err as { stdout?: string; stderr?: string }).stdout ?? "") +
          String((err as { stderr?: string }).stderr ?? "")
        : String(err);
    console.log(output.slice(-2000));
  }
}

console.log(
  failed === 0
    ? "\n✓ Todos los checks pasaron.\n"
    : `\n✗ ${failed} check(s) fallaron.\n`
);
process.exit(failed > 0 ? 1 : 0);
