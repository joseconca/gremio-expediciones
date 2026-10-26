import { notFound } from "next/navigation";
import Revision from "./revision";

export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <Revision />;
}
