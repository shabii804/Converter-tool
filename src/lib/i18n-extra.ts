/**
 * i18n-extra — Portuguese, Hindi, Urdu and Arabic dictionaries.
 * Import type only (no runtime cycle with i18n.ts).
 */
import type { Copy, Lang } from "./i18n";

const pt: Copy = {
  a11y: { skip: "Ir para as ferramentas" },
  nav: {
    tools: "Ferramentas",
    blog: "Blog",
    search: "Pesquisar",
    privacy: "0 bytes enviados",
  },
  mega: {
    aria: "Todas as ferramentas, por categoria",
    mobileTitle: "Todas as ferramentas",
    mobileDesc: "27 ferramentas · por categoria",
  },
  lang: { label: "Idioma" },
  cats: { all: "Todas", core: "Essenciais", convert: "Converter", edit: "Editar", security: "Segurança" },
  hero: {
    eyebrow: "{n} ferramentas · 100% no seu dispositivo",
    h1a: "Todas as ferramentas PDF.",
    h1b: "Nenhum arquivo sai do seu dispositivo.",
    sub: "Solte um arquivo e o SwiftPDF escolhe a ferramenta certa — mesclar, dividir, comprimir, converter e mais, processado inteiramente no seu dispositivo.",
    dropTitle: "Solte arquivos PDF ou imagens aqui",
    dropBrowse: "ou clique para procurar",
    dropPaste: "cole com",
    formatsLabel: "Formatos",
    popularTools: "Ferramentas populares",
    viewAll: "Ver todas as ferramentas",
    dropHint: "Os arquivos ficam neste dispositivo · Sem conta · Funciona offline",
    chips: { private: "Privado", offline: "Funciona offline", nosignup: "Sem cadastro", free: "Grátis" },
  },
  sug: {
    combine: "{n} PDFs prontos para combinar",
    convert: "{n} imagem(ns) pronta(s) para converter",
    one: "1 PDF — o que você quer fazer com ele?",
  },
  grid: {
    title: "Todas as ferramentas",
    count: "integradas · mais a caminho",
    searchPh: "Pesquisar ferramentas…",
    searchAria: "Pesquisar ferramentas",
    tabFavs: "Favoritas",
    recent: "Usadas recentemente",
    recentNote: "salvo apenas neste dispositivo",
    clear: "Limpar",
    noResults: "Nenhuma ferramenta corresponde",
    noResultsHint: "Tente “merge”, “word”, “lock”… ou abra a busca:",
    noResultsCta: "Abrir busca (Ctrl+K)",
    favAdd: "Adicionar aos favoritos",
    favRemove: "Remover dos favoritos",
  },
  how: {
    eyebrow: "Como funciona",
    title: "Três passos. Zero envios.",
    steps: [
      {
        t: "Solte seus arquivos",
        d: "Arraste-os, cole com Ctrl+V ou procure. Nada é enviado — os arquivos ficam na aba do navegador.",
      },
      {
        t: "Escolha uma ferramenta",
        d: "São 27 ferramentas — ou aceite a que o SwiftPDF sugerir para os arquivos que você soltou.",
      },
      {
        t: "Baixe o resultado",
        d: "O processamento usa a CPU do seu dispositivo. Ao terminar, salve o arquivo — ele nunca foi enviado a lugar algum.",
      },
    ],
  },
  why: {
    eyebrow: "Privacidade por arquitetura",
    title: "Por que no dispositivo?",
    sub: "Cada ferramenta do SwiftPDF roda na sua aba do navegador. Isso muda três coisas:",
    items: [
      {
        t: "Privado",
        d: "Contratos, notas fiscais, documentos de identidade — seus arquivos nunca tocam um servidor, então não há nada para interceptar, reter ou vazar.",
      },
      {
        t: "Rápido",
        d: "Sem ida e volta de upload ou download. O trabalho começa no instante do clique, em velocidade total do seu dispositivo.",
      },
      {
        t: "Offline",
        d: "Depois que a página carrega, as ferramentas continuam funcionando sem internet — ideal para viagens e redes confidenciais.",
      },
    ],
  },
  cmp: {
    eyebrow: "Sem marketing",
    title: "A comparação honesta",
    sub: "Exatamente onde um kit de ferramentas local e um serviço típico baseado em upload se diferenciam.",
    you: "SwiftPDF (no dispositivo)",
    them: "Ferramenta típica com upload",
    rows: [
      { k: "Arquivos saem do seu dispositivo", a: "Nunca — o processamento é local", b: "Sim — os arquivos são enviados" },
      { k: "Funciona offline", a: "Sim, após o primeiro carregamento", b: "Não" },
      { k: "Cadastro necessário", a: "Nunca", b: "Frequentemente, para tudo" },
      { k: "Velocidade de início", a: "Instantânea — sem transferência", b: "Upload + fila + download" },
      { k: "Limites de tamanho", a: "O que seu dispositivo suportar", b: "Cota do servidor, quase sempre fixa" },
      { k: "Documentos confidenciais", a: "Sempre locais", b: "Conforme a política do provedor" },
    ],
  },
  faq: {
    eyebrow: "Bom saber",
    title: "Perguntas frequentes",
    items: [
      {
        q: "Meus arquivos realmente nunca são enviados?",
        a: "Realmente. Cada ferramenta é JavaScript rodando na sua aba: análise, edição e codificação acontecem na memória do seu dispositivo. A página funciona até com a internet desconectada — um serviço baseado em upload não pode dizer o mesmo.",
      },
      {
        q: "É grátis? Preciso de uma conta?",
        a: "Grátis e sem conta — não há servidor para acessar. Se um site assim pedir cadastro, é um servidor pedindo seus arquivos primeiro.",
      },
      {
        q: "E arquivos muito grandes?",
        a: "Não há limite artificial, mas seu dispositivo define o limite real: memória e espaço da aba. Um laptop moderno lida com arquivos de várias centenas de megabytes; para scans muito grandes, feche outras abas e aguarde.",
      },
      {
        q: "O PDF para Word mantém o layout exato?",
        a: "Ele reconstrói um documento editável a partir da camada de texto do PDF: parágrafos e ordem de leitura são preservados, mas não o espaçamento exato. Páginas digitalizadas não têm camada de texto e voltam vazias — OCR ainda não está incluído.",
      },
      {
        q: "Quais navegadores são compatíveis?",
        a: "Qualquer navegador moderno: Chrome, Edge, Firefox, Safari e suas versões móveis. O motor usa WebAssembly e web workers que todos já incluem.",
      },
      {
        q: "Posso usar com documentos confidenciais?",
        a: "É exatamente para isso. Como nada é transmitido, contratos, laudos médicos e documentos de identidade nunca existem em servidor de terceiros. Para máxima cautela: carregue a página, fique offline e trabalhe.",
      },
    ],
  },
  cta: {
    title: "Pronto quando você estiver.",
    sub: "Solte um arquivo — ou escolha qualquer ferramenta. Sem conta, sem envios, sem espera.",
    btn: "Abrir a área de arquivos",
  },
  footer: {
    tagline: "Ferramentas PDF rápidas e privadas, totalmente no seu navegador.",
    privacy: "Os arquivos nunca saem do seu dispositivo. Sem conta. Sem rastreamento do conteúdo.",
    tools: "Ferramentas populares",
    cats: "Categorias",
    site: "Site",
    faq: "FAQ",
    how: "Como funciona",
    copyright: "© 2026 SwiftPDF. Local primeiro, por design.",
    bottom: "100% no navegador · nenhum rastreamento do conteúdo · funciona offline",
  },
  related: {
    title: "Ferramentas relacionadas",
    sub: "Mais ferramentas para este trabalho — todas no dispositivo",
  },
  share: { label: "Compartilhar", copied: "Link copiado para a área de transferência" },
  install: { label: "Instalar app" },
  blogNote: "Os artigos estão disponíveis apenas em inglês por enquanto.",
};

const hi: Copy = {
  a11y: { skip: "टूल्स पर जाएँ" },
  nav: {
    tools: "टूल्स",
    blog: "ब्लॉग",
    search: "खोजें",
    privacy: "0 बाइट अपलोड हुए",
  },
  mega: {
    aria: "सभी टूल्स, श्रेणी के अनुसार",
    mobileTitle: "सभी टूल्स",
    mobileDesc: "27 टूल्स · श्रेणी के अनुसार",
  },
  lang: { label: "भाषा" },
  cats: { all: "सभी", core: "मूलभूत", convert: "कन्वर्ट", edit: "संपादन", security: "सुरक्षा" },
  hero: {
    eyebrow: "{n} टूल · 100% आपके डिवाइस पर",
    h1a: "हर PDF टूल एक जगह।",
    h1b: "आपकी कोई फ़ाइल इस डिवाइस से बाहर नहीं जाती।",
    sub: "फ़ाइल छोड़ें और SwiftPDF सही टूल चुनता है — मर्ज, स्प्लिट, कंप्रेस, कन्वर्ट और बहुत कुछ, पूरी तरह आपके डिवाइस पर प्रोसेस होता है।",
    dropTitle: "PDF या इमेज फ़ाइलें यहाँ छोड़ें",
    dropBrowse: "या क्लिक करके चुनें",
    dropPaste: "पेस्ट करें",
    formatsLabel: "समर्थित",
    popularTools: "लोकप्रिय टूल",
    viewAll: "सभी टूल देखें",
    dropHint: "फ़ाइलें इसी डिवाइस पर रहती हैं · खाता नहीं · ऑफ़लाइन चलता है",
    chips: { private: "निजी", offline: "ऑफ़लाइन चलता है", nosignup: "साइन-अप नहीं", free: "मुफ़्त" },
  },
  sug: {
    combine: "{n} PDFs जोड़ने के लिए तैयार",
    convert: "{n} इमेज कन्वर्ट के लिए तैयार",
    one: "1 PDF — इसके साथ क्या करना चाहेंगे?",
  },
  grid: {
    title: "सभी टूल्स",
    count: "बिल्ट-इन · और आ रहे हैं",
    searchPh: "टूल्स खोजें…",
    searchAria: "टूल्स खोजें",
    tabFavs: "पसंदीदा",
    recent: "हाल में उपयोग किए गए",
    recentNote: "केवल इसी डिवाइस पर सेव",
    clear: "साफ़ करें",
    noResults: "कोई टूल मेल नहीं खाता",
    noResultsHint: "“merge”, “word”, “lock”… आज़माएँ या सर्च पैलेट खोलें:",
    noResultsCta: "सर्च खोलें (Ctrl+K)",
    favAdd: "पसंदीदा में जोड़ें",
    favRemove: "पसंदीदा से हटाएँ",
  },
  how: {
    eyebrow: "कैसे काम करता है",
    title: "तीन चरण। शून्य अपलोड।",
    steps: [
      {
        t: "फ़ाइलें छोड़ें",
        d: "खींचकर छोड़ें, Ctrl+V से पेस्ट करें या ब्राउज़ करें। कुछ भी अपलोड नहीं होता — फ़ाइलें आपके ब्राउज़र टैब में ही रहती हैं।",
      },
      {
        t: "टूल चुनें",
        d: "27 टूल्स में से चुनें — या SwiftPDF जो टूल आपकी फ़ाइलों के लिए सुझाए, उसे स्वीकार करें।",
      },
      {
        t: "रिज़ल्ट डाउनलोड करें",
        d: "प्रोसेसिंग आपके डिवाइस के CPU पर चलती है। पूरा होने पर फ़ाइल सेव करें — उसे कभी कहीं भेजा नहीं गया।",
      },
    ],
  },
  why: {
    eyebrow: "आर्किटेक्चर से निजी",
    title: "डिवाइस पर ही क्यों?",
    sub: "SwiftPDF का हर टूल आपके ब्राउज़र टैब में चलता है। इससे तीन बातें बदलती हैं:",
    items: [
      {
        t: "निजी",
        d: "कॉन्ट्रैक्ट, इनवॉइस, आईडी — आपकी फ़ाइलें कभी सर्वर को नहीं छूतीं, इसलिए उन्हें रोकने, रखने या लीक करने का कोई मौका ही नहीं।",
      },
      {
        t: "तेज़",
        d: "अपलोड या डाउनलोड का कोई चक्कर नहीं। क्लिक करते ही काम शुरू, आपके डिवाइस की पूरी गति पर।",
      },
      {
        t: "ऑफ़लाइन",
        d: "पेज लोड होने के बाद टूल्स बिना इंटरनेट के भी चलते हैं — यात्रा और गोपनीय नेटवर्क के लिए आदर्श।",
      },
    ],
  },
  cmp: {
    eyebrow: "कोई मार्केटिंग नहीं",
    title: "ईमानदार तुलना",
    sub: "लोकल-फ़र्स्ट टूलकिट और आम अपलोड-आधारित सेवा में ठीक क्या अंतर है।",
    you: "SwiftPDF (डिवाइस पर)",
    them: "आम अपलोड वाला टूल",
    rows: [
      { k: "फ़ाइलें डिवाइस से बाहर जाती हैं", a: "कभी नहीं — प्रोसेसिंग लोकल है", b: "हाँ — फ़ाइलें अपलोड होती हैं" },
      { k: "ऑफ़लाइन चलता है", a: "हाँ, पहले लोड के बाद", b: "नहीं" },
      { k: "साइन-अप ज़रूरी", a: "कभी नहीं", b: "अक्सर, सबके लिए" },
      { k: "शुरुआती गति", a: "तुरंत — कोई ट्रांसफ़र नहीं", b: "अपलोड + कतार + डाउनलोड" },
      { k: "साइज़ सीमा", a: "आपका डिवाइस जो सँभाले", b: "सर्वर कोटा, लगभग हमेशा तय" },
      { k: "संवेदनशील दस्तावेज़", a: "हमेशा लोकल", b: "प्रोवाइडर की नीति के अनुसार" },
    ],
  },
  faq: {
    eyebrow: "जानने योग्य",
    title: "अक्सर पूछे जाने वाले सवाल",
    items: [
      {
        q: "क्या मेरी फ़ाइलें सच में कभी अपलोड नहीं होतीं?",
        a: "सच में नहीं। हर टूल आपके टैब में चलने वाला JavaScript है: पार्सिंग, एडिटिंग और एनकोडिंग आपके डिवाइस की मेमोरी में होती है। पेज इंटरनेट डिस्कनेक्ट होने पर भी चलता है — अपलोड आधारित सेवा यह नहीं कह सकती।",
      },
      {
        q: "क्या यह मुफ़्त है? खाता चाहिए?",
        a: "मुफ़्त, और खाता नहीं — लॉग इन करने को कोई सर्वर ही नहीं। अगर ऐसी साइट साइन-अप माँगे, तो वह सर्वर पहले आपकी फ़ाइलें माँग रहा है।",
      },
      {
        q: "बहुत बड़ी फ़ाइलों का क्या?",
        a: "कोई कृत्रिम सीमा नहीं, पर असली सीमा आपका डिवाइस है: मेमोरी और टैब की क्षमता। आधुनिक लैपटॉप कई सौ MB तक सँभालता है; बहुत बड़े स्कैन के लिए अन्य टैब बंद करें और धैर्य रखें।",
      },
      {
        q: "क्या PDF to Word सटीक लेआउट रखता है?",
        a: "यह PDF की टेक्स्ट लेयर से एडिटेबल डॉक्यूमेंट बनाता है: पैराग्राफ़ और पढ़ने का क्रम सुरक्षित रहते हैं, पर पिक्सेल-परफ़ेक्ट स्पेसिंग नहीं। स्कैन किए पेजों में टेक्स्ट लेयर नहीं होती — वे खाली आते हैं। OCR अभी शामिल नहीं है।",
      },
      {
        q: "कौन से ब्राउज़र चलते हैं?",
        a: "कोई भी आधुनिक ब्राउज़र: Chrome, Edge, Firefox, Safari और उनके मोबाइल वर्शन। इंजन WebAssembly और वर्कर का उपयोग करता है जो सबमें होते हैं।",
      },
      {
        q: "गोपनीय दस्तावेज़ों के लिए उपयोग कर सकते हैं?",
        a: "यही तो इसका उद्देश्य है। कुछ भी ट्रांसमिट नहीं होता, इसलिए कॉन्ट्रैक्ट, मेडिकल रिकॉर्ड और आईडी कभी तीसरे सर्वर पर नहीं पहुँचते। अधिकतम सावधानी: पेज लोड करें, नेट बंद करें, फिर काम करें।",
      },
    ],
  },
  cta: {
    title: "जब आप तैयार हों।",
    sub: "फ़ाइल छोड़ें — या कोई भी टूल चुनें। खाता नहीं, अपलोड नहीं, इंतज़ार नहीं।",
    btn: "ड्रॉपज़ोन खोलें",
  },
  footer: {
    tagline: "तेज़, निजी PDF टूल्स — पूरी तरह आपके ब्राउज़र में।",
    privacy: "फ़ाइलें कभी डिवाइस से बाहर नहीं जातीं। खाता नहीं। कंटेंट का कोई ट्रैकिंग नहीं।",
    tools: "लोकप्रिय टूल्स",
    cats: "श्रेणियाँ",
    site: "साइट",
    faq: "FAQ",
    how: "यह कैसे काम करता है",
    copyright: "© 2026 SwiftPDF. लोकल-फ़र्स्ट, डिज़ाइन से।",
    bottom: "100% ब्राउज़र में · कंटेंट ट्रैकिंग नहीं · ऑफ़लाइन चलता है",
  },
  related: {
    title: "संबंधित टूल्स",
    sub: "इस काम के लिए और टूल्स — सब डिवाइस पर",
  },
  share: { label: "शेयर करें", copied: "लिंक क्लिपबोर्ड पर कॉपी हो गया" },
  install: { label: "ऐप इंस्टॉल करें" },
  blogNote: "लेख फ़िलहाल केवल अंग्रेज़ी में उपलब्ध हैं।",
};

const ur: Copy = {
  a11y: { skip: "ٹولز پر جائیں" },
  nav: {
    tools: "ٹولز",
    blog: "بلاگ",
    search: "تلاش",
    privacy: "0 بائٹس اپ لوڈ ہوئے",
  },
  mega: {
    aria: "تمام ٹولز، زمرہ وار",
    mobileTitle: "تمام ٹولز",
    mobileDesc: "27 ٹولز · زمرہ وار",
  },
  lang: { label: "زبان" },
  cats: { all: "سب", core: "بنیادی", convert: "تبدیلی", edit: "ترمیم", security: "سیکیورٹی" },
  hero: {
    eyebrow: "{n} ٹولز · 100% آپ کے ڈیوائس پر",
    h1a: "ہر PDF ٹول ایک جگہ۔",
    h1b: "آپ کی کوئی فائل اس ڈیوائس سے باہر نہیں جاتی۔",
    sub: "فائل چھوڑیں اور SwiftPDF درست ٹول منتخب کرتا ہے — مرج، اسپلٹ، کمپریس، تبدیلی اور مزید، پوری طرح آپ کے ڈیوائس پر پروسیس ہوتا ہے۔",
    dropTitle: "PDF یا تصویری فائلیں یہاں چھوڑیں",
    dropBrowse: "یا کلک کر کے منتخب کریں",
    dropPaste: "پیسٹ کریں",
    formatsLabel: "سپورٹڈ",
    popularTools: "مقبول ٹولز",
    viewAll: "تمام ٹولز دیکھیں",
    dropHint: "فائلیں اسی ڈیوائس پر رہتی ہیں · اکاؤنٹ نہیں · آف لائن چلتا ہے",
    chips: { private: "پرائیویٹ", offline: "آف لائن چلتا ہے", nosignup: "سائن اپ نہیں", free: "مفت" },
  },
  sug: {
    combine: "{n} PDFs جوڑنے کے لیے تیار",
    convert: "{n} تصویریں تبدیل کرنے کے لیے تیار",
    one: "1 PDF — اس کے ساتھ کیا کرنا چاہتے ہیں؟",
  },
  grid: {
    title: "تمام ٹولز",
    count: "بلٹ اِن · مزید آرہے ہیں",
    searchPh: "ٹولز تلاش کریں…",
    searchAria: "ٹولز تلاش کریں",
    tabFavs: "پسندیدہ",
    recent: "حال ہی میں استعمال شدہ",
    recentNote: "صرف اسی ڈیوائس پر محفوظ",
    clear: "صاف کریں",
    noResults: "کوئی ٹول مطابقت نہیں رکھتا",
    noResultsHint: "”merge“، ”word“، ”lock“… آزمائیں یا سرچ پالیٹ کھولیں:",
    noResultsCta: "سرچ کھولیں (Ctrl+K)",
    favAdd: "پسندیدہ میں شامل کریں",
    favRemove: "پسندیدہ سے ہٹائیں",
  },
  how: {
    eyebrow: "کیسے کام کرتا ہے",
    title: "تین مرحلے۔ زیرو اپ لوڈ۔",
    steps: [
      {
        t: "فائلیں چھوڑیں",
        d: "کھینچ کر چھوڑیں، Ctrl+V سے پیسٹ کریں یا براؤز کریں۔ کچھ بھی اپ لوڈ نہیں ہوتا — فائلیں آپ کے براؤزر ٹیب میں رہتی ہیں۔",
      },
      {
        t: "ٹول منتخب کریں",
        d: "27 ٹولز میں سے چنیں — یا SwiftPDF جو ٹول آپ کی فائلوں کے لیے تجویز کرے، وہی قبول کریں۔",
      },
      {
        t: "نتیجہ ڈاؤن لوڈ کریں",
        d: "پروسیسنگ آپ کے ڈیوائس کے CPU پر چلتی ہے۔ مکمل ہونے پر فائل محفوظ کریں — اسے کہیں بھیجا نہیں گیا۔",
      },
    ],
  },
  why: {
    eyebrow: "ترکیب سے نجی",
    title: "ڈیوائس پر ہی کیوں؟",
    sub: "SwiftPDF کا ہر ٹول آپ کے براؤزر ٹیب میں چلتا ہے۔ اس سے تین چیزیں بدلتی ہیں:",
    items: [
      {
        t: "پرائیویٹ",
        d: "معاہدے، بل، شناختی دستاویزات — آپ کی فائلیں کبھی سرور کو نہیں چھوتیں، اس لیے انہیں روکنے، رکھنے یا لیک کرنے کا کوئی موقع ہی نہیں۔",
      },
      {
        t: "تیز",
        d: "اپ لوڈ یا ڈاؤن لوڈ کا کوئی چکر نہیں۔ کلک کرتے ہی کام شروع، آپ کے ڈیوائس کی مکمل رفتار پر۔",
      },
      {
        t: "آف لائن",
        d: "صفحہ لوڈ ہونے کے بعد ٹولز بغیر انٹرنیٹ کے بھی چلتے ہیں — سفر اور محرم گیٹ وے کے لیے بہترین۔",
      },
    ],
  },
  cmp: {
    eyebrow: "کوئی مارکیٹنگ نہیں",
    title: "ایماندارانہ موازنہ",
    sub: "لوکل فرسٹ ٹول کِٹ اور عام اپ لوڈ پر مبنی سروس میں بالکل کیا فرق ہے۔",
    you: "SwiftPDF (ڈیوائس پر)",
    them: "عام اپ لوڈ والا ٹول",
    rows: [
      { k: "فائلیں ڈیوائس سے باہر جاتی ہیں", a: "کبھی نہیں — پروسیسنگ لوکل ہے", b: "ہاں — فائلیں اپ لوڈ ہوتی ہیں" },
      { k: "آف لائن چلتا ہے", a: "ہاں، پہلے لوڈ کے بعد", b: "نہیں" },
      { k: "سائن اپ ضروری", a: "کبھی نہیں", b: "اکثر، ہر چیز کے لیے" },
      { k: "آغاز کی رفتار", a: "فوری — کوئی ٹرانسفر نہیں", b: "اپ لوڈ + قطار + ڈاؤن لوڈ" },
      { k: "سائز کی حد", a: "آپ کا ڈیوائس جو سنبھالے", b: "سرور کی کوٹہ، تقریباً ہمیشہ مقرر" },
      { k: "محرم دستاویزات", a: "ہمیشہ لوکل", b: "فراہم کنندہ کی پالیسی کے مطابق" },
    ],
  },
  faq: {
    eyebrow: "جاننے کے قابل",
    title: "اکثر پوچھے گئے سوالات",
    items: [
      {
        q: "کیا میری فائلیں واقعی کبھی اپ لوڈ نہیں ہوتیں؟",
        a: "واقعی نہیں۔ ہر ٹول آپ کے ٹیب میں چلنے والا JavaScript ہے: پارسنگ، ایڈیٹنگ اور انکوڈنگ آپ کے ڈیوائس کی میموری میں ہوتے ہیں۔ صفحہ انٹرنیٹ بند ہونے پر بھی چلتا ہے — اپ لوڈ پر مبنی سروس یہ نہیں کہہ سکتی۔",
      },
      {
        q: "کیا یہ مفت ہے؟ اکاؤنٹ چاہیے؟",
        a: "مفت، اور اکاؤنٹ نہیں — لاگ اِن کرنے کے لیے کوئی سرور ہی نہیں۔ اگر ایسی سائٹ سائن اپ مانگے تو وہ سرور پہلے آپ کی فائلیں مانگ رہا ہے۔",
      },
      {
        q: "بہت بڑی فائلوں کا کیا؟",
        a: "کوئی مصنوعی حد نہیں، مگر اصل حد آپ کا ڈیوائس ہے: میموری اور ٹیب کی گنجائش۔ جدید لیپ ٹاپ کئی سو MB تک سنبھالتا ہے؛ بہت بڑے اسکین کے لیے دوسرے ٹیب بند کریں اور صبر کریں۔",
      },
      {
        q: "کیا PDF to Word درست لے آؤٹ رکھتا ہے؟",
        a: "یہ PDF کی ٹیکسٹ لیئر سے ایڈیٹ ایبل ڈاکومنٹ بناتا ہے: پیراگراف اور پڑھنے کی ترتیب محفوظ رہتی ہے، مگر پکسل درست اسپیسنگ نہیں۔ اسکین کیے صفحوں میں ٹیکسٹ لیئر نہیں ہوتی — وہ خالی آتے ہیں۔ OCR ابھی شامل نہیں۔",
      },
      {
        q: "کون سے براؤزر چلتے ہیں؟",
        a: "کوئی بھی جدید براؤزر: Chrome، Edge، Firefox، Safari اور ان کے موبائل ورژن۔ انجن WebAssembly اور ورکرز استعمال کرتا ہے جو سب میں ہوتے ہیں۔",
      },
      {
        q: "محرم دستاویزات کے لیے استعمال کر سکتے ہیں؟",
        a: "یہی تو اس کا مقصد ہے۔ کچھ بھی منتقل نہیں ہوتا، اس لیے معاہدے، طبی ریکارڈ اور شناختی دستاویزات کبھی کسی تیسرے سرور پر نہیں پہنچتے۔ زیادہ سے زیادہ احتیاط: صفحہ لوڈ کریں، انٹرنیٹ بند کریں، پھر کام کریں۔",
      },
    ],
  },
  cta: {
    title: "جب آپ تیار ہوں۔",
    sub: "فائل چھوڑیں — یا کوئی بھی ٹول چنیں۔ اکاؤنٹ نہیں، اپ لوڈ نہیں، انتظار نہیں۔",
    btn: "ڈراپ زون کھولیں",
  },
  footer: {
    tagline: "تیز، نجی PDF ٹولز — مکمل طور پر آپ کے براؤزر میں۔",
    privacy: "فائلیں کبھی ڈیوائس سے باہر نہیں جاتیں۔ اکاؤنٹ نہیں۔ مواد کی کوئی ٹریکنگ نہیں۔",
    tools: "مقبول ٹولز",
    cats: "زمرے",
    site: "سائٹ",
    faq: "FAQ",
    how: "یہ کیسے کام کرتا ہے",
    copyright: "© 2026 SwiftPDF۔ لوکل فرسٹ، ڈیزائن سے۔",
    bottom: "100% براؤزر میں · مواد کی کوئی ٹریکنگ نہیں · آف لائن چلتا ہے",
  },
  related: {
    title: "متعلقہ ٹولز",
    sub: "اس کام کے لیے مزید ٹولز — سب ڈیوائس پر",
  },
  share: { label: "شیئر کریں", copied: "لنک کلپ بورڈ پر کاپی ہو گیا" },
  install: { label: "ایپ انسٹال کریں" },
  blogNote: "مضامین فی الحال صرف انگریزی میں دستیاب ہیں۔",
};

const ar: Copy = {
  a11y: { skip: "الانتقال إلى الأدوات" },
  nav: {
    tools: "الأدوات",
    blog: "المدونة",
    search: "بحث",
    privacy: "0 بايت مرفوعة",
  },
  mega: {
    aria: "كل الأدوات، بحسب الفئة",
    mobileTitle: "كل الأدوات",
    mobileDesc: "27 أداة · بحسب الفئة",
  },
  lang: { label: "اللغة" },
  cats: { all: "الكل", core: "أساسية", convert: "تحويل", edit: "تحرير", security: "الأمان" },
  hero: {
    eyebrow: "{n} أداة · 100% على جهازك",
    h1a: "كل أدوات PDF في مكان واحد.",
    h1b: "لا ملف من ملفاتك يغادر هذا الجهاز.",
    sub: "أفلِت ملفًا وسيتولى SwiftPDF اختيار الأداة المناسبة — دمج، تقسيم، ضغط، تحويل والمزيد، تتم معالجتها بالكامل على جهازك.",
    dropTitle: "أفلِت ملفات PDF أو الصور هنا",
    dropBrowse: "أو انقر للتصفح",
    dropPaste: "الصق باستخدام",
    formatsLabel: "الصيغ المدعومة",
    popularTools: "الأدوات الشائعة",
    viewAll: "عرض كل الأدوات",
    dropHint: "الملفات تبقى على هذا الجهاز · بلا حساب · تعمل دون اتصال",
    chips: { private: "خاصة", offline: "تعمل دون اتصال", nosignup: "بلا تسجيل", free: "مجانية" },
  },
  sug: {
    combine: "{n} ملفات PDF جاهزة للدمج",
    convert: "{n} صورة جاهزة للتحويل",
    one: "ملف PDF واحد — ماذا تريد أن تفعل به؟",
  },
  grid: {
    title: "كل الأدوات",
    count: "مدمجة · والمزيد قادم",
    searchPh: "ابحث في الأدوات…",
    searchAria: "ابحث في الأدوات",
    tabFavs: "المفضلة",
    recent: "استُخدمت مؤخرًا",
    recentNote: "محفوظة على هذا الجهاز فقط",
    clear: "مسح",
    noResults: "لا أداة مطابقة",
    noResultsHint: "جرّب ”merge“ أو ”word“ أو ”lock“… أو افتح لوحة البحث:",
    noResultsCta: "افتح البحث (Ctrl+K)",
    favAdd: "أضف إلى المفضلة",
    favRemove: "أزل من المفضلة",
  },
  how: {
    eyebrow: "كيف تعمل",
    title: "ثلاث خطوات. صفر رفع.",
    steps: [
      {
        t: "أفلِت ملفاتك",
        d: "اسحبها أو الصقها بـ Ctrl+V أو تصفّحها. لا يُرفع شيء — تبقى الملفات داخل تبويب المتصفح.",
      },
      {
        t: "اختر أداة",
        d: "27 أداة بينها اختر — أو اقبل الأداة التي يقترحها SwiftPDF للملفات التي أفلتها.",
      },
      {
        t: "نزّل النتيجة",
        d: "تتم المعالجة على معالج جهازك نفسه. عند الانتهاء احفظ الملف — لم تُرسَل إلى أي مكان أبدًا.",
      },
    ],
  },
  why: {
    eyebrow: "الخصوصية بالتصميم",
    title: "لماذا على الجهاز؟",
    sub: "كل أداة في SwiftPDF تعمل داخل تبويب متصفحك. هذا يغيّر ثلاثة أمور:",
    items: [
      {
        t: "خاصة",
        d: "العقود والفواتير ووثائق الهوية — ملفاتك لا تلمس خادمًا أبدًا، فلا شيء للاعتراض عليه أو الاحتفاظ به أو تسريبه.",
      },
      {
        t: "سريعة",
        d: "لا رحلة ذهاب وإياب للرفع أو التنزيل. يبدأ العمل لحظة النقر وبكامل سرعة جهازك.",
      },
      {
        t: "دون اتصال",
        d: "بعد تحميل الصفحة تظل الأدوات تعمل بلا إنترنت — مثالي للسفر والشبكات الحساسة.",
      },
    ],
  },
  cmp: {
    eyebrow: "بلا تسويق",
    title: "المقارنة الصادقة",
    sub: "أين يختلف مجموعة الأدوات المحلية تمامًا عن الخدمة المعتادة القائمة على الرفع.",
    you: "SwiftPDF (على الجهاز)",
    them: "أداة معتادة ترفع الملفات",
    rows: [
      { k: "الملفات تغادر جهازك", a: "أبدًا — المعالجة محلية", b: "نعم — تُرفع الملفات" },
      { k: "تعمل دون اتصال", a: "نعم، بعد أول تحميل", b: "لا" },
      { k: "تسجيل مطلوب", a: "أبدًا", b: "غالبًا، لكل شيء" },
      { k: "سرعة البدء", a: "فورية — لا نقل", b: "رفع + انتظار + تنزيل" },
      { k: "حدود الحجم", a: "ما يستطيع جهازك", b: "حصة الخادم، شبه ثابتة" },
      { k: "المستندات الحساسة", a: "محلية دائمًا", b: "حسب سياسة المزوّد" },
    ],
  },
  faq: {
    eyebrow: "من المفيد معرفة",
    title: "الأسئلة الشائعة",
    items: [
      {
        q: "هل ملفاتي لا تُرفع حقًا أبدًا؟",
        a: "حقًا لا. كل أداة هي JavaScript يعمل في تبويبك: التحليل والتحرير والترميز تتم في ذاكرة جهازك. الصفحة تعمل حتى مع انقطاع الشبكة — وهي خدمة قائمة على الرفع لا تستطيع قول ذلك.",
      },
      {
        q: "هل هي مجانية؟ هل أحتاج حسابًا؟",
        a: "مجانية وبلا حساب — لا يوجد خادم لتسجيل الدخول إليه. إن طلب موقع كهذا تسجيلًا فهو خادم يطلب ملفاتك أولًا.",
      },
      {
        q: "وماذا عن الملفات الكبيرة جدًا؟",
        a: "لا حد اصطناعي، لكن حدك الحقيقي هو جهازك: الذاكرة ومساحة التبويب. حاسوب حديث يتعامل مع مئات الميغابايتات؛ للمسوح الضخمة جدًا أغلق التبويبات الأخرى وتسلّح بالصبر.",
      },
      {
        q: "هل يحافظ PDF إلى Word على التنسيق تمامًا؟",
        a: "يعيد بناء مستند قابل للتحرير من طبقة نص PDF: تُحفظ الفقرات وترتيب القراءة، لكن ليس التباعد بالبكسل. الصفحات الممسوحة بلا طبقة نص تعود فارغة — التعرف الضوئي غير مضاف (بعد).",
      },
      {
        q: "ما المتصفحات المدعومة؟",
        a: "أي متصفح حديث: Chrome وEdge وFirefox وSafari وإصداراتها المحمولة. المحرك يستخدم WebAssembly وWeb Workers المتوفرة فيها جميعًا.",
      },
      {
        q: "هل أستطيع استخدامه لمستندات حساسة؟",
        a: "هذا هدفه بالضبط. لأن لا شيء يُرسل، العقود والسجلات الطبية ووثائق الهوية لا توجد أبدًا على خادم طرف ثالث. لأقصى حذر: افتح الصفحة، افصل الإنترنت، ثم اعمل.",
      },
    ],
  },
  cta: {
    title: "جاهز عندما تكون جاهزًا.",
    sub: "أفلِت ملفًا — أو اختر أي أداة. بلا حساب، بلا رفع، بلا انتظار.",
    btn: "افتح منطقة الإفلات",
  },
  footer: {
    tagline: "أدوات PDF سريعة وخاصة، تعمل بالكامل في متصفحك.",
    privacy: "الملفات لا تغادر جهازك أبدًا. بلا حساب. لا تتبع للمحتوى.",
    tools: "أدوات شائعة",
    cats: "الفئات",
    site: "الموقع",
    faq: "الأسئلة الشائعة",
    how: "كيف تعمل",
    copyright: "© 2026 SwiftPDF. المحلية أولًا بالتصميم.",
    bottom: "100% في المتصفح · لا تتبع للمحتوى · تعمل دون اتصال",
  },
  related: {
    title: "أدوات ذات صلة",
    sub: "المزيد من الأدوات لهذه المهمة — كلها على الجهاز",
  },
  share: { label: "مشاركة", copied: "نُسخ الرابط إلى الحافظة" },
  install: { label: "ثبّت التطبيق" },
  blogNote: "المقالات متاحة حاليًا بالإنجليزية فقط.",
};

export const dictionaries: { pt: Copy; hi: Copy; ur: Copy; ar: Copy } = { pt, hi, ur, ar };
