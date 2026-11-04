/**
 * i18n.js — GuardianLink PWA localization
 *
 * English (en) and Luganda (lg) strings for the child portal.
 * Language preference is stored in localStorage.
 */
(function () {
  'use strict';

  const STRINGS = {
    en: {
      // Branding
      app_name: 'GuardianLink',
      tagline: 'Child Safety Platform',
      child_portal: 'Child Portal',

      // Navigation
      report_harm: 'Report Harm',
      check_status: 'Check Case Status',
      learn: 'Learn',
      curiosity_corner: 'Curiosity Corner',
      plans: 'Plans',
      home: 'Home',
      back: 'Back',

      // Report screen
      report_title: 'Report Something',
      report_subtitle: 'Tell us what happened. You do not need to give your name.',
      choose_picture: 'Choose what happened',
      describe_report: 'Type what happened (optional)',
      paste_report: 'Or paste a message (optional)',
      safe_to_contact: 'Is it okay for someone to contact you about this?',
      safe_to_contact_yes: 'Yes, it is okay',
      safe_to_contact_no: 'No, not right now',
      submit_report: 'Send Report',
      sending: 'Sending…',

      // Picture categories
      cat_bullying: 'Bullying',
      cat_bullying_desc: 'Someone is being mean or hurting you online',
      cat_threats: 'Threats',
      cat_threats_desc: 'Someone said they will hurt you',
      cat_private_pics: 'Asking for private pictures',
      cat_private_pics_desc: 'Someone wants photos that are not okay',
      cat_harassment: 'Harassment',
      cat_harassment_desc: 'Someone keeps bothering you',
      cat_impersonation: 'Someone pretending',
      cat_impersonation_desc: 'Someone is faking who they are',
      cat_unwanted: 'Unwanted messages',
      cat_unwanted_desc: 'Messages you do not want',
      cat_other: 'Something else',
      cat_other_desc: 'Anything that made you feel unsafe',

      // Success modal
      report_sent: 'Report Sent',
      case_ref: 'Your Case Reference',
      recovery_secret: 'Your Recovery Code',
      save_warning: 'Save these now — they will not be shown again.',
      copy_case_ref: 'Copy Case Reference',
      copy_secret: 'Copy Recovery Code',
      copied: 'Copied!',
      done: 'Done',
      what_happens_next: 'What happens next?',
      next_1: 'A trained person will look at your report.',
      next_2: 'You can check the status using your case reference and recovery code.',
      next_3: 'If you are in danger right now, call 116 (Child Helpline) or 999 (Police).',

      // Case status
      status_title: 'Check Your Case Status',
      enter_case_ref: 'Enter your case reference',
      enter_recovery: 'Enter your recovery code',
      check: 'Check Status',
      status_label: 'Status',
      category_label: 'Category',
      submitted_label: 'Submitted',
      updated_label: 'Last Updated',
      response_label: 'Message for you',
      no_response_yet: 'No message yet. Please check again later.',
      invalid_credentials: 'Invalid case reference or recovery code.',

      // Curiosity Corner
      curiosity_title: 'Curiosity Corner',
      curiosity_subtitle: 'Ask a question about staying safe online',
      curiosity_placeholder: 'Type your question…',
      ask: 'Ask',
      curiosity_warning: 'If you need to report something that happened to you, tap Report Harm.',
      curiosity_response: 'Answer',
      curiosity_no_answer: 'This question will be reviewed. Please check back later.',

      // Learning
      learn_title: 'Learn',
      learn_subtitle: 'Stay safe online with these tips',
      lesson_bullying: 'What is cyberbullying?',
      lesson_privacy: 'Keeping your information private',
      lesson_friends: 'Online friends and strangers',
      lesson_boundaries: 'Digital boundaries',
      lesson_help: 'How to get help',

      // Commercial
      plans_title: 'GuardianLink Plans',
      plans_subtitle: 'Reporting is always free',
      plan_free: 'Free',
      plan_free_price: 'UGX 0',
      plan_family: 'Family Premium',
      plan_family_price: 'UGX 10,000/month',
      plan_school: 'School Starter',
      plan_school_price: 'UGX 100,000/month',
      plan_ngo: 'NGO / Institutional',
      plan_ngo_price: 'Custom',
      request_demo: 'Request Demo',

      // Emergency
      emergency_help: 'Need help now?',
      emergency_call: 'Call 116 (Child Helpline) or 999 (Police) if you are in danger.',

      // Language
      switch_lang: 'Luganda',

      // Voice reporting
      voice_report: 'Voice report',
      voice_start: 'Tap to speak',
      voice_stop: 'Tap to stop',
      voice_listening: 'Listening…',
      voice_not_supported: 'Voice input is not available. You can type or choose a picture instead.',
    },

    lg: {
      // Branding
      app_name: 'GuardianLink',
      tagline: 'Pulatifoomu ya Bulamu bwa Mwana',
      child_portal: 'Potolo ya Mwana',

      // Navigation
      report_harm: 'Kubira Ebikolwa ebibi',
      check_status: 'Kegera Embeera ya Kisu',
      learn: 'Yiga',
      curiosity_corner: 'Ebbanga lya Kubbyo',
      plans: 'Pulaani',
      home: 'Awaka',
      back: 'Emabega',

      // Report screen
      report_title: 'Kubira Ekintu',
      report_subtitle: 'Tugambe kye baakukola. Toleta linnya lyo.',
      choose_picture: 'Londako ekyabaddemu',
      describe_report: 'Wandika ekyabaddemu (tosanira)',
      paste_report: 'Obiika obubaka (tosanira)',
      safe_to_contact: 'Kki kibawo kubeera abantu b’okukubirako ku nsonga eno?',
      safe_to_contact_yes: 'Yee, kibangwo',
      safe_to_contact_no: 'Nedda, kaakati leka',
      submit_report: 'Tumula Ripooti',
      sending: 'Mutumula…',

      // Picture categories
      cat_bullying: 'Okubulunta',
      cat_bullying_desc: 'Omulala akukwasizza obulabe ku mutimbagano',
      cat_threats: 'Ebitisa',
      cat_threats_desc: 'Omulala agamba nti ajja kukukoba',
      cat_private_pics: 'Okusaba Bifaananyi by’ekyama',
      cat_private_pics_desc: 'Omulala ayagala bifaananyi ebitakwatee',
      cat_harassment: 'Okubira obubaka obutayagirwa',
      cat_harassment_desc: 'Omulala abuusabuusa nnyo',
      cat_impersonation: 'Okweyisa ng’omulala',
      cat_impersonation_desc: 'Omulala afaanana munno',
      cat_unwanted: 'Obubaka ebitagidwa',
      cat_unwanted_desc: 'Obubaka butagidwa',
      cat_other: 'Ekintu ekirala',
      cat_other_desc: 'Kirala kyonna ekikufudde ebirowoozo',

      // Success modal
      report_sent: 'Ripooti etumiddwa',
      case_ref: 'Namba ya Kisu',
      recovery_secret: 'Koodi yo eyokuddiza',
      save_warning: 'Biwandiike kaakati — tezijja kuddizibwa',
      copy_case_ref: 'Koppa Namba ya Kisu',
      copy_secret: 'Koppa Koodi eyokuddiza',
      copied: 'Kopiddwa!',
      done: 'Kimalidde',
      what_happens_next: 'Kiki kijja kubeerawo?',
      next_1: 'Omulala atendekebwa ajja kukebera ripooti yo.',
      next_2: 'Osobola okukebera embeera ng’okozesa namba ya kisu n’olunyumo lwo.',
      next_3: 'Bwe osanga wa mu katyabaga kaakati, yita 116 (Child Helpline) oba 999 (Poliisi).',

      // Case status
      status_title: 'Kegera Embeera ya Kisu',
      enter_case_ref: 'Yingiza namba ya kisu',
      enter_recovery: 'Yingiza koodi yo eyokuddiza',
      check: 'Kegera Embeera',
      status_label: 'Embeera',
      category_label: 'Ekika',
      submitted_label: 'Yatumiddwa',
      updated_label: 'Embeera esemba okukyazibwa',
      response_label: 'Obubaka ku lw’omwana',
      no_response_yet: 'Tewanabaawo. Loola ozzewo.',
      invalid_credentials: 'Namba ya kisu oba koodi teriyo.',

      // Curiosity Corner
      curiosity_title: 'Ebbanga lya Kubbyo',
      curiosity_subtitle: 'Kubuzza ekibuzo ku kuberawo ku mutimbagano',
      curiosity_placeholder: 'Wandika ekibuzo kyo…',
      ask: 'Buuza',
      curiosity_warning: 'Bwe osanga oyagala okubira ekintu ekibaddewo, nyiga Kubira Ebikolwa ebibi.',
      curiosity_response: 'Ansibyo',
      curiosity_no_answer: 'Ekibuzo kino kijja kukeberwa. Loola ozzewo.',

      // Learning
      learn_title: 'Yiga',
      learn_subtitle: 'Beerawo omulamu ku mutimbagano',
      lesson_bullying: 'Kiki ekibulunta ku mutimbagano?',
      lesson_privacy: 'Okukuuma amawulire go',
      lesson_friends: 'Bemmmwe n’abageni ku mutimbagano',
      lesson_boundaries: 'Ensalosso za dijitalo',
      lesson_help: 'N’atwala okufuna obuyambi',

      // Commercial
      plans_title: 'Pulaani ya GuardianLink',
      plans_subtitle: 'Okubira kuli bwereere buli lu',
      plan_free: 'Bwereere',
      plan_free_price: 'UGX 0',
      plan_family: 'Family Premium',
      plan_family_price: 'UGX 10,000/omwezi',
      plan_school: 'School Starter',
      plan_school_price: 'UGX 100,000/omwezi',
      plan_ngo: 'NGO / Institutional',
      plan_ngo_price: 'Custom',
      request_demo: 'Saba Demo',

      // Emergency
      emergency_help: 'Yagala obuyambi kaakati?',
      emergency_call: 'Yita 116 (Child Helpline) oba 999 (Poliisi) bwe osanga wa mu katyabaga.',

      // Language
      switch_lang: 'English',

      // Voice reporting
      voice_report: 'Kuwa obubaka ku ddoboozi',
      voice_start: 'Nyiga okwogera',
      voice_stop: 'Nyiga okumalira',
      voice_listening: 'Kuwa eddoboozi…',
      voice_not_supported: 'Okuwa eddoboozi tekiyizika. Wandika oba olonde ekifaananyi.',
    },
  };

  function getCurrentLang() {
    return localStorage.getItem('gl_lang') || 'en';
  }

  function setLang(lang) {
    localStorage.setItem('gl_lang', lang === 'en' ? 'lg' : 'en');
  }

  function t(key) {
    const lang = getCurrentLang();
    const dict = STRINGS[lang] || STRINGS.en;
    return dict[key] || STRINGS.en[key] || key;
  }

  window.GuardianI18n = { t, getCurrentLang, setLang, STRINGS };
})();
