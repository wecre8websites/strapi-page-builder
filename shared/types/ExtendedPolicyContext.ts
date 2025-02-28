import { Ability } from '@casl/ability';
import { Core } from "@strapi/strapi";
import { Context, } from 'koa';


type State = {
  isAuthenticated: true;
  user: any;
  userAbility: Ability;
} | {
  isAuthenticated: false;
}

export type ExtendedPolicyContext = Core.PolicyContext & { state: Context["state"] & State };

