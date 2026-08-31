import crypto from "crypto";

export const JITSI_DOMAIN = process.env.NEXT_PUBLIC_JITSI_DOMAIN || process.env.JITSI_DOMAIN || "meet.jit.si";

/**
 * Generate a cryptographically secure, unpredictable room name.
 * e.g. "hc-room-9f8e7d6c5b4a3210-2026"
 */
export function generateMeetingId(prefix = "hc") {
  const randomBytes = crypto.randomBytes(12).toString("hex");
  const timestamp = Date.now().toString(36);
  return `${prefix}-${randomBytes}-${timestamp}`;
}

/**
 * Custom Jitsi meeting configurations based on participant role.
 */
export function getJitsiConfig({ isStudent = false, displayName = "Participant", subject = "HostelConnect Supervised Call" }) {
  const studentToolbars = [
    "microphone",
    "camera",
    "hangup",
    "fullscreen",
    "tileview",
    "videoquality",
  ];

  const parentToolbars = [
    "microphone",
    "camera",
    "hangup",
    "fullscreen",
    "tileview",
    "videoquality",
    "settings",
  ];

  return {
    domain: JITSI_DOMAIN,
    configOverwrite: {
      startWithAudioMuted: false,
      startWithVideoMuted: false,
      enableWelcomePage: false,
      prejoinPageEnabled: false,
      disableDeepLinking: true,
      disableProfile: true,
      enableClosePage: false,
      hideConferenceSubject: false,
      subject: subject,
      toolbarButtons: isStudent ? studentToolbars : parentToolbars,
      notifications: [
        "connection.CONNFAIL",
        "dialog.cameraNotAllowedTitle",
        "dialog.micNotAllowedTitle",
      ],
      disableInviteFunctions: true,
      doNotStoreRoom: true,
    },
    interfaceConfigOverwrite: {
      SHOW_JITSI_WATERMARK: false,
      SHOW_WATERMARK_FOR_GUESTS: false,
      SHOW_BRAND_WATERMARK: false,
      BRAND_WATERMARK_LINK: "",
      SHOW_POWERED_BY: false,
      GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
      DISPLAY_WELCOME_PAGE_CONTENT: false,
      APP_NAME: "HostelConnect",
      NATIVE_APP_NAME: "HostelConnect",
      PROVIDER_NAME: "HostelConnect",
      TOOLBAR_BUTTONS: isStudent ? studentToolbars : parentToolbars,
    },
    userInfo: {
      displayName: displayName,
    },
  };
}
