/**
 * i18n — UI copy for the home experience (header, hero, tool grid,
 * home sections, footer). Tool names and in-tool panel copy stay English
 * by design (product IDs). The active language comes from the URL locale
 * (see LocaleProvider in i18n-hooks.tsx) — every locale has its own URL,
 * which is what makes hreflang work.
 */
export type Lang = "en" | "es" | "fr" | "pt" | "hi" | "ur" | "ar";

export interface LocaleMeta {
  id: Lang;
  label: string; // native name
  short: string; // chip label
  dir: "ltr" | "rtl";
  hreflang: string;
}

export const LOCALES: LocaleMeta[] = [
  { id: "en", label: "English", short: "EN", dir: "ltr", hreflang: "en" },
  { id: "es", label: "Español", short: "ES", dir: "ltr", hreflang: "es" },
  { id: "fr", label: "Français", short: "FR", dir: "ltr", hreflang: "fr" },
  { id: "pt", label: "Português", short: "PT", dir: "ltr", hreflang: "pt" },
  { id: "hi", label: "हिन्दी", short: "HI", dir: "ltr", hreflang: "hi" },
  { id: "ur", label: "اردو", short: "UR", dir: "rtl", hreflang: "ur" },
  { id: "ar", label: "العربية", short: "AR", dir: "rtl", hreflang: "ar" },
];

export const DEFAULT_LOCALE: Lang = "en";

export const isLocale = (v: string): v is Lang =>
  LOCALES.some((l) => l.id === v);

export const localeMeta = (id: Lang): LocaleMeta =>
  LOCALES.find((l) => l.id === id) ?? LOCALES[0];

export const LANGS = LOCALES; // legacy alias

import { dictionaries as extra } from "./i18n-extra";

const en = {
  a11y: { skip: "Skip to tools" },
  nav: {
    tools: "Tools",
    blog: "Blog",
    search: "Search",
    privacy: "Nothing leaves your device",
  },
  mega: {
    aria: "All tools, grouped by category",
    mobileTitle: "All tools",
    mobileDesc: "32 tools · grouped by category",
  },
  lang: { label: "Language" },
  cats: { all: "All", core: "Core", convert: "Convert", edit: "Edit", security: "Security" },
  hero: {
    eyebrow: "{n} tools · 100% on-device",
    h1a: "Every PDF tool.",
    h1b: "None of your files leave this device.",
    sub: "Drop a file and SwiftPDF picks the right tool — merge, split, compress, convert and more, processed entirely on your device.",
    dropTitle: "Drop PDF or image files here",
    dropBrowse: "or click to browse",
    dropPaste: "paste with",
    formatsLabel: "Supported",
    popularTools: "Popular tools",
    viewAll: "View all tools",
    dropHint: "Files stay on this device · No account · Works offline",
    chips: { private: "Private", offline: "Works offline", nosignup: "No sign-up", free: "Free" },
  },
  sug: {
    combine: "{n} PDFs ready to combine",
    convert: "{n} image(s) ready to convert",
    one: "1 PDF — what do you want to do with it?",
  },
  grid: {
    title: "All tools",
    count: "built-in · more coming",
    searchPh: "Search tools…",
    searchAria: "Search tools",
    tabFavs: "Favorites",
    recent: "Recently used",
    recentNote: "stored only on this device",
    clear: "Clear",
    noResults: "No tool matches",
    noResultsHint: "Try “merge”, “word”, “lock”… or open the search palette:",
    noResultsCta: "Open search (Ctrl+K)",
    favAdd: "Add to favorites",
    favRemove: "Remove from favorites",
    mostUsed: "Most used",
    mostUsedNote: "what people open first",
    customize: "Customize",
    done: "Done",
    customizeHint:
      "Drag the cards or use the arrows to arrange tools your way — saved only on this device.",
    resetOrder: "Reset order",
    moveUp: "Move up",
    moveDown: "Move down",
  },
  how: {
    eyebrow: "How it works",
    title: "Three steps. Zero uploads.",
    steps: [
      {
        t: "Drop your files",
        d: "Drag them in, paste from the clipboard with Ctrl+V, or browse. Nothing is uploaded — files stay inside your browser tab.",
      },
      {
        t: "Pick a tool",
        d: "Choose from 32 tools — or accept the one SwiftPDF suggests for the files you dropped.",
      },
      {
        t: "Download the result",
        d: "Processing runs on your device's own CPU. When it's done, save the file — it was never sent anywhere.",
      },
    ],
  },
  why: {
    eyebrow: "Privacy by architecture",
    title: "Why on-device?",
    sub: "Every SwiftPDF tool runs inside your browser tab. That changes three things:",
    items: [
      {
        t: "Private",
        d: "Contracts, invoices, IDs — your files never touch a server, so there is nothing to intercept, retain or leak.",
      },
      {
        t: "Fast",
        d: "No upload or download round-trip. Work starts the instant you click, at your device's full speed.",
      },
      {
        t: "Offline",
        d: "Once the page is loaded, the tools keep working with no internet connection — ideal for travel and confidential networks.",
      },
    ],
  },
  cmp: {
    eyebrow: "No marketing spin",
    title: "The honest comparison",
    sub: "Exactly where a local-first toolkit and a typical upload-based service differ.",
    you: "SwiftPDF (on-device)",
    them: "Typical upload tool",
    rows: [
      { k: "Files leave your device", a: "Never — processing is local", b: "Yes — files are uploaded" },
      { k: "Works offline", a: "Yes, after first load", b: "No" },
      { k: "Sign-up required", a: "Never", b: "Often, for full features" },
      { k: "Start speed", a: "Instant — no transfer", b: "Upload + queue + download" },
      { k: "Size limits", a: "What your device can handle", b: "Server quota, usually fixed" },
      { k: "Sensitive documents", a: "Stay local, always", b: "Handled per provider policy" },
    ],
  },
  faq: {
    eyebrow: "Good to know",
    title: "Frequently asked questions",
    items: [
      {
        q: "Are my files really never uploaded?",
        a: "Yes, really. Every tool is JavaScript running in your browser tab: parsing, editing and encoding all happen in your device's memory. The page even works with your network disconnected — a genuine upload-based service can't do that.",
      },
      {
        q: "Is it free? Do I need an account?",
        a: "Free, and no account — there is no server to log into. If you ever see a sign-up prompt on a site like this, it is a server asking for your files first.",
      },
      {
        q: "What about very large files?",
        a: "There is no artificial cap, but your device sets the real limit: memory and browser tab space. A modern laptop handles files of several hundred megabytes; for very large scans, close other tabs and expect a wait.",
      },
      {
        q: "Does PDF to Word keep the exact layout?",
        a: "It rebuilds an editable document from the PDF's text layer: paragraphs and reading order are preserved, but not pixel-perfect spacing. Scanned pages have no text layer, so they come back empty — OCR is not (yet) included.",
      },
      {
        q: "Which browsers are supported?",
        a: "Any modern browser: Chrome, Edge, Firefox, Safari and their mobile versions. The engine uses WebAssembly and web workers that all current browsers ship.",
      },
      {
        q: "Can I use it for confidential documents?",
        a: "That is exactly what it is for. Because nothing is transmitted, contracts, medical records and IDs never exist on a third-party server. For maximum caution: load the page, go offline, then work.",
      },
    ],
  },
  cta: {
    title: "Ready when you are.",
    sub: "Drop a file — or pick any tool below. No account, no uploads, no waiting.",
    btn: "Open the dropzone",
  },
  footer: {
    tagline: "Fast, private PDF tools that run entirely in your browser.",
    privacy: "Files never leave your device. No account. No tracking of file contents.",
    tools: "Popular tools",
    cats: "Categories",
    site: "Site",
    faq: "FAQ",
    how: "How it works",
    copyright: "© 2026 SwiftPDF. Local-first by design.",
    bottom: "100% in-browser · no file contents tracked · works offline",
  },
  related: {
    title: "Related tools",
    sub: "More tools for this job — all on-device",
  },
  share: { label: "Share", copied: "Link copied to clipboard" },
  install: { label: "Install app" },
  blogNote: "Articles are currently available in English only.",
};

export type Copy = typeof en;

const es: Copy = {
  a11y: { skip: "Ir a las herramientas" },
  nav: {
    tools: "Herramientas",
    blog: "Blog",
    search: "Buscar",
    privacy: "Nada sale de tu dispositivo",
  },
  mega: {
    aria: "Todas las herramientas, por categoría",
    mobileTitle: "Todas las herramientas",
    mobileDesc: "32 herramientas · por categoría",
  },
  lang: { label: "Idioma" },
  cats: { all: "Todas", core: "Esenciales", convert: "Convertir", edit: "Edición", security: "Seguridad" },
  hero: {
    eyebrow: "{n} herramientas · 100 % en tu dispositivo",
    h1a: "Todas las herramientas PDF.",
    h1b: "Ningún archivo sale de tu dispositivo.",
    sub: "Suelta un archivo y SwiftPDF elige la herramienta adecuada — combinar, dividir, comprimir, convertir y más, procesado íntegramente en tu dispositivo.",
    dropTitle: "Suelta aquí tus PDF o imágenes",
    dropBrowse: "o haz clic para explorar",
    dropPaste: "pega con",
    formatsLabel: "Admitidos",
    popularTools: "Herramientas populares",
    viewAll: "Ver todas las herramientas",
    dropHint: "Los archivos permanecen en tu dispositivo · Sin cuenta · Funciona sin conexión",
    chips: { private: "Privado", offline: "Funciona sin conexión", nosignup: "Sin registro", free: "Gratis" },
  },
  sug: {
    combine: "{n} PDF listos para combinar",
    convert: "{n} imagen(es) listas para convertir",
    one: "1 PDF — ¿qué quieres hacer con él?",
  },
  grid: {
    title: "Todas las herramientas",
    count: "integradas · más en camino",
    searchPh: "Buscar herramientas…",
    searchAria: "Buscar herramientas",
    tabFavs: "Favoritas",
    recent: "Usadas recientemente",
    recentNote: "guardado solo en este dispositivo",
    clear: "Borrar",
    noResults: "Ninguna herramienta coincide",
    noResultsHint: "Prueba «merge», «word», «lock»… o abre el buscador:",
    noResultsCta: "Abrir buscador (Ctrl+K)",
    favAdd: "Añadir a favoritas",
    favRemove: "Quitar de favoritas",
    mostUsed: "Más usadas",
    mostUsedNote: "las que se abren primero",
    customize: "Personalizar",
    done: "Listo",
    customizeHint:
      "Arrastra las tarjetas o usa las flechas para ordenar las herramientas a tu manera — se guarda solo en este dispositivo.",
    resetOrder: "Restablecer orden",
    moveUp: "Subir",
    moveDown: "Bajar",
  },
  how: {
    eyebrow: "Cómo funciona",
    title: "Tres pasos. Cero subidas.",
    steps: [
      {
        t: "Suelta tus archivos",
        d: "Arrástralos, pégalos con Ctrl+V o explóralos. No se sube nada: los archivos se quedan en tu navegador.",
      },
      {
        t: "Elige una herramienta",
        d: "Elige entre 32 herramientas — o acepta la que SwiftPDF sugiera para los archivos que soltaste.",
      },
      {
        t: "Descarga el resultado",
        d: "El procesado usa la CPU de tu dispositivo. Al terminar, guarda el archivo: nunca se envió a ningún sitio.",
      },
    ],
  },
  why: {
    eyebrow: "Privacidad por arquitectura",
    title: "¿Por qué en tu dispositivo?",
    sub: "Cada herramienta de SwiftPDF se ejecuta dentro de tu navegador. Eso cambia tres cosas:",
    items: [
      {
        t: "Privado",
        d: "Contratos, facturas, documentos de identidad: tus archivos nunca tocan un servidor, así que no hay nada que interceptar, retener o filtrar.",
      },
      {
        t: "Rápido",
        d: "Sin ida y vuelta de subida ni descarga. El trabajo empieza al instante, a toda la velocidad de tu equipo.",
      },
      {
        t: "Sin conexión",
        d: "Una vez cargada la página, las herramientas siguen funcionando sin internet — ideal para viajes y redes confidenciales.",
      },
    ],
  },
  cmp: {
    eyebrow: "Sin marketing",
    title: "Comparación honesta",
    sub: "Exactamente en qué se diferencia un conjunto de herramientas local de un servicio típico que sube archivos.",
    you: "SwiftPDF (en tu dispositivo)",
    them: "Herramienta típica con subida",
    rows: [
      { k: "Los archivos salen de tu dispositivo", a: "Nunca — el procesado es local", b: "Sí — se suben a servidores" },
      { k: "Funciona sin conexión", a: "Sí, tras la primera carga", b: "No" },
      { k: "Registro requerido", a: "Nunca", b: "A menudo, para todo" },
      { k: "Velocidad de inicio", a: "Instantánea — sin transferencia", b: "Subida + cola + descarga" },
      { k: "Límites de tamaño", a: "Lo que tu equipo soporte", b: "Cuota del servidor, casi siempre fija" },
      { k: "Documentos confidenciales", a: "Siempre locales", b: "Según la política del proveedor" },
    ],
  },
  faq: {
    eyebrow: "Conviene saber",
    title: "Preguntas frecuentes",
    items: [
      {
        q: "¿De verdad no se suben mis archivos?",
        a: "De verdad. Cada herramienta es JavaScript en tu pestaña: el análisis, la edición y la codificación del PDF ocurren en la memoria de tu dispositivo. La página funciona incluso sin red — un servicio basado en subidas no puede decir lo mismo.",
      },
      {
        q: "¿Es gratis? ¿Necesito una cuenta?",
        a: "Gratis y sin cuenta: no hay ningún servidor al que iniciar sesión. Si alguna vez un sitio así te pide registrarte, es un servidor pidiéndote tus archivos primero.",
      },
      {
        q: "¿Y los archivos muy grandes?",
        a: "No hay límite artificial, pero tu equipo marca el límite real: la memoria y el espacio de la pestaña del navegador. Un portátil moderno maneja archivos de varios cientos de megabytes; con escaneos muy grandes, cierra otras pestañas y ten paciencia.",
      },
      {
        q: "¿PDF a Word mantiene la maquetación exacta?",
        a: "Reconstruye un documento editable desde la capa de texto del PDF: se conservan los párrafos y el orden de lectura, pero no el espaciado exacto. Las páginas escaneadas no tienen capa de texto y vuelven vacías — el OCR no está incluido (todavía).",
      },
      {
        q: "¿Qué navegadores son compatibles?",
        a: "Cualquier navegador moderno: Chrome, Edge, Firefox, Safari y sus versiones móviles. El motor usa WebAssembly y web workers que todos incluyen.",
      },
      {
        q: "¿Puedo usarlo con documentos confidenciales?",
        a: "Es justo para eso. Como no se transmite nada, los contratos, historiales médicos y documentos de identidad nunca existen en un servidor ajeno. Para máxima prudencia: carga la página, desconéctate y trabaja.",
      },
    ],
  },
  cta: {
    title: "Listo cuando tú lo estés.",
    sub: "Suelta un archivo — o elige cualquier herramienta. Sin cuenta, sin subidas, sin esperas.",
    btn: "Abrir la zona de archivos",
  },
  footer: {
    tagline: "Herramientas PDF rápidas y privadas, íntegramente en tu navegador.",
    privacy: "Los archivos nunca salen de tu dispositivo. Sin cuenta. Sin rastreo del contenido.",
    tools: "Herramientas populares",
    cats: "Categorías",
    site: "Sitio",
    faq: "Preguntas frecuentes",
    how: "Cómo funciona",
    copyright: "© 2026 SwiftPDF. Local primero, por diseño.",
    bottom: "100% en el navegador · sin rastreo del contenido · funciona sin conexión",
  },
  related: {
    title: "Herramientas relacionadas",
    sub: "Más herramientas para este trabajo — todo en tu dispositivo",
  },
  share: { label: "Compartir", copied: "Enlace copiado al portapapeles" },
  install: { label: "Instalar app" },
  blogNote: "Los artículos están disponibles solo en inglés por ahora.",
};

const fr: Copy = {
  a11y: { skip: "Aller aux outils" },
  nav: {
    tools: "Outils",
    blog: "Blog",
    search: "Rechercher",
    privacy: "Rien ne quitte votre appareil",
  },
  mega: {
    aria: "Tous les outils, par catégorie",
    mobileTitle: "Tous les outils",
    mobileDesc: "32 outils · par catégorie",
  },
  lang: { label: "Langue" },
  cats: { all: "Tous", core: "Essentiels", convert: "Conversion", edit: "Édition", security: "Sécurité" },
  hero: {
    eyebrow: "{n} outils · 100 % sur votre appareil",
    h1a: "Tous les outils PDF.",
    h1b: "Aucun fichier ne quitte votre appareil.",
    sub: "Déposez un fichier et SwiftPDF choisit le bon outil — fusionner, diviser, compresser, convertir et plus, entièrement traité sur votre appareil.",
    dropTitle: "Déposez vos PDF ou images ici",
    dropBrowse: "ou cliquez pour parcourir",
    dropPaste: "collez avec",
    formatsLabel: "Formats",
    popularTools: "Outils populaires",
    viewAll: "Voir tous les outils",
    dropHint: "Les fichiers restent sur cet appareil · Sans compte · Fonctionne hors ligne",
    chips: { private: "Privé", offline: "Fonctionne hors ligne", nosignup: "Sans inscription", free: "Gratuit" },
  },
  sug: {
    combine: "{n} PDF prêts à fusionner",
    convert: "{n} image(s) prête(s) à convertir",
    one: "1 PDF — que voulez-vous en faire ?",
  },
  grid: {
    title: "Tous les outils",
    count: "intégrés · d'autres arrivent",
    searchPh: "Rechercher un outil…",
    searchAria: "Rechercher un outil",
    tabFavs: "Favoris",
    recent: "Utilisés récemment",
    recentNote: "stocké uniquement sur cet appareil",
    clear: "Effacer",
    noResults: "Aucun outil ne correspond",
    noResultsHint: "Essayez « merge », « word », « lock »… ou ouvrez la palette de recherche :",
    noResultsCta: "Ouvrir la recherche (Ctrl+K)",
    favAdd: "Ajouter aux favoris",
    favRemove: "Retirer des favoris",
    mostUsed: "Les plus utilisées",
    mostUsedNote: "celles qu'on ouvre en premier",
    customize: "Personnaliser",
    done: "Terminé",
    customizeHint:
      "Faites glisser les cartes ou utilisez les flèches pour organiser les outils à votre façon — enregistré uniquement sur cet appareil.",
    resetOrder: "Réinitialiser l'ordre",
    moveUp: "Monter",
    moveDown: "Descendre",
  },
  how: {
    eyebrow: "Comment ça marche",
    title: "Trois étapes. Zéro envoi.",
    steps: [
      {
        t: "Déposez vos fichiers",
        d: "Glissez-les, collez-les avec Ctrl+V ou parcourez. Rien n'est envoyé : les fichiers restent dans votre onglet.",
      },
      {
        t: "Choisissez un outil",
        d: "32 outils au choix — ou acceptez celui que SwiftPDF suggère pour les fichiers déposés.",
      },
      {
        t: "Téléchargez le résultat",
        d: "Le traitement utilise le processeur de votre appareil. Une fois terminé, enregistrez : rien n'a jamais été envoyé.",
      },
    ],
  },
  why: {
    eyebrow: "Confidentialité par architecture",
    title: "Pourquoi sur l'appareil ?",
    sub: "Chaque outil SwiftPDF s'exécute dans votre onglet. Cela change trois choses :",
    items: [
      {
        t: "Privé",
        d: "Contrats, factures, pièces d'identité — vos fichiers ne touchent aucun serveur : rien à intercepter, conserver ou fuiter.",
      },
      {
        t: "Rapide",
        d: "Aucun aller-retour d'envoi ni de téléchargement. Le travail démarre instantanément, à la vitesse de votre machine.",
      },
      {
        t: "Hors ligne",
        d: "Une fois la page chargée, les outils fonctionnent sans internet — idéal en voyage et sur les réseaux confidentiels.",
      },
    ],
  },
  cmp: {
    eyebrow: "Sans argument marketing",
    title: "La comparaison honnête",
    sub: "Ce qui distingue exactement une boîte à outils locale d'un service classique basé sur l'envoi.",
    you: "SwiftPDF (sur l'appareil)",
    them: "Outil classique avec envoi",
    rows: [
      { k: "Les fichiers quittent votre appareil", a: "Jamais — traitement local", b: "Oui — envoyés à des serveurs" },
      { k: "Fonctionne hors ligne", a: "Oui, après le premier chargement", b: "Non" },
      { k: "Inscription requise", a: "Jamais", b: "Souvent, pour tout" },
      { k: "Vitesse de démarrage", a: "Instantanée — aucun transfert", b: "Envoi + file + téléchargement" },
      { k: "Limites de taille", a: "Ce que votre appareil supporte", b: "Quota serveur, presque toujours fixe" },
      { k: "Documents confidentiels", a: "Toujours locaux", b: "Selon la politique du service" },
    ],
  },
  faq: {
    eyebrow: "Bon à savoir",
    title: "Questions fréquentes",
    items: [
      {
        q: "Vos fichiers ne sont-ils vraiment jamais envoyés ?",
        a: "Jamais. Chaque outil est du JavaScript exécuté dans votre onglet : analyse, édition et encodage du PDF se font dans la mémoire de votre appareil. La page fonctionne même sans réseau — un service basé sur l'envoi ne peut pas le dire.",
      },
      {
        q: "Est-ce gratuit ? Faut-il un compte ?",
        a: "Gratuit et sans compte : il n'y a aucun serveur sur lequel se connecter. Si un site de ce type vous demande de vous inscrire, c'est qu'un serveur réclame vos fichiers d'abord.",
      },
      {
        q: "Et les très gros fichiers ?",
        a: "Aucune limite artificielle, mais votre appareil fixe la vraie limite : la mémoire et l'espace de l'onglet. Un ordinateur portable récent gère plusieurs centaines de mégaoctets ; pour de très grands scans, fermez les autres onglets et armez-vous de patience.",
      },
      {
        q: "PDF vers Word garde-t-il la mise en page exacte ?",
        a: "Il reconstruit un document éditable depuis la couche de texte du PDF : paragraphes et ordre de lecture conservés, mais pas l'espacement au pixel près. Les pages scannées n'ont pas de couche de texte et reviennent vides — l'OCR n'est pas inclus (pour l'instant).",
      },
      {
        q: "Quels navigateurs sont pris en charge ?",
        a: "Tous les navigateurs modernes : Chrome, Edge, Firefox, Safari et leurs versions mobiles. Le moteur utilise WebAssembly et des web workers que tous embarquent.",
      },
      {
        q: "Puis-je l'utiliser pour des documents confidentiels ?",
        a: "C'est exactement son rôle. Comme rien n'est transmis, contrats, dossiers médicaux et pièces d'identité n'existent jamais sur un serveur tiers. Par prudence maximale : chargez la page, coupez le réseau, puis travaillez.",
      },
    ],
  },
  cta: {
    title: "Prêt quand vous l'êtes.",
    sub: "Déposez un fichier — ou choisissez un outil. Sans compte, sans envoi, sans attente.",
    btn: "Ouvrir la zone de dépôt",
  },
  footer: {
    tagline: "Des outils PDF rapides et privés, entièrement dans votre navigateur.",
    privacy: "Les fichiers ne quittent jamais votre appareil. Sans compte. Aucun suivi du contenu.",
    tools: "Outils populaires",
    cats: "Catégories",
    site: "Site",
    faq: "FAQ",
    how: "Comment ça marche",
    copyright: "© 2026 SwiftPDF. Local d'abord, par conception.",
    bottom: "100 % dans le navigateur · aucun suivi du contenu · fonctionne hors ligne",
  },
  related: {
    title: "Outils associés",
    sub: "D'autres outils pour ce travail — tout sur votre appareil",
  },
  share: { label: "Partager", copied: "Lien copié dans le presse-papiers" },
  install: { label: "Installer l'app" },
  blogNote: "Les articles sont actuellement en anglais uniquement.",
};

export const dictionaries: Record<Lang, Copy> = {
  en,
  es,
  fr,
  pt: extra.pt,
  hi: extra.hi,
  ur: extra.ur,
  ar: extra.ar,
};
