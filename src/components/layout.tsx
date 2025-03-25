import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return <div className="size-full flex justify-center items-center">{children}</div>;
}
