import { Core } from "@strapi/strapi";
import { PLUGIN_ID } from "../pluginId";
import { ExtendedPolicyContext } from "../../../shared/types/ExtendedPolicyContext";


const editorEdit: Core.PolicyHandler = (policyContext: ExtendedPolicyContext, config, { strapi }) => {
  if (!policyContext.state.isAuthenticated) return false;
  return policyContext.state.userAbility.can(`plugin::${PLUGIN_ID}.editor.edit`, null);
}

export default editorEdit;