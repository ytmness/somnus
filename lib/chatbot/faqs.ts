export type FaqLink = {
  href: string;
  label: string;
};

export type FaqEntry = {
  id: string;
  title: string;
  keywords: string[];
  answer: string;
  links?: FaqLink[];
};

export const CHAT_INTRO =
  "Qué onda, soy Vaivén. Te ayudo con todas tus dudas: boletos, pagos o cómo entrar.";

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: "comprar",
    title: "Cómo comprar",
    keywords: [
      "comprar",
      "compra",
      "boleto",
      "boletos",
      "ticket",
      "entrada",
      "entradas",
      "como compro",
      "quiero ir",
    ],
    answer:
      "Entra al evento desde Inicio o Explorar, elige tu boleto o mesa y paga. Necesitas cuenta en Somnus. Al terminar te sale el recibo y los boletos quedan en Mis boletos.",
    links: [
      { href: "/explorar", label: "Ver eventos" },
      { href: "/register", label: "Crear cuenta" },
    ],
  },
  {
    id: "mis-boletos",
    title: "Mis boletos",
    keywords: [
      "mis boletos",
      "donde estan",
      "donde esta",
      "qr",
      "folio",
      "pase",
      "wallet",
      "no encuentro",
    ],
    answer:
      "Tus boletos viven en Mis boletos. Ahí está el QR, el folio y, si aplica, Apple Wallet o Google Wallet. Entra con la misma cuenta con la que pagaste.",
    links: [{ href: "/mis-boletos", label: "Ir a Mis boletos" }],
  },
  {
    id: "entrar",
    title: "Entrada al evento",
    keywords: [
      "entrar",
      "entrada",
      "acceso",
      "escanear",
      "puerta",
      "fila",
      "como entro",
      "llegar",
    ],
    answer:
      "En la puerta enseña el QR de Mis boletos o el pase de Wallet. No hace falta imprimir. Si el QR no aparece, recarga la página o vuelve a iniciar sesión.",
    links: [{ href: "/mis-boletos", label: "Abrir Mis boletos" }],
  },
  {
    id: "pago",
    title: "Pago",
    keywords: [
      "pagar",
      "pago",
      "stripe",
      "apple pay",
      "google pay",
      "tarjeta",
      "cargo",
      "comision",
      "servicio",
      "precio",
    ],
    answer:
      "El pago va por Stripe: tarjeta, Apple Pay o Google Pay según tu dispositivo. El total incluye un cargo de servicio. Si el cobro queda pendiente de aprobación, te avisamos por correo cuando el organizador lo acepte.",
  },
  {
    id: "recibo",
    title: "Recibo y correo",
    keywords: [
      "recibo",
      "correo",
      "email",
      "comprobante",
      "no me llego",
      "spam",
      "tickets@",
    ],
    answer:
      "Después de pagar ves el recibo en pantalla y te llega un correo con los boletos. Si no llega, revisa spam y abre Mis boletos. Ayuda: tickets@somnus.live.",
    links: [{ href: "/mis-boletos", label: "Mis boletos" }],
  },
  {
    id: "cuenta",
    title: "Cuenta",
    keywords: [
      "cuenta",
      "login",
      "iniciar",
      "sesion",
      "registro",
      "registrar",
      "contrasena",
      "password",
    ],
    answer:
      "Para comprar y ver boletos necesitas cuenta. Entra o regístrate con correo. Si olvidaste la contraseña, usa Restablecer contraseña en el login.",
    links: [
      { href: "/login", label: "Iniciar sesión" },
      { href: "/register", label: "Crear cuenta" },
    ],
  },
  {
    id: "mesas",
    title: "Mesas",
    keywords: ["mesa", "mesas", "vip", "invitacion", "invite", "guestlist"],
    answer:
      "Si el evento tiene mesas, las ves en la página del evento. Algunas van por invitación con un link. El pago de mesa sigue el mismo checkout seguro.",
    links: [{ href: "/explorar", label: "Ver eventos" }],
  },
  {
    id: "app",
    title: "App y web",
    keywords: ["app", "aplicacion", "ios", "android", "celular", "iphone"],
    answer:
      "La app y la web usan la misma cuenta. Compra en cualquiera y tus boletos aparecen en Mis boletos en ambos.",
    links: [{ href: "/mis-boletos", label: "Mis boletos" }],
  },
  {
    id: "soporte",
    title: "Soporte",
    keywords: [
      "ayuda",
      "soporte",
      "contacto",
      "hablar",
      "humano",
      "reembolso",
      "cancelar",
      "problema",
    ],
    answer:
      "Para un caso puntual (cobro, reembolso o un evento concreto) escribe a tickets@somnus.live con el correo de la compra y, si lo tienes, el folio.",
  },
];
