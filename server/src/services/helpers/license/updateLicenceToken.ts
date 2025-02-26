import LicenceTokenResponse from "../../../../../shared/types/LicenseTokenResponse";
import LICENCE_SERVER from "./licenceServer";

const updateLicenceToken = async (apiKey: string): Promise<LicenceTokenResponse> => {
  const defaultResponse: LicenceTokenResponse = {
    token: null,
    web_url: null,
    error: null
  }
  if (!apiKey) return { ...defaultResponse, error: "No API Key provided" };
  try {
    const licenceResponse = await fetch(`${LICENCE_SERVER}/editor`, {
      method: 'POST',
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : undefined
    })
    if (licenceResponse.status < 200 || licenceResponse.status >= 300) {
      console.error(`[Strapi Page Builder] Licence Server Error ${licenceResponse.statusText || "Unauthorized"}`);
      return {
        ...defaultResponse,
        error: licenceResponse.statusText || "Unauthorized"
      }
    }
    const licenceData = await licenceResponse.json() as LicenceTokenResponse;
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

export default updateLicenceToken;