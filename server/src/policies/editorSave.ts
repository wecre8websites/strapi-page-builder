import { Core } from "@strapi/strapi";
import { PLUGIN_ID } from "../pluginId";
import { ExtendedPolicyContext } from "../../../shared/types/ExtendedPolicyContext";


const editorSave: Core.PolicyHandler = (policyContext: ExtendedPolicyContext, config, { strapi }) => {
  if (!policyContext.state.isAuthenticated) return false;
  return policyContext.state.userAbility.can(`plugin::${PLUGIN_ID}.editor.edit`, null) || policyContext.state.userAbility.can(`plugin::${PLUGIN_ID}.editor.modify`, null);
}

export default editorSave;