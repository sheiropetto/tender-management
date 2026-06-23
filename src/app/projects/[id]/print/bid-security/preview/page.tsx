"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getProject, getSettings, type Project, type AppSettings } from "@/lib/firestoreService";
import { Loader2 } from "lucide-react";

export default function BidSecurityPreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const labelType = searchParams.get("type") || "original";
  const isUsb = searchParams.get("usb") === "true";

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [borderPx, setBorderPx] = useState(3);

  useEffect(() => {
    const id = params.id as string;
    if (!id) return;
    Promise.all([
      getProject(id),
      getSettings(),
    ]).then(([proj, settings]) => {
      if (!proj) { router.push("/projects"); return; }
      setProject(proj);
      const m = (settings.borderThickness || "").match(/(\d+)/);
      setBorderPx(m ? parseInt(m[1], 10) : 3);
    }).catch(console.error).finally(() => setLoading(false));
  }, [params.id, router]);

  // Hide sidebar on mount, restore on unmount
  useEffect(() => {
    const aside = document.querySelector("aside");
    const origDisplay = aside?.style.display || "";
    document.querySelectorAll("aside, [class*='sidebar'], [class*='Sidebar']")
      .forEach(el => { (el as HTMLElement).style.display = "none"; });
    document.body.style.background = "white";
    return () => {
      if (aside) aside.style.display = origDisplay;
      document.body.style.background = "";
    };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-5 w-5 animate-spin text-zinc-300 stroke-[1.5]" /></div>;
  }
  if (!project) return null;

  const labelText = labelType === "copy" ? "COPY" : "ORIGINAL";
  const centerText = isUsb ? "USB PEN DRIVE" : "BID SECURITY";

  return (
    <>
      <style>{`
        @media print {
          aside, [class*="sidebar"], [class*="Sidebar"], nav { display: none !important; }
          body > div { all: unset !important; display: block !important; width: 100% !important; background: white !important; height: auto !important; }
          body { background: white !important; padding: 0 !important; margin: 0 !important; display: block !important; height: auto !important; }
          main { all: unset !important; display: block !important; width: 100% !important; height: auto !important; }
          .env-divider-page { display: flex !important; }
          .no-print { display: none !important; }
        }
        @page { size: ${isUsb ? 'A5 landscape' : 'A4 landscape'}; margin: 0; }
      `}</style>
      <div className="no-print fixed top-4 right-4 z-50 flex gap-3">
        <button
          onClick={() => window.print()}
          className="rounded-full border border-zinc-300 bg-transparent px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          Print / Save PDF
        </button>
        <button
          onClick={() => router.back()}
          className="rounded-full border border-zinc-300 bg-transparent px-5 py-2.5 text-sm font-medium text-zinc-500 hover:bg-zinc-50 transition-colors"
        >
          Back
        </button>
      </div>

      {isUsb ? (
        /* ─── USB Pen Drive — A5 Landscape ─── */
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '210mm', height: '148mm', overflow: 'hidden',
            background: 'white', boxSizing: 'border-box', margin: '0 auto'
          }}
        >
          <div
            style={{
              position: 'relative', width: '190mm', height: '125mm',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: `${borderPx}px solid #000`, boxSizing: 'border-box'
            }}
          >
            <p style={{
              position: 'absolute', top: 0, right: 0,
              background: '#000', color: '#fff', fontSize: '9pt', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '1.5px',
              padding: '3mm 8mm', margin: 0, zIndex: 2,
              WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
            }}>
              {labelText}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: '6mm 18mm', boxSizing: 'border-box' }}>
              <div style={{ flex: '0 0 auto', textAlign: 'left', width: '100%', paddingRight: '42mm', boxSizing: 'border-box' }}>
                <p style={{ fontSize: '8pt', fontWeight: 600, textTransform: 'uppercase', lineHeight: 1.5, margin: 0, color: '#000', wordBreak: 'break-word' }}>
                  {project.name}
                </p>
                {project.refNumber && (
                  <p style={{ fontSize: '6.5pt', fontWeight: 400, marginTop: '1mm', color: '#444' }}>
                    {project.refNumber}
                  </p>
                )}
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '100%', marginTop: '-4mm' }}>
                <p style={{ fontSize: '18pt', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.3, maxWidth: '170mm', margin: 0, color: '#000', letterSpacing: '1px' }}>
                  {centerText}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ─── Bid Security — A4 Landscape ─── */
        <div className="env-divider-page">
          <div className="env-divider-frame" style={{ borderWidth: borderPx }}>
            <p className="env-divider-label">{labelText}</p>
            <div className="env-divider-content">
              <div className="env-divider-top">
                <p className="env-divider-project">{project.name}</p>
                {project.refNumber && (
                  <p className="env-divider-ref">{project.refNumber}</p>
                )}
              </div>
              <div className="env-divider-middle">
                <p className="env-divider-envelope">{centerText}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
