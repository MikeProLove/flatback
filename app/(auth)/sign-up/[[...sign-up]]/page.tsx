import { SignUp } from "@clerk/nextjs";
export default function Page() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <SignUp />
    </main>
  );
}