import { createFileRoute } from "@tanstack/react-router";
import { AsemiApp } from "@/components/AsemiApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Asemi — Product Authentication" },
      {
        name: "description",
        content:
          "Prove it's real, before they buy it. Every product gets a unique code. Every customer can check it in seconds.",
      },
      { property: "og:title", content: "Asemi — Product Authentication" },
      {
        property: "og:description",
        content: "Prove it's real, before they buy it. Product authentication made simple.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <AsemiApp />;
}
