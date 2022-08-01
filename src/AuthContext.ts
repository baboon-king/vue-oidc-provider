import type {
  QuerySessionStatusArgs,
  RevokeTokensTypes,
  SessionStatus,
  SigninPopupArgs,
  SigninRedirectArgs,
  SigninSilentArgs,
  SignoutPopupArgs,
  SignoutRedirectArgs,
  User,
  UserManagerEvents,
  UserManagerSettings,
} from "oidc-client-ts";
import type { InjectionKey } from "vue";
import { provide } from "vue";

/**
 * @public
 */
export interface AuthContextProps {
  /**
   * UserManager functions. See [UserManager](https://github.com/authts/oidc-client-ts) for more details.
   */
  readonly settings: UserManagerSettings;
  readonly events: UserManagerEvents;
  clearStaleState(): Promise<void>;
  removeUser(): Promise<void>;
  signinPopup(args?: SigninPopupArgs): Promise<User>;
  signinSilent(args?: SigninSilentArgs): Promise<User | null>;
  signinRedirect(args?: SigninRedirectArgs): Promise<void>;
  signoutRedirect(args?: SignoutRedirectArgs): Promise<void>;
  signoutPopup(args?: SignoutPopupArgs): Promise<void>;
  querySessionStatus(
    args?: QuerySessionStatusArgs
  ): Promise<SessionStatus | null>;
  revokeTokens(types?: RevokeTokensTypes): Promise<void>;
  startSilentRenew(): void;
  stopSilentRenew(): void;
}

export const auth_context_key: InjectionKey<AuthContextProps> = Symbol();

export const useAuthContextProvider = (context: AuthContextProps) => {
  provide(auth_context_key, context);
};
