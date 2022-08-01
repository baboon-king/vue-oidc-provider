import { defineComponent, type PropType } from "vue";
import { useAuthContextProvider } from "./AuthContext";
import { useAuthStateProvider } from "./AuthState";
import { useOidc, type AuthProviderProps } from "./useOidc";

export const AuthProvider = defineComponent({
  name: "AuthProvider",
  props: {
    options: {
      type: Object as PropType<AuthProviderProps>,
      required: true,
    },
  },

  setup(props, { slots }) {
    const { state, context } = useOidc(props.options);

    useAuthStateProvider(state);

    useAuthContextProvider(context);

    return () => <>{slots.default?.()}</>;
  },
});
