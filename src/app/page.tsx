import UnderworldText from "@/components/underworld-text";
import Manifesto from "@/components/manifesto";
import DropTicker from "@/components/drop-ticker";
import CollectionBoard from "@/components/collection-board";

export default function Home() {
  return (
    <main className="relative z-10">
      <section className="h-svh w-full">
        <UnderworldText />
      </section>
      <Manifesto />
      <DropTicker />
      <CollectionBoard />
    </main>
  );
}
