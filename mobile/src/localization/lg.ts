/**
 * lg.ts — Luganda strings
 */

import { en } from './en';

export const lg: Record<keyof typeof en, string> = {
  // SafeSignal screen
  safe_signal_title: "Obuwandiisi bw'Obukuumi",
  safe_signal_subtitle: 'Labula ekintu ekyakukola okutiisa',
  report_anonymous: 'Labula Nga Toyitibwa',
  case_ref_label: "Akabonero k'Ensonga yo",
  recovery_secret_label: "Kodi y'Okuddiza",
  save_these_warning: 'Tereka ebino — tebiragibwako nate',

  // Categories
  category_cyberbullying: 'Okusoomooza mu Intaneti',
  category_grooming: 'Okukebera Abaana',
  category_threats: 'Okukankanya',
  category_sextortion: "Okusaba Ebyobusoga mu Ngeri y'Obukolokolo",
  category_harassment: 'Okutaabya mu Intaneti',
  category_impersonation: "Okwefaananya n'Omuntu Omulala",
  category_privacy: 'Okwetooloola Ebyama',
  category_exploitation: 'Okukozesa Abaana Mu Ngeri Mbi',
  category_harmful_content: 'Ebintu Ebizibu',
  category_other: 'Ekirala',

  // Case status screen
  check_case_status: 'Kebera Ensonga yo',
  enter_case_ref: "Yingiza akabonero k'ensonga yo",
  enter_recovery_code: "Yingiza kodi y'okuddiza",

  // Simulation / demo
  simulated_label: '⚠️ EKYOLEKEZEBWA — okwolesebwa kwokka',

  // Language toggle
  language_toggle: 'EN / LG',

  // LoginScreen
  brand_name: 'GuardianLink Lite',
  tagline: 'Okusurfula okweevaamu obukuumi, awamu.',
  sign_in: 'Yingira',
  label_email: 'Imeyiri',
  label_password: 'Ekigambo ky\'Okulinda',
  placeholder_email: 'imeyiri@yo.com',
  placeholder_password: 'Yingiza ekigambo ky\'okulinda',
  show_password: 'Laga ekigambo ky\'okulinda',
  hide_password: 'Kisa ekigambo ky\'okulinda',
  demo_accounts: 'Akawunti ez\'Ekyolekezebwa',
  demo_parent: '[LG] Parent: kalyangoangelo@gmail.com / Parent123!',
  demo_child: '[LG] Child:  kalyango.200@gmail.com / Child123!',

  // ChildDashboard
  request_website_access: 'Saba Okuyingira ku Website',
  request_access_hint: 'Saba omuzadde wo olukusa okuyingira ku website.',
  placeholder_url: 'https://ekyokulabirako.com',
  btn_request_access: 'Saba Okuyingira',
  your_requests: 'Okusaba kwo',
  no_requests_yet: 'Tewali kusaba kunabaawo',
  no_requests_text: 'Yingiza URL ya website waggulu wandike "Saba Okuyingira".',
  request_sent_success: 'Okusaba kwatumibwa! Omuzadde wo ajjulizibwa.',
  no_parent_linked: '⚠ Tewali akawunti ya muzadde eyegebentekedde ku akawunti yo.',

  // ChildSafeSignalScreen
  safe_signal_screen_title: 'SafeSignal — Labula Ensobi',
  what_is_happening: 'Kiki ekirikutuuka?',
  describe_what_happened: 'Tegeeza ekyatuuka *',
  paste_message_content: 'Paste obubaka oba ekintu (si ngeri)',
  placeholder_describe: 'Tegeeza ensimbi mu bigambo byo bwekiiri…',
  placeholder_paste: 'Paste obubaka obubonaabona, link, oba ebyafaananyi wano…',
  btn_submit_report: 'Waŋisa Okubikkulira',
  report_submitted: 'Okubikkulira Kwatwalibwa',
  report_submitted_text: 'Okutiisatiisa kwo kutumibwa eri omulindizi wo okukebera. Togenda wekka — obuyambi bujja.',
  report_private_disclaimer: '🔒 Okubikkulira kwo kwama era kutumibwa eri omulindizi wo ow\'okka.',
  safesignal_done: 'Vaawo',

  // SafeSignal categories
  cat_suspicious_message: 'Obubaka Obubuulira Omutawaana',
  cat_cyberbullying: 'Okusoomooza mu Intaneti',
  cat_threats: 'Okukankanya',
  cat_inappropriate_request: 'Okusaba Obutakwata',
  cat_suspicious_link: 'Link Obubuulira Omutawaana',
  cat_other: 'Ekirala',

  // ChildRequestAccessScreen
  request_access_title: 'Saba Okuyingira ku Website',
  request_access_short_title: 'Saba Okuyingira',
  request_access_intro: 'Saba omulindizi wo olukusa okuyingira ku website eyimu. Ajjulizibwa era ayinza okwemera oba okugaana okusaba kwo.',
  field_website_url: 'URL ya Website *',
  field_reason: 'Ensonga *',
  placeholder_why_visit: 'Lwaki oyagala okuyingira ku website eno?',
  btn_submit_request: 'Waŋisa Okusaba',
  request_sent_title: 'Okusaba Kwatumibwa!',
  request_sent_text: 'Omuzadde wo ajjulizibwa era alikebera okusaba kwo mangu.',
  btn_done: 'Nkola',
  failed_submit_request: 'Okutuma okusaba kwakola buzibu.',

  // ChildRemovalRequestScreen
  removal_request_title: 'Saba Okuggyako GuardianLink',
  removal_request_short_title: 'Okusaba Okuggyako',
  about_removal_title: '📋 Ebikwata ku Kusaba Okuggyako',
  about_removal_text1: 'GuardianLink ewandiisiddwa ku simu eno okukuyamba okukuuma obukuumi bwo ku intaneti. Bw\'olowooza nti okulindirizibwa tekukyetaagibwa, oyinza okusaba okuggyako.',
  about_removal_text2: 'Omulindizi wo alikebera okusaba kwo era alyagala okuggyako. GuardianLink tegiggyibwako wekka wekka — omulindizi asaana kwemera okuggyako.',
  about_removal_text3: 'Okusaba kuno kuwandiikibwa era kulagirwa omulindizi wo.',
  field_reason_removal: 'Ensonga y\'okuggyako *',
  field_reason_removal_hint: 'Tegeeza lwaki olowooza nti okulindirizibwa kwa GuardianLink tekukyetaagibwa.',
  placeholder_removal_reason: 'Eky\'okulabirako: Nno olwatuusa 16 era omuzadde wange nange twemezeganya nti sikyetaaga kulindirizibwa.',
  btn_submit_removal: 'Waŋisa Okusaba Okuggyako',
  removal_disclaimer: 'Okusaba kuno kuwandiikibwa era kukebererwa omulindizi wo.',
  removal_submitted_title: 'Okusaba Kwatwalibwa',
  removal_submitted_text: 'Okusaba okuggyako kwatumibwa eri omulindizi wo okukebera. Alikugamba ku bigambo bikuukirira.',
  failed_submit_removal: 'Okutuma okusaba kwakola buzibu.',

  // ChildProtectionStatusScreen
  protection_status_title: 'Embeera y\'Okulindirizibwa',
  loading_protection_status: 'Tutuukiridde embeera y\'okulindirizibwa kwo…',
  shield_title: 'Okulindirizibwa kwa GuardianLink',
  shield_subtitle: 'Simu yo erilindirizibwa omulindizi wo.',
  device_connection: 'Okuganikira kwa Simu',
  status_active: 'Nzijuvu',
  status_unknown: 'Tekimanyiddwa',
  status_not_reported: 'Embeera teyabuulirizibwa. Ddayo olunno.',
  device_connected: 'Simu yo eganyiddwa era okulindirizibwa kuli mu nkola.',
  active_content_filters: 'Ebiggalo Ebikola Eby\'Ebintu',
  status_blocked: 'Ekizibiddwa',
  status_allowed: 'Ekiyainziddwa',
  no_content_categories: 'Tewali ngeri z\'ebintu eziteekeddwako.',
  blocked_keywords: 'Ebigambo Ebiggaliddwa',
  trusted_websites: 'Amatendeka Agesiimibwa',
  no_policy_data: 'Tewali makubirizo ga pulisi. Omulindizi wo tayinza okuba atateekeddeko biggalo.',
  protection_disclaimer: 'Amateeka ga pulisi gateekeddwa omulindizi wo era gekebererwa buli kiseera. Bw\'olina ebibuuzo, yogerera omulindizi wo.',

  // SplashScreen
  restoring_session: 'Okuddirizaamu okutuusawo…',

  // General
  btn_back: 'Ddayo',
  label_loading: 'Tutunuulira…',
};
