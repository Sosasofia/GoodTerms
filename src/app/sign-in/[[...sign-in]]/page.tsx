import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-100">
      <div className="shadow-2xl rounded-2xl">
        <SignIn />
      </div>
    </div>
  );
}
