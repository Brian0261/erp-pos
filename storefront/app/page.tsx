import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { StorefrontFooter } from "@/components/layout/storefront-footer";
import { StorefrontHeader } from "@/components/layout/storefront-header";

export default function Home() {
  return (
    <>
      <StorefrontHeader />
      <main className="flex flex-1 flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-semibold text-zinc-900">
          InkToy
        </h1>
        <p className="mt-4 text-lg text-zinc-600">
          Storefront en construccion
        </p>
      </main>
      <StorefrontFooter />
      <BottomNavigation activeItem="inicio" />
    </>
  );
}
