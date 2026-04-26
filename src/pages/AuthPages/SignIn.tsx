import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Sign In | AbiTrack"
        description="Sign in to your AbiTrack inventory management account"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
