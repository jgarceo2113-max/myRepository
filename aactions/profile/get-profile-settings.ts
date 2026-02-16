import { DefaultSettingsValue } from "@/features/settings/lib/stores/use-settings-store";
import { Settings } from "@/features/settings/lib/types";
import { createSessionClient } from "@/lib/server/appwrite";
import { getLoggedInUser } from "../auth";
import { SettingsResponse } from "../shared/types";

export async function getUserSettings(): Promise<SettingsResponse> {
  try {
    const { account } = await createSessionClient();
    const currentUser = await getLoggedInUser();

    if (!currentUser) {
      throw new Error("No session");
    }

    // biome-ignore lint/suspicious/noExplicitAny: user.prefs can contain mixed types from external API
    const userPrefs = currentUser.prefs as Record<string, any>;
    const sessionRes = await account.listSessions();
    const { sessions } = sessionRes;

    const defaultSettings = DefaultSettingsValue;
    const { preferences } = defaultSettings;

    const settings: Settings = {
      preferences: {
        theme: userPrefs.theme ?? preferences.theme,
        fontFamily: userPrefs.fontFamily ?? preferences.fontFamily,
        autoSave: userPrefs.autoSave ?? preferences.autoSave,
        checkerboardBackground:
          userPrefs.checkerboardBackground ??
          preferences.checkerboardBackground,
        autoClipToArtboard:
          userPrefs.autoClipToArtboard ?? preferences.autoClipToArtboard,
        enableDragToMove:
          userPrefs.enableDragToMove ?? preferences.enableDragToMove,
      },
      security: {
        sessions: [
          ...sessions.filter((s) => s.current),
          ...sessions.filter((s) => !s.current),
        ],
      },
    };

    return { ok: true, data: settings };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to fetch current user's settings";
    return { ok: false, error: message };
  }
}
