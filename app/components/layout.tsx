import { Outlet } from "react-router";

export default function Layout() {
  return <div className="size-full flex justify-center items-center"><Outlet /></div>;
}
