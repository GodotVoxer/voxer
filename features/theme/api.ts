import { api } from "@/features/http/apiClient";
import type {
  CustomThemeDto,
  CustomThemeInput,
  ThemeAssetDto,
  ThemeAssetQuota,
} from "@/lib/theme/customTheme";
import type { AccountThemePreference } from "@/lib/theme/themeAccountSync";
import type { ThemeSelection } from "@/lib/theme/themePreference";

export const updateThemePreferenceRequest = async (
  selection: ThemeSelection,
): Promise<AccountThemePreference> => {
  const res = await api.put<{ theme: AccountThemePreference }>("/theme/preference", selection);
  return res.data.theme;
};

export const listCustomThemesRequest = async (): Promise<CustomThemeDto[]> => {
  const res = await api.get<{ themes: CustomThemeDto[] }>("/theme/themes");
  return res.data.themes;
};

export const createCustomThemeRequest = async (
  input: CustomThemeInput,
): Promise<CustomThemeDto> => {
  const res = await api.post<{ theme: CustomThemeDto }>("/theme/themes", input);
  return res.data.theme;
};

export const updateCustomThemeRequest = async (
  themeId: string,
  input: CustomThemeInput & { version: number },
): Promise<CustomThemeDto> => {
  const res = await api.patch<{ theme: CustomThemeDto }>(
    `/theme/themes/${encodeURIComponent(themeId)}`,
    input,
  );
  return res.data.theme;
};

export const deleteCustomThemeRequest = async (themeId: string): Promise<void> => {
  await api.delete(`/theme/themes/${encodeURIComponent(themeId)}`);
};

export type ThemeAssetsResponse = { assets: ThemeAssetDto[]; quota: ThemeAssetQuota };

export const listThemeAssetsRequest = async (): Promise<ThemeAssetsResponse> => {
  const res = await api.get<ThemeAssetsResponse>("/theme/background-images");
  return res.data;
};

export const uploadThemeAssetRequest = async (file: File): Promise<ThemeAssetDto> => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post<{ asset: ThemeAssetDto }>("/theme/background-images", form);
  return res.data.asset;
};

export const deleteThemeAssetRequest = async (assetId: string): Promise<void> => {
  await api.delete(`/theme/background-images/${encodeURIComponent(assetId)}`);
};

export const createThemeAssetShareRequest = async (assetId: string): Promise<string> => {
  const res = await api.post<{ shareId: string }>(
    `/theme/background-images/${encodeURIComponent(assetId)}/share`,
  );
  return res.data.shareId;
};

export const importSharedThemeAssetRequest = async (shareId: string): Promise<ThemeAssetDto> => {
  const res = await api.post<{ asset: ThemeAssetDto }>("/theme/background-images/import-shared", {
    shareId,
  });
  return res.data.asset;
};
