import UnderworldText from "@/components/underworld-text";
import Manifesto from "@/components/manifesto";
import DropTicker from "@/components/drop-ticker";
import CollectionBoard from "@/components/collection-board";

export default function Home() {
  return (
    <main className="relative z-10">
      <section className="flex h-screen items-center justify-center">
        <div className="h-[40vh] w-full max-w-5xl">
          <UnderworldText />
        </div>
      </section>
      <Manifesto />
      <DropTicker />
      <CollectionBoard />
    </main>
  );
}
