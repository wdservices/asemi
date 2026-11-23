import { createFileRoute } from "@tanstack/react-router";
import { AsemiApp } from "@/components/AsemiApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Asemi — Product Authentication" },
      {
        name: "description",
        content:
          "Prove a product is genuine before it is opened. Asemi gives every unit a unique cryptographic code customers can verify instantly.",
      },
      { property: "og:title", content: "Asemi — Product Authentication" },
      {
        property: "og:description",
        content: "Cryptographic product verification for manufacturers and their customers.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <AsemiApp />;
}
