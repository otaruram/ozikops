import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/page/$id")({
  component: PageComponent,
});

const PAGES_DATA: Record<string, { title: string; content: React.ReactNode }> = {
  "pln-sustainaction": {
    title: "PLN SustainAction 2026",
    content: (
      <>
        <p>Halaman ini berisikan informasi mengenai integrasi dan komitmen OzikOps dalam mendukung program PLN SustainAction 2026.</p>
        <p>OzikOps bertindak sebagai agregator pintar untuk mempercepat transisi energi hijau di tingkat UMKM dan enterprise menengah.</p>
      </>
    ),
  },
  "kontak": {
    title: "Hubungi Tim OzikOps",
    content: (
      <>
        <p>Email: <strong>hello@ozikcarbon.id</strong></p>
        <p>Telepon: <strong>+62 811 0000 0000</strong></p>
        <p>Alamat: Gedung Inovasi Hijau, Lt. 12, Jakarta Selatan, Indonesia.</p>
      </>
    ),
  },
  "privasi": {
    title: "Kebijakan Privasi Data",
    content: (
      <>
        <p>Kami sangat menjaga kerahasiaan Work Order dan dokumen proposal Anda. OzikOps mengadopsi prinsip <em>Zero Data Retention Guarantee</em> di mana seluruh dokumen yang diunggah akan otomatis dihapus dari server (RAM) kami segera setelah laporan audit selesai dibuat.</p>
        <p>Sistem AI kami beroperasi sesuai standar kepatuhan UU Pelindungan Data Pribadi (UU PDP No. 27 Tahun 2022).</p>
      </>
    ),
  },
  "disclaimer": {
    title: "Disclaimer Hak Cipta",
    content: (
      <>
        <p>Hak cipta seluruh desain, algoritma dual-track, dan aset visual OzikOps dilindungi oleh hukum. Dilarang melakukan <em>reverse engineering</em> atau menyalin materi tanpa izin tertulis dari OzikOps Inc.</p>
      </>
    ),
  },
};

function PageComponent() {
  const { id } = Route.useParams();
  const page = PAGES_DATA[id] || {
    title: "Halaman Tidak Ditemukan",
    content: <p>Halaman yang Anda cari tidak tersedia atau sedang dalam perbaikan.</p>,
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 selection:bg-slate-800 selection:text-white flex flex-col">
      <header className="border-b border-border/40 bg-white px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="bg-slate-800 text-white p-2 rounded group-hover:bg-blue-800 transition-colors">
            <img src="/logo.png" alt="OzikOps" className="h-5 w-5 object-contain mix-blend-multiply" />
          </div>
          <span className="text-xl font-black tracking-widest uppercase text-slate-800 hidden sm:block">OzikOps</span>
        </Link>
        <Link to="/">
          <Button variant="ghost" size="icon" className="text-slate-800 hover:bg-blue-50 rounded-none transition-all">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
      </header>
      
      <main className="flex-1 p-6 md:p-12 flex justify-center">
        <article className="w-full max-w-3xl">
          <div className="border-4 border-slate-800 bg-white p-8 md:p-12 shadow-[12px_12px_0_rgba(6,78,59,1)]">
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-slate-800 mb-8 border-b-4 border-slate-800/10 pb-6">
              {page.title}
            </h1>
            <div className="prose prose-sky max-w-none text-slate-800/80 font-medium text-lg leading-relaxed space-y-6">
              {page.content}
            </div>
            
            <div className="mt-16 pt-8 border-t-4 border-slate-800/10">
              <Link to="/">
                <Button className="bg-slate-800 text-white hover:bg-blue-900 border-4 border-transparent rounded-none font-black uppercase tracking-widest px-8 py-6 shadow-[4px_4px_0_rgba(0,0,0,0.3)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all">
                  Kembali ke Beranda
                </Button>
              </Link>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
