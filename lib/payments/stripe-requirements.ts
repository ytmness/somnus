/** Etiquetas en español para campos de requisitos de Stripe Connect (MX). */
const REQUIREMENT_LABELS: Record<string, string> = {
  "business_profile.mcc": "Categoría del negocio (tipo de actividad)",
  "business_profile.url": "Sitio web del negocio",
  "business_profile.product_description": "Descripción del negocio",
  external_account: "Cuenta bancaria (CLABE) para recibir pagos",
  "individual.email": "Correo electrónico",
  "individual.first_name": "Nombre",
  "individual.last_name": "Apellidos",
  "individual.phone": "Teléfono",
  "individual.id_number": "CURP o RFC",
  "individual.dob.day": "Fecha de nacimiento (día)",
  "individual.dob.month": "Fecha de nacimiento (mes)",
  "individual.dob.year": "Fecha de nacimiento (año)",
  "individual.address.line1": "Dirección (calle y número)",
  "individual.address.line2": "Colonia o interior",
  "individual.address.line3": "Referencia de dirección",
  "individual.address.city": "Ciudad",
  "individual.address.state": "Estado",
  "individual.address.postal_code": "Código postal",
  "individual.address.town": "Municipio",
  "tos_acceptance.date": "Aceptar términos de Stripe",
  "tos_acceptance.ip": "Aceptar términos de Stripe",
};

export function formatStripeRequirements(requirements: string[]): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];

  for (const req of requirements) {
    const label = REQUIREMENT_LABELS[req] || req;
    if (seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }

  return labels;
}

export function dedupeRequirements(requirements: string[]): string[] {
  return Array.from(new Set(requirements));
}
