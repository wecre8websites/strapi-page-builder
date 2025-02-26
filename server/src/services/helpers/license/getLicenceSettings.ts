import LicenceSettingsResponse from "../../../../../shared/types/LicenceSettingsResponse";
import LICENCE_SERVER from "./licenceServer";

const getLicenceSettings = async (apiKey: string): Promise<LicenceSettingsResponse> => {
  if (!apiKey) return { web_url: "", error: "No API Key provided" };
  const defaultResponse: LicenceSettingsResponse = {
    web_url: null,
    error: null
  }
  try {
    const licenceResponse = await fetch(`${LICENCE_SERVER}/cms`, {
      method: 'GET',
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : undefined
    })
    if (licenceResponse.status < 200 || licenceResponse.status >= 300) {
      console.error(`[Strapi Page Builder] Licence Server Error ${licenceResponse.statusText || "Unauthorized"}`);
      return {
        ...defaultResponse,
        error: licenceResponse.statusText || "Unauthorized"
      }
    }
    const licenceData = await licenceResponse.json() as LicenceSettingsResponse;
    return {
      ...defaultResponse,
      ...licenceData,
    };
  } catch (error) {
    console.error(`[Strapi Page Builder] Licence Server Error ${(error as Error).message}`);
    return {
      ...defaultResponse,
      error: "Unable to communicate with licence server"
    }
  }
}

export default getLicenceSettings;