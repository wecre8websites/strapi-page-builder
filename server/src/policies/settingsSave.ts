import { Core } from "@strapi/strapi";
import { PLUGIN_ID } from "../pluginId";
import { ExtendedPolicyContext } from "../../../shared/types/ExtendedPolicyContext";

const settingsSave: Core.PolicyHandler = (policyContext: ExtendedPolicyContext, config, { strapi }) => {
  if (!policyContext.state.isAuthenticated) return false;
  const demoRole = policyContext.state.user.roles.find((role) => role.code.includes('page-builder-demo'));
  if (demoRole) return false;
  return policyContext.state.userAbility.can(`plugin::${PLUGIN_ID}.settings.modify`, null);
}

export default settingsSave;
