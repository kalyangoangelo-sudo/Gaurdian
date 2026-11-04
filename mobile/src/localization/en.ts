/**
 * en.ts — English strings
 */

export const en = {
  // SafeSignal screen
  safe_signal_title: 'Safe Signal',
  safe_signal_subtitle: 'Report something that made you feel unsafe',
  report_anonymous: 'Report Anonymously',
  case_ref_label: 'Your Case Reference',
  recovery_secret_label: 'Recovery Code',
  save_these_warning: 'Save these — they will not be shown again',

  // Categories (SafeSignal / extended)
  category_cyberbullying: 'Cyberbullying',
  category_grooming: 'Grooming',
  category_threats: 'Threats',
  category_sextortion: 'Sextortion',
  category_harassment: 'Online Harassment',
  category_impersonation: 'Impersonation',
  category_privacy: 'Privacy Violation',
  category_exploitation: 'Exploitation',
  category_harmful_content: 'Harmful Content',
  category_other: 'Other',

  // Case status screen
  check_case_status: 'Check Case Status',
  enter_case_ref: 'Enter your case reference',
  enter_recovery_code: 'Enter your recovery code',

  // Simulation / demo
  simulated_label: '⚠️ SIMULATED — demonstration only',

  // Language toggle
  language_toggle: 'EN / LG',

  // LoginScreen
  brand_name: 'GuardianLink Lite',
  tagline: 'Safe browsing, together.',
  sign_in: 'Sign In',
  label_email: 'Email',
  label_password: 'Password',
  placeholder_email: 'your@email.com',
  placeholder_password: 'Enter your password',
  show_password: 'Show password',
  hide_password: 'Hide password',
  demo_accounts: 'Demo accounts',
  demo_parent: 'Parent: kalyangoangelo@gmail.com / Parent123!',
  demo_child: 'Child:  kalyango.200@gmail.com / Child123!',

  // ChildDashboard
  request_website_access: 'Request Website Access',
  request_access_hint: 'Ask your parent for permission to visit a website.',
  placeholder_url: 'https://example.com',
  btn_request_access: 'Request Access',
  your_requests: 'Your Requests',
  no_requests_yet: 'No requests yet',
  no_requests_text: 'Enter a website URL above and tap "Request Access".',
  request_sent_success: 'Request sent! Your parent will be notified.',
  no_parent_linked: '⚠ No parent account linked to your account yet.',

  // ChildSafeSignalScreen
  safe_signal_screen_title: 'SafeSignal — Report a Concern',
  what_is_happening: 'What is happening?',
  describe_what_happened: 'Describe what happened *',
  paste_message_content: 'Paste the message or content (optional)',
  placeholder_describe: 'Describe the situation in your own words…',
  placeholder_paste: 'Paste the suspicious message, link, or text here…',
  btn_submit_report: 'Submit Report',
  report_submitted: 'Report Submitted',
  report_submitted_text: 'Your safety concern has been sent to your guardian for review. You are not alone — help is on the way.',
  report_private_disclaimer: '🔒 Your report is private and only shared with your guardian.',
  safesignal_done: 'Done',

  // SafeSignal categories (original keys used in old screen)
  cat_suspicious_message: 'Suspicious Message',
  cat_cyberbullying: 'Cyberbullying',
  cat_threats: 'Threats',
  cat_inappropriate_request: 'Inappropriate Request',
  cat_suspicious_link: 'Suspicious Link',
  cat_other: 'Other',

  // ChildRequestAccessScreen
  request_access_title: 'Request Website Access',
  request_access_short_title: 'Request Access',
  request_access_intro: 'Ask your guardian for permission to visit a specific website. They will be notified and can approve or reject your request.',
  field_website_url: 'Website URL *',
  field_reason: 'Reason *',
  placeholder_why_visit: 'Why do you need to visit this website?',
  btn_submit_request: 'Submit Request',
  request_sent_title: 'Request Sent!',
  request_sent_text: 'Your parent has been notified and will review your request shortly.',
  btn_done: 'Done',
  failed_submit_request: 'Failed to submit request.',

  // ChildRemovalRequestScreen
  removal_request_title: 'Request GuardianLink Removal',
  removal_request_short_title: 'Removal Request',
  about_removal_title: '📋 About Removal Requests',
  about_removal_text1: 'GuardianLink is installed on this device to help keep you safe online. If you believe the protection is no longer needed, you can request its removal.',
  about_removal_text2: 'Your guardian will review your request and decide whether to approve it. GuardianLink will not be removed automatically — a guardian must authorize removal.',
  about_removal_text3: 'This request is transparent and will be shown to your guardian.',
  field_reason_removal: 'Reason for removal *',
  field_reason_removal_hint: 'Explain why you feel GuardianLink protection is no longer needed.',
  placeholder_removal_reason: 'e.g. I am now 16 and my parent and I have agreed I no longer need monitoring.',
  btn_submit_removal: 'Submit Removal Request',
  removal_disclaimer: 'This request will be logged and reviewed by your guardian.',
  removal_submitted_title: 'Request Submitted',
  removal_submitted_text: 'Your removal request has been sent to your guardian for review. They will contact you about the next steps.',
  failed_submit_removal: 'Failed to submit request.',

  // ChildProtectionStatusScreen
  protection_status_title: 'Protection Status',
  loading_protection_status: 'Loading your protection status…',
  shield_title: 'GuardianLink Protection',
  shield_subtitle: 'Your device is being protected by your guardian.',
  device_connection: 'Device Connection',
  status_active: 'Active',
  status_unknown: 'Unknown',
  status_not_reported: 'Status not yet reported. Check back later.',
  device_connected: 'Your device is connected and protection is active.',
  active_content_filters: 'Active Content Filters',
  status_blocked: 'Blocked',
  status_allowed: 'Allowed',
  no_content_categories: 'No content categories configured.',
  blocked_keywords: 'Blocked Keywords',
  trusted_websites: 'Trusted Websites',
  no_policy_data: 'No policy data available. Your guardian may not have configured restrictions yet.',
  protection_disclaimer: 'Protection policies are set by your guardian and reviewed regularly. If you have questions, talk to your guardian.',

  // SplashScreen
  restoring_session: 'Restoring session…',

  // General
  btn_back: 'Back',
  label_loading: 'Loading…',

  // PublicReportScreen / CaseStatusScreen
  invalid_case_ref_or_secret: 'Invalid case reference or recovery code',
};
